from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone

from models import *
from database import *
from auth import require_admin

admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

# ============ USER MANAGEMENT ============

@admin_router.get("/users/pending", response_model=List[User])
async def get_pending_users(current_admin: User = Depends(require_admin)):
    """Get all pending user approvals"""
    users = await users_collection.find(
        {"status": UserStatus.PENDING.value},
        {"_id": 0}
    ).to_list(1000)
    
    for user in users:
        user['created_at'] = datetime.fromisoformat(user['created_at'])
        user['updated_at'] = datetime.fromisoformat(user['updated_at'])
    
    return [User(**user) for user in users]

@admin_router.get("/users", response_model=List[User])
async def get_all_users(role: Optional[str] = None, current_admin: User = Depends(require_admin)):
    """Get all users"""
    query = {}
    if role:
        query["role"] = role
    
    users = await users_collection.find(query, {"_id": 0}).to_list(1000)
    
    for user in users:
        user['created_at'] = datetime.fromisoformat(user['created_at'])
        user['updated_at'] = datetime.fromisoformat(user['updated_at'])
    
    return [User(**user) for user in users]

@admin_router.patch("/users/{user_id}/approve")
async def approve_user(user_id: str, current_admin: User = Depends(require_admin)):
    """Approve user registration"""
    result = await users_collection.update_one(
        {"id": user_id},
        {"$set": {
            "status": UserStatus.APPROVED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User approved"}

@admin_router.patch("/users/{user_id}/reject")
async def reject_user(user_id: str, current_admin: User = Depends(require_admin)):
    """Reject user registration"""
    result = await users_collection.update_one(
        {"id": user_id},
        {"$set": {
            "status": UserStatus.REJECTED.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User rejected"}

# ============ PRODUCT MANAGEMENT ============

@admin_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_admin: User = Depends(require_admin)):
    """Create new product"""
    product = Product(**product_data.model_dump())
    
    product_dict = product.model_dump()
    product_dict['created_at'] = product_dict['created_at'].isoformat()
    product_dict['updated_at'] = product_dict['updated_at'].isoformat()
    
    await products_collection.insert_one(product_dict)
    
    return product

@admin_router.get("/products", response_model=List[Product])
async def get_all_products(current_admin: User = Depends(require_admin)):
    """Get all products (including inactive)"""
    products = await products_collection.find({}, {"_id": 0}).to_list(1000)
    
    for product in products:
        product['created_at'] = datetime.fromisoformat(product['created_at'])
        product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return [Product(**product) for product in products]

@admin_router.patch("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, current_admin: User = Depends(require_admin)):
    """Update product"""
    update_data = {k: v for k, v in product_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await products_collection.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Return updated product
    product = await products_collection.find_one({"id": product_id}, {"_id": 0})
    product['created_at'] = datetime.fromisoformat(product['created_at'])
    product['updated_at'] = datetime.fromisoformat(product['updated_at'])
    
    return Product(**product)

@admin_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_admin: User = Depends(require_admin)):
    """Soft delete product (mark as inactive)"""
    result = await products_collection.update_one(
        {"id": product_id},
        {"$set": {
            "is_active": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "message": "Product deactivated"}

# ============ ORDER MANAGEMENT ============

@admin_router.get("/orders", response_model=List[Order])
async def get_all_orders(current_admin: User = Depends(require_admin)):
    """Get all orders"""
    orders = await orders_collection.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for order in orders:
        order['created_at'] = datetime.fromisoformat(order['created_at'])
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return [Order(**order) for order in orders]

@admin_router.patch("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_data: OrderUpdate, current_admin: User = Depends(require_admin)):
    """Update order status/details"""
    update_data = {k: v.value if isinstance(v, Enum) else v for k, v in order_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await orders_collection.update_one(
        {"id": order_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Return updated order
    order = await orders_collection.find_one({"id": order_id}, {"_id": 0})
    order['created_at'] = datetime.fromisoformat(order['created_at'])
    order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return Order(**order)

# ============ REQUEST ORDER MANAGEMENT ============

@admin_router.get("/request-orders", response_model=List[RequestOrder])
async def get_all_request_orders(current_admin: User = Depends(require_admin)):
    """Get all request orders"""
    requests = await request_orders_collection.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        req['created_at'] = datetime.fromisoformat(req['created_at'])
    
    return [RequestOrder(**req) for req in requests]

@admin_router.patch("/request-orders/{request_id}", response_model=RequestOrder)
async def update_request_order(request_id: str, request_data: RequestOrderUpdate, current_admin: User = Depends(require_admin)):
    """Update request order status"""
    update_data = {k: v.value if isinstance(v, Enum) else v for k, v in request_data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await request_orders_collection.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request order not found")
    
    # Return updated request
    request_order = await request_orders_collection.find_one({"id": request_id}, {"_id": 0})
    request_order['created_at'] = datetime.fromisoformat(request_order['created_at'])
    
    return RequestOrder(**request_order)

# ============ REPORTS ============

@admin_router.get("/reports/summary")
async def get_summary_report(current_admin: User = Depends(require_admin)):
    """Get summary statistics"""
    total_users = await users_collection.count_documents({})
    pending_users = await users_collection.count_documents({"status": UserStatus.PENDING.value})
    total_orders = await orders_collection.count_documents({})
    pending_orders = await orders_collection.count_documents({"payment_status": PaymentStatus.PENDING.value})
    completed_orders = await orders_collection.count_documents({"order_status": OrderStatus.DELIVERED.value})
    
    # Calculate revenue
    orders = await orders_collection.find({"payment_status": PaymentStatus.RECEIVED.value}, {"_id": 0}).to_list(10000)
    total_revenue = sum(order.get("total_amount", 0) for order in orders)
    
    return {
        "total_users": total_users,
        "pending_users": pending_users,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "total_revenue": total_revenue
    }
