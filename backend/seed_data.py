"""
Seed script to create default admin user
Run: python seed_data.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_admin_user():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin user already exists
    existing_user = await db.users.find_one({"username": "shumail.s"})
    if existing_user:
        print("Admin user already exists!")
        client.close()
        return
    
    # Create admin user
    admin_user = {
        "id": "admin-001",
        "username": "shumail.s",
        "email": "admin@autotransport.com",
        "full_name": "Admin User",
        "role": "admin",
        "password": pwd_context.hash("HONDA@2026"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    print("✅ Admin user created successfully!")
    print(f"   Username: shumail.s")
    print(f"   Password: HONDA@2026")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_admin_user())
