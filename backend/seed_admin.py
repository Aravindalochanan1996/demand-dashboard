"""
Run this once to create your first admin user directly in MongoDB.

Usage:
    cd backend
    python seed_admin.py
"""
import asyncio
import getpass

from app.database import users_collection
from app.auth import hash_password


async def main():
    username = input("Admin username: ").strip()
    password = getpass.getpass("Admin password: ").strip()

    existing = await users_collection.find_one({"username": username})
    if existing:
        print(f"User '{username}' already exists.")
        return

    await users_collection.insert_one(
        {
            "username": username,
            "password_hash": hash_password(password),
            "role": "admin",
            "assigned_clients": [],
        }
    )
    print(f"Admin user '{username}' created.")


if __name__ == "__main__":
    asyncio.run(main())
