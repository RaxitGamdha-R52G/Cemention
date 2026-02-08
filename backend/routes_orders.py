from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from models import *
from database import *
from auth import get_current_user, require_approved

orders_router = APIRouter(prefix="/api/orders", tags=["orders"])

@orders_router.post("/create", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: User = Depends(require_approved)):
    """Create order from cart"""
    
    # Get cart
    cart = await carts_collection.find_one({"user_id": current_user.id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Verify address
    address = await addresses_collection.find_one({"id": order_data.delivery_address_id, "user_id": current_user.id})
    if not address:
        raise HTTPException(status_code=404, detail="Delivery address not found")
    
    # Build order items
    order_items = []
    subtotal = 0
    
    for cart_item in cart["items"]:
        # Get product details
        product = await products_collection.find_one({"id": cart_item["product_id"]}, {"_id": 0})
        if not product:
            continue
        
        item_total = cart_item["quantity"] * cart_item["price_per_bag"]
        order_items.append(OrderItem(
            product_id=cart_item["product_id"],
            product_name=product["name"],
            quantity=cart_item["quantity"],
            price_per_bag=cart_item["price_per_bag"],
            total_price=item_total
        ))
        subtotal += item_total
    
    # Calculate GST (18% for cement)
    gst_amount = int(subtotal * 0.18)
    
    # Calculate surcharge for card payments
    surcharge_amount = 0
    if order_data.payment_method == PaymentMethod.CARD:
        surcharge_amount = int(subtotal * 0.02)  # 2% surcharge
    
    total_amount = subtotal + gst_amount + surcharge_amount
    
    # Create order
    order = Order(
        user_id=current_user.id,
        items=order_items,
        subtotal=subtotal,
        gst_amount=gst_amount,
        surcharge_amount=surcharge_amount,
        total_amount=total_amount,
        payment_method=order_data.payment_method,
        delivery_address_id=order_data.delivery_address_id
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    
    await orders_collection.insert_one(order_dict)
    
    # Clear cart
    await carts_collection.update_one(
        {"user_id": current_user.id},
        {"$set": {"items": [], "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return order

@orders_router.get("/my-orders", response_model=List[Order])
async def get_my_orders(current_user: User = Depends(get_current_user)):
    """Get user's orders"""
    orders = await orders_collection.find({"user_id": current_user.id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for order in orders:
        order['created_at'] = datetime.fromisoformat(order['created_at'])
        order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return [Order(**order) for order in orders]

@orders_router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    """Get order by ID"""
    order = await orders_collection.find_one({"id": order_id, "user_id": current_user.id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order['created_at'] = datetime.fromisoformat(order['created_at'])
    order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return Order(**order)

@orders_router.post("/payment-confirmation/{order_id}")
async def confirm_payment(order_id: str, confirmation_data: dict, current_user: User = Depends(get_current_user)):
    """Confirm payment received (for bank transfer/manual verification)"""
    order = await orders_collection.find_one({"id": order_id, "user_id": current_user.id})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update payment status to pending (admin will verify)
    await orders_collection.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": PaymentStatus.PENDING.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Payment confirmation submitted. Admin will verify."}

# ============ REQUEST ORDER ROUTES ============

@orders_router.post("/request-order", response_model=RequestOrder)
async def create_request_order(request_data: RequestOrderCreate, current_user: User = Depends(require_approved)):
    """Create a request order for large/custom quantities"""
    
    request_order = RequestOrder(
        user_id=current_user.id,
        **request_data.model_dump()
    )
    
    request_dict = request_order.model_dump()
    request_dict['created_at'] = request_dict['created_at'].isoformat()
    
    await request_orders_collection.insert_one(request_dict)
    
    return request_order

@orders_router.get("/request-orders", response_model=List[RequestOrder])
async def get_my_request_orders(current_user: User = Depends(get_current_user)):
    """Get user's request orders"""
    requests = await request_orders_collection.find(
        {"user_id": current_user.id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        req['created_at'] = datetime.fromisoformat(req['created_at'])
    
    return [RequestOrder(**req) for req in requests]
