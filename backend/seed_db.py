import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_data():
    print("Seeding database...")
    
    # Create admin user
    admin_exists = await db.users.find_one({"role": "ADMIN"})
    if not admin_exists:
        admin_user = {
            "id": "admin-001",
            "phone": "+911234567890",
            "role": "ADMIN",
            "name": "Admin User",
            "email": "admin@cemention.com",
            "status": "APPROVED",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        print("✓ Admin user created (Phone: +911234567890)")
    
    # Create sample products
    products_exist = await db.products.count_documents({})
    if products_exist == 0:
        products = [
            {
                "id": "prod-001",
                "name": "UltraTech PPC Cement",
                "brand": "UltraTech",
                "description": "Portland Pozzolana Cement - 50kg bags",
                "base_price_dealer": 300,
                "base_price_retailer": 303,
                "base_price_customer": 305,
                "min_quantity": 100,
                "stock_available": 10000,
                "image_url": "https://images.unsplash.com/photo-1625308216182-218ff63d47bb?w=400",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "prod-002",
                "name": "ACC Gold Cement",
                "brand": "ACC",
                "description": "High strength cement - 50kg bags",
                "base_price_dealer": 305,
                "base_price_retailer": 308,
                "base_price_customer": 310,
                "min_quantity": 100,
                "stock_available": 8000,
                "image_url": "https://images.unsplash.com/photo-1625308216182-218ff63d47bb?w=400",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "prod-003",
                "name": "Ambuja OPC Cement",
                "brand": "Ambuja",
                "description": "Ordinary Portland Cement - 50kg bags",
                "base_price_dealer": 298,
                "base_price_retailer": 301,
                "base_price_customer": 303,
                "min_quantity": 100,
                "stock_available": 12000,
                "image_url": "https://images.unsplash.com/photo-1625308216182-218ff63d47bb?w=400",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        await db.products.insert_many(products)
        print(f"✓ {len(products)} products created")
    
    print("Database seeding completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_data())
