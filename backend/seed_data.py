"""
Seed script to create default admin user
Run: python seed_data.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_admin_user():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin user already exists
    existing_user = await db.users.find_one({"username": "shumail.s"})
    if existing_user:
        # Re-hash password to ensure it works with direct bcrypt
        new_hash = get_password_hash("HONDA@2026")
        security_hash = bcrypt.hashpw("shark".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        await db.users.update_one(
            {"username": "shumail.s"},
            {"$set": {
                "password": new_hash,
                "role": "superadmin",
                "full_name": "Shumail Shahzad",
                "email": "shumailghauri12@gmail.com",
                "company": "Shumail Technologies",
                "is_active": True,
                "security_question": "Who is your work?",
                "security_answer": security_hash,
            }}
        )
        print("Admin user password re-hashed with direct bcrypt!")
        client.close()
        return
    
    # Create admin user
    security_hash = bcrypt.hashpw("shark".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    admin_user = {
        "id": "admin-001",
        "username": "shumail.s",
        "email": "shumailghauri12@gmail.com",
        "full_name": "Shumail Shahzad",
        "role": "superadmin",
        "company": "Shumail Technologies",
        "phone": "",
        "is_active": True,
        "password": get_password_hash("HONDA@2026"),
        "security_question": "Who is your work?",
        "security_answer": security_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_user)
    print("Admin user created successfully!")
    print(f"   Username: shumail.s")
    print(f"   Password: HONDA@2026")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_admin_user())
