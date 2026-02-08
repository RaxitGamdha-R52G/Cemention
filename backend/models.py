from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    DEALER = "DEALER"
    RETAILER = "RETAILER"
    CUSTOMER = "CUSTOMER"
    ADMIN = "ADMIN"

class UserStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class PaymentMethod(str, Enum):
    UPI = "UPI"
    CARD = "CARD"
    NETBANKING = "NETBANKING"
    BANK_TRANSFER = "BANK_TRANSFER"
    COD = "COD"

class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    RECEIVED = "RECEIVED"
    FAILED = "FAILED"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    ASSIGNED = "ASSIGNED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

class RequestOrderStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

# User Models
class UserBase(BaseModel):
    phone: str
    role: UserRole
    name: Optional[str] = None
    email: Optional[str] = None
    business_name: Optional[str] = None
    brand_shop_name: Optional[str] = None
    gst_number: Optional[str] = None
    gst_registered_name: Optional[str] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: UserStatus = UserStatus.PENDING
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# OTP Models
class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    sid: Optional[str] = None

# Product Models
class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    brand: str
    description: Optional[str] = None
    base_price_dealer: int = 300  # per bag in rupees
    base_price_retailer: int = 303
    base_price_customer: int = 305
    min_quantity: int = 100
    stock_available: int = 10000
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    brand: str
    description: Optional[str] = None
    base_price_dealer: int = 300
    base_price_retailer: int = 303
    base_price_customer: int = 305
    min_quantity: int = 100
    stock_available: int = 10000
    image_url: Optional[str] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    base_price_dealer: Optional[int] = None
    base_price_retailer: Optional[int] = None
    base_price_customer: Optional[int] = None
    stock_available: Optional[int] = None
    is_active: Optional[bool] = None

# Address Models
class Address(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddressCreate(BaseModel):
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    is_default: bool = False

# Cart Models
class CartItem(BaseModel):
    product_id: str
    quantity: int
    price_per_bag: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price_per_bag: int
    total_price: int

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    order_number: str = Field(default_factory=lambda: f"ORD{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}")
    items: List[OrderItem]
    subtotal: int
    gst_amount: int = 0
    surcharge_amount: int = 0
    total_amount: int
    payment_method: Optional[PaymentMethod] = None
    payment_status: PaymentStatus = PaymentStatus.PENDING
    order_status: OrderStatus = OrderStatus.PENDING
    delivery_address_id: str
    driver_name: Optional[str] = None
    driver_mobile: Optional[str] = None
    vehicle_number: Optional[str] = None
    invoice_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    delivery_address_id: str
    payment_method: PaymentMethod

class OrderUpdate(BaseModel):
    payment_status: Optional[PaymentStatus] = None
    order_status: Optional[OrderStatus] = None
    driver_name: Optional[str] = None
    driver_mobile: Optional[str] = None
    vehicle_number: Optional[str] = None

# Request Order Models
class RequestOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    cement_brand: str
    quantity: int
    delivery_location: str
    phone: str
    preferred_delivery_date: Optional[str] = None
    status: RequestOrderStatus = RequestOrderStatus.PENDING
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RequestOrderCreate(BaseModel):
    cement_brand: str
    quantity: int
    delivery_location: str
    phone: str
    preferred_delivery_date: Optional[str] = None

class RequestOrderUpdate(BaseModel):
    status: RequestOrderStatus
    admin_notes: Optional[str] = None

# Response Models
class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[User] = None
    token: Optional[str] = None

class ProductWithPrice(Product):
    user_price: int
