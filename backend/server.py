from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

from models import *
from database import *
from auth import get_current_user, require_admin, require_approved, create_access_token
from otp_service import otp_service
from routes_orders import orders_router
from routes_admin import admin_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(title="Cemention API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ AUTH ROUTES ============

@api_router.post("/auth/send-otp", response_model=OTPResponse)
async def send_otp(request: OTPRequest):
    """Send OTP to phone number"""
    result = await otp_service.send_otp(request.phone)
    return OTPResponse(**result)

@api_router.post("/auth/verify-otp", response_model=OTPResponse)
async def verify_otp(request: OTPVerify):
    """Verify OTP"""
    result = await otp_service.verify_otp(request.phone, request.otp)
    return OTPResponse(**result)

@api_router.post("/auth/register", response_model=LoginResponse)
async def register_user(user_data: UserCreate):
    """Register new user with role selection"""
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"phone": user_data.phone}, {"_id": 0})
    if existing_user:
        return LoginResponse(
            success=False,
            message="User already registered. Please login."
        )
    
    # Validate role-specific fields
    if user_data.role in [UserRole.DEALER, UserRole.RETAILER]:
        if not user_data.gst_number or not user_data.gst_registered_name:
            raise HTTPException(status_code=400, detail="GST details are mandatory for Dealers and Retailers")
        if not user_data.business_name or not user_data.brand_shop_name:
            raise HTTPException(status_code=400, detail="Business details are mandatory for Dealers and Retailers")
    
    # Create user
    user = User(**user_data.model_dump())
    
    # Set approval status
    if user.role in [UserRole.DEALER, UserRole.RETAILER]:
        user.status = UserStatus.PENDING
    else:
        user.status = UserStatus.APPROVED  # Customers auto-approved
    
    # Store in database
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    user_dict['updated_at'] = user_dict['updated_at'].isoformat()
    
    await users_collection.insert_one(user_dict)
    
    # Create token
    token = create_access_token({"user_id": user.id})
    
    return LoginResponse(
        success=True,
        message="Registration successful",
        user=user,
        token=token
    )

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: OTPRequest):
    """Login existing user"""
    user_doc = await users_collection.find_one({"phone": request.phone}, {"_id": 0})
    
    if not user_doc:
        return LoginResponse(
            success=False,
            message="User not found. Please register first."
        )
    
    # Convert ISO strings back to datetime
    user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    user_doc['updated_at'] = datetime.fromisoformat(user_doc['updated_at'])
    
    user = User(**user_doc)
    token = create_access_token({"user_id": user.id})
    
    return LoginResponse(
        success=True,
        message="Login successful",
        user=user,
        token=token
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

# ============ PRODUCT ROUTES ============

@api_router.get("/products", response_model=List[ProductWithPrice])
async def get_products(current_user: User = Depends(require_approved)):
    """Get all active products with role-based pricing"""
    products = await products_collection.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    # Convert ISO strings to datetime
    for product in products:
        product['created_at'] = datetime.fromisoformat(product['created_at'])
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    # Add user-specific pricing
    products_with_price = []
    for product in products:
        product_obj = Product(**product)
        
        # Determine price based on role
        if current_user.role == UserRole.DEALER:
            user_price = product_obj.base_price_dealer
        elif current_user.role == UserRole.RETAILER:
            user_price = product_obj.base_price_retailer
        else:
            user_price = product_obj.base_price_customer
        
        product_with_price = ProductWithPrice(**product_obj.model_dump(), user_price=user_price)
        products_with_price.append(product_with_price)
    
    return products_with_price

@api_router.get("/products/{product_id}", response_model=ProductWithPrice)
async def get_product(product_id: str, current_user: User = Depends(require_approved)):
    """Get single product by ID"""
    product = await products_collection.find_one({"id": product_id, "is_active": True}, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product['created_at'] = datetime.fromisoformat(product['created_at'])
    product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    product_obj = Product(**product)
    
    # Determine price based on role
    if current_user.role == UserRole.DEALER:
        user_price = product_obj.base_price_dealer
    elif current_user.role == UserRole.RETAILER:
        user_price = product_obj.base_price_retailer
    else:
        user_price = product_obj.base_price_customer
    
    return ProductWithPrice(**product_obj.model_dump(), user_price=user_price)

# ============ CART ROUTES ============

@api_router.get("/cart")
async def get_cart(current_user: User = Depends(require_approved)):
    """Get user's cart"""
    cart = await carts_collection.find_one({"user_id": current_user.id}, {"_id": 0})
    
    if not cart:
        return {"items": [], "total": 0}
    
    # Calculate total
    total = sum(item["quantity"] * item["price_per_bag"] for item in cart.get("items", []))
    
    return {
        "items": cart.get("items", []),
        "total": total
    }

@api_router.post("/cart/add")
async def add_to_cart(item: CartItemAdd, current_user: User = Depends(require_approved)):
    """Add item to cart"""
    
    # Validate quantity
    if item.quantity < 100:
        raise HTTPException(status_code=400, detail="Minimum order quantity is 100 bags")
    
    # Get product
    product = await products_collection.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product['created_at'] = datetime.fromisoformat(product['created_at'])
    product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    product_obj = Product(**product)
    
    # Get user-specific price
    if current_user.role == UserRole.DEALER:
        price_per_bag = product_obj.base_price_dealer
    elif current_user.role == UserRole.RETAILER:
        price_per_bag = product_obj.base_price_retailer
    else:
        price_per_bag = product_obj.base_price_customer
    
    # Get existing cart
    cart = await carts_collection.find_one({"user_id": current_user.id})
    
    if cart:
        # Check if item already in cart
        items = cart.get("items", [])
        found = False
        for i, cart_item in enumerate(items):
            if cart_item["product_id"] == item.product_id:
                items[i]["quantity"] = item.quantity
                items[i]["price_per_bag"] = price_per_bag
                found = True
                break
        
        if not found:
            items.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price_per_bag": price_per_bag
            })
        
        await carts_collection.update_one(
            {"user_id": current_user.id},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        # Create new cart
        cart_obj = Cart(
            user_id=current_user.id,
            items=[CartItem(
                product_id=item.product_id,
                quantity=item.quantity,
                price_per_bag=price_per_bag
            )]
        )
        cart_dict = cart_obj.model_dump()
        cart_dict['updated_at'] = cart_dict['updated_at'].isoformat()
        await carts_collection.insert_one(cart_dict)
    
    return {"success": True, "message": "Item added to cart"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: User = Depends(require_approved)):
    """Remove item from cart"""
    cart = await carts_collection.find_one({"user_id": current_user.id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = cart.get("items", [])
    items = [item for item in items if item["product_id"] != product_id]
    
    await carts_collection.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(current_user: User = Depends(require_approved)):
    """Clear cart"""
    await carts_collection.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Cart cleared"}

# ============ ADDRESS ROUTES ============

@api_router.get("/addresses", response_model=List[Address])
async def get_addresses(current_user: User = Depends(get_current_user)):
    """Get user's addresses"""
    addresses = await addresses_collection.find({"user_id": current_user.id}, {"_id": 0}).to_list(100)
    
    for address in addresses:
        address['created_at'] = datetime.fromisoformat(address['created_at'])
    
    return [Address(**addr) for addr in addresses]

@api_router.post("/addresses", response_model=Address)
async def create_address(address_data: AddressCreate, current_user: User = Depends(get_current_user)):
    """Create new address"""
    
    # If setting as default, unset other defaults
    if address_data.is_default:
        await addresses_collection.update_many(
            {"user_id": current_user.id},
            {"$set": {"is_default": False}}
        )
    
    address = Address(
        **address_data.model_dump(),
        user_id=current_user.id
    )
    
    address_dict = address.model_dump()
    address_dict['created_at'] = address_dict['created_at'].isoformat()
    
    await addresses_collection.insert_one(address_dict)
    
    return address

@api_router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user: User = Depends(get_current_user)):
    """Delete address"""
    result = await addresses_collection.delete_one({"id": address_id, "user_id": current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return {"success": True, "message": "Address deleted"}

# Include routers
app.include_router(api_router)
app.include_router(orders_router)
app.include_router(admin_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
