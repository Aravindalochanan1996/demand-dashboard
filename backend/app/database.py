from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.mongo_db_name]

users_collection = db["users"]
clients_collection = db["clients"]
rows_collection = db["rows"]

# ATS Tracker (basic structure)
ats_entries_collection = db["ats_entries"]

# Resume Builder (basic structure)
resume_drafts_collection = db["resume_drafts"]

# Resume Analyzer chatbot
resume_files_collection = db["resume_files"]


async def ensure_indexes():
    await users_collection.create_index("username", unique=True)
    await clients_collection.create_index("name", unique=True)
    await rows_collection.create_index([("client_id", 1), ("deleted", 1)])
    await ats_entries_collection.create_index("owner_username")
    await resume_drafts_collection.create_index("owner_username")
    await resume_files_collection.create_index("owner_username")
