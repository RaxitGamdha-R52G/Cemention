from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cemention_db')]

# Collections
users_collection = db.users
products_collection = db.products
addresses_collection = db.addresses
carts_collection = db.carts
orders_collection = db.orders
request_orders_collection = db.request_orders
otp_collection = db.otps
