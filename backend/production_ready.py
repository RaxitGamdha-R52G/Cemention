from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List

from .models import *
from database import *
from auth import get_current_user, require_admin, require_approved, create_access_token
from otp_service import otp_service
from routes_orders import orders_router
from routes_admin import admin_router

# ================= BASIC SETUP =================

BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="Cemention API", version="1.0.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cemention")

# ================= AUTH =================

@api_router.post("/auth/send-otp", response_model=OTPResponse)
async def send_otp(request: OTPRequest):
    return OTPResponse(**await otp_service.send_otp(request.phone))


@api_router.post("/auth/verify-otp", response_model=OTPResponse)
async def verify_otp(request: OTPVerify):
    return OTPResponse(**await otp_service.verify_otp(request.phone, request.otp))


@api_router.post("/auth/register", response_model=LoginResponse)
async def register_user(user_data: UserCreate):

    existing = await users_collection.find_one({"phone": user_data.phone}, {"_id": 0})
    if existing:
        return LoginResponse(success=False, message="User already registered")

    if user_data.role in [UserRole.DEALER, UserRole.RETAILER]:
        if not all([
            user_data.gst_number,
            user_data.gst_registered_name,
            user_data.business_name,
            user_data.brand_shop_name
        ]):
            raise HTTPException(status_code=400, detail="GST & business details required")

    user = User(**user_data.model_dump())
    user.status = UserStatus.PENDING if user.role in [UserRole.DEALER, UserRole.RETAILER] else UserStatus.APPROVED

    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    user_dict["updated_at"] = user_dict["updated_at"].isoformat()

    await users_collection.insert_one(user_dict)

    token = create_access_token({"user_id": user.id})
    return LoginResponse(success=True, message="Registration successful", user=user, token=token)


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: OTPRequest):
    user_doc = await users_collection.find_one({"phone": request.phone}, {"_id": 0})
    if not user_doc:
        return LoginResponse(success=False, message="User not found")

    user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    user_doc["updated_at"] = datetime.fromisoformat(user_doc["updated_at"])

    user = User(**user_doc)
    token = create_access_token({"user_id": user.id})
    return LoginResponse(success=True, message="Login successful", user=user, token=token)


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ================= PRODUCTS =================

@api_router.get("/products", response_model=List[ProductWithPrice])
async def get_products(current_user: User = Depends(require_approved)):
    products = await products_collection.find({"is_active": True}, {"_id": 0}).to_list(1000)
    result = []

    for p in products:
        p["created_at"] = datetime.fromisoformat(p["created_at"])
        p["updated_at"] = datetime.fromisoformat(p["updated_at"])
        product = Product(**p)

        price = (
            product.base_price_dealer if current_user.role == UserRole.DEALER else
            product.base_price_retailer if current_user.role == UserRole.RETAILER else
            product.base_price_customer
        )

        result.append(ProductWithPrice(**product.model_dump(), user_price=price))

    return result

# ================= CART =================

@api_router.post("/cart/add")
async def add_to_cart(item: CartItemAdd, current_user: User = Depends(require_approved)):
    if item.quantity < 100:
        raise HTTPException(status_code=400, detail="Minimum order quantity is 100 bags")

    product = await products_collection.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product_obj = Product(**{
        **product,
        "created_at": datetime.fromisoformat(product["created_at"]),
        "updated_at": datetime.fromisoformat(product["updated_at"])
    })

    price = (
        product_obj.base_price_dealer if current_user.role == UserRole.DEALER else
        product_obj.base_price_retailer if current_user.role == UserRole.RETAILER else
        product_obj.base_price_customer
    )

    await carts_collection.update_one(
        {"user_id": current_user.id},
        {"$set": {
            "user_id": current_user.id,
            "items": [{"product_id": item.product_id, "quantity": item.quantity, "price_per_bag": price}],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    return {"success": True, "message": "Item added to cart"}

# ================= ROUTERS & MIDDLEWARE =================

app.include_router(api_router)
app.include_router(orders_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= FRONTEND SERVING =================

FRONTEND_BUILD = PROJECT_ROOT / "frontend" / "build"

if FRONTEND_BUILD.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_BUILD, html=True),
        name="frontend",
    )

# 🔑 SPA fallback for React routing
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index_file = FRONTEND_BUILD / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"detail": "Frontend not built"}

# ================= SHUTDOWN =================

@app.on_event("shutdown")
async def shutdown_db():
    try:
        client.close()
    except Exception:
        pass
