from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.mongo_db_name]

users_collection = db["users"]
clients_collection = db["clients"]
rows_collection = db["rows"]


async def ensure_indexes():
    await users_collection.create_index("username", unique=True)
    await clients_collection.create_index("name", unique=True)
    await rows_collection.create_index([("client_id", 1), ("deleted", 1)])
