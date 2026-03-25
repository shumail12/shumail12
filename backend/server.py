from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request, Header as FastAPIHeader, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import json
import secrets
import base64
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
import time
from collections import defaultdict
from distance_calc import estimate_distance, calculate_pricing


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "breamway-crm-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

security = HTTPBearer()

app = FastAPI(title="Breamway Auto Transport API", version="2.0.0")
api_router = APIRouter(prefix="/api")

# ==================== SSE CLIENT MANAGER ====================

class SSEManager:
    """Manages SSE connections for real-time notifications"""
    def __init__(self):
        self.clients: dict[str, asyncio.Queue] = {}

    def connect(self, client_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.clients[client_id] = queue
        return queue

    def disconnect(self, client_id: str):
        self.clients.pop(client_id, None)

    async def broadcast(self, event_type: str, data: dict):
        """Send event to all connected clients"""
        message = json.dumps({"type": event_type, **data}, default=str)
        disconnected = []
        for client_id, queue in self.clients.items():
            try:
                await queue.put(message)
            except Exception:
                disconnected.append(client_id)
        for cid in disconnected:
            self.disconnect(cid)

sse_manager = SSEManager()

# Default vendor API key (generated on startup)
VENDOR_API_KEY = os.getenv("VENDOR_API_KEY", "brw-" + secrets.token_hex(16))


# ==================== STARTUP ====================

@app.on_event("startup")
async def ensure_superadmin():
    admin = await db.users.find_one({"username": "shumail.s"})
    if not admin:
        admin_doc = {
            "id": "admin-001", "username": "shumail.s",
            "email": "shumailghauri12@gmail.com", "full_name": "Shumail Shahzad",
            "role": "superadmin", "company": "Shumail Technologies",
            "phone": "", "is_active": True,
            "password": get_password_hash("HONDA@2026"),
            "security_question": "Who is your work?",
            "security_answer": bcrypt.hashpw("shark".encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(admin_doc)
    else:
        stored_pw = admin.get("password", "")
        try:
            works = verify_password("HONDA@2026", stored_pw)
        except Exception:
            works = False
        if not works:
            await db.users.update_one({"username": "shumail.s"}, {"$set": {"password": get_password_hash("HONDA@2026")}})
        if admin.get("role") != "superadmin":
            await db.users.update_one({"username": "shumail.s"}, {"$set": {"role": "superadmin"}})
    # Ensure indexes
    await db.quotes.create_index("quote_number", unique=True, sparse=True)
    await db.quotes.create_index([("created_at", -1)])
    await db.quotes.create_index("status")
    await db.orders.create_index("order_number", unique=True, sparse=True)
    await db.counters.update_one({"_id": "quote_seq"}, {"$setOnInsert": {"seq": 0}}, upsert=True)
    await db.counters.update_one({"_id": "order_seq"}, {"$setOnInsert": {"seq": 0}}, upsert=True)
    # Notifications index
    await db.notifications.create_index([("created_at", -1)])
    await db.notifications.create_index("is_read")
    # Store/log vendor API key
    await db.settings.update_one(
        {"_id": "vendor_api_key"},
        {"$setOnInsert": {"key": VENDOR_API_KEY, "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    key_doc = await db.settings.find_one({"_id": "vendor_api_key"})
    logging.info(f"Vendor API Key: {key_doc['key']}")
    # Auto-import CSV data if DB is empty
    quote_count = await db.quotes.count_documents({})
    if quote_count < 100:
        logging.info(f"DB has only {quote_count} quotes. Starting auto-import...")
        await auto_import_csv_data()


async def auto_import_csv_data():
    """Import CSV data files into quotes collection on first startup"""
    import csv
    import re

    def parse_price(price_str):
        if not price_str: return 0.0
        cleaned = re.sub(r'[,$]', '', str(price_str))
        try: return float(cleaned)
        except: return 0.0

    def parse_year(year_str):
        if not year_str: return ""
        cleaned = re.sub(r'[,\s]', '', str(year_str))
        try: return str(int(float(cleaned)))
        except: return str(year_str).strip()

    def extract_city_state(loc):
        if not loc: return '', ''
        parts = loc.split(',')
        if len(parts) >= 2: return parts[0].strip(), parts[-1].strip()
        return loc.strip(), ''

    data_dir = Path(__file__).parent
    quotes_to_import = []
    seq = 0

    # File 1: Breamway All Quotes
    file1 = data_dir / 'data_breamway_quotes.csv'
    if file1.exists():
        logging.info(f"Importing {file1}...")
        with open(file1, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get('Name') or '').strip()
                if not name: continue
                seq += 1
                p_city, p_state = extract_city_state(row.get('Pickup', ''))
                d_city, d_state = extract_city_state(row.get('Delivery', ''))
                quotes_to_import.append({
                    "id": str(uuid.uuid4()), "quote_number": f"BR{seq:06d}",
                    "agent_name": (row.get('Sales Agent') or '').strip(),
                    "customer_name": name, "phone": (row.get('Phone') or '').strip(),
                    "email": (row.get('Email Address') or '').strip(),
                    "vehicle_year": parse_year(row.get('Year', '')),
                    "vehicle_make": (row.get('Make') or '').strip(),
                    "vehicle_model": (row.get('Model') or '').strip(),
                    "pickup_address": (row.get('Pickup') or '').strip(),
                    "pickup_city": p_city, "pickup_state": p_state,
                    "delivery_address": (row.get('Delivery') or '').strip(),
                    "delivery_city": d_city, "delivery_state": d_state,
                    "pickup_date": (row.get('Pickup Date') or '').strip() or None,
                    "shipping_type": "standard",
                    "price": parse_price(row.get('Total Price', '0')),
                    "deposit_fee": parse_price(row.get('Deposit Fee', '150')),
                    "carrier_fee": parse_price(row.get('Carrier Fee', '0')),
                    "source": (row.get('Lead Source') or '').strip(),
                    "status": "quoted", "notes": "",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        logging.info(f"  Parsed {seq} from file 1")

    # File 2: Export
    file2 = data_dir / 'data_export2.csv'
    if file2.exists():
        logging.info(f"Importing {file2}...")
        count2 = 0
        with open(file2, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get('Name') or '').strip()
                if not name: continue
                seq += 1; count2 += 1
                p_city = (row.get('Pickup City') or '').strip()
                p_state = (row.get('Pickup State') or '').strip()
                d_city = (row.get('Delivery City') or '').strip()
                d_state = (row.get('Delivery State') or '').strip()
                quotes_to_import.append({
                    "id": str(uuid.uuid4()), "quote_number": f"BR{seq:06d}",
                    "agent_name": (row.get('Sales Agent') or '').strip(),
                    "customer_name": name, "phone": (row.get('Phone') or '').strip(),
                    "email": (row.get('Email Address') or '').strip(),
                    "vehicle_year": parse_year(row.get('Year', '')),
                    "vehicle_make": (row.get('Make') or '').strip(),
                    "vehicle_model": (row.get('Model') or '').strip(),
                    "pickup_address": f"{p_city}, {p_state}" if p_city else "",
                    "pickup_city": p_city, "pickup_state": p_state,
                    "delivery_address": f"{d_city}, {d_state}" if d_city else "",
                    "delivery_city": d_city, "delivery_state": d_state,
                    "pickup_date": (row.get('Pickup Date') or '').strip() or None,
                    "shipping_type": "standard",
                    "price": parse_price(row.get('Total Price', '0')),
                    "deposit_fee": 150.0, "carrier_fee": 0.0,
                    "source": "", "status": "quoted", "notes": "",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        logging.info(f"  Parsed {count2} from file 2")

    if quotes_to_import:
        # Clear any existing data first
        await db.quotes.delete_many({})
        # Insert in batches
        batch_size = 5000
        for i in range(0, len(quotes_to_import), batch_size):
            batch = quotes_to_import[i:i+batch_size]
            await db.quotes.insert_many(batch)
            logging.info(f"  Inserted batch {i//batch_size + 1} ({len(batch)} records)")
        # Update counter
        await db.counters.update_one({"_id": "quote_seq"}, {"$set": {"seq": seq}}, upsert=True)
        logging.info(f"Auto-import complete! Total: {seq} quotes (BR000001 to BR{seq:06d})")


async def get_next_quote_number():
    result = await db.counters.find_one_and_update(
        {"_id": "quote_seq"}, {"$inc": {"seq": 1}}, return_document=True, upsert=True
    )
    return f"BR{result['seq']:06d}"

async def get_next_order_number():
    result = await db.counters.find_one_and_update(
        {"_id": "order_seq"}, {"$inc": {"seq": 1}}, return_document=True, upsert=True
    )
    return f"ORD{result['seq']:06d}"


# ==================== MODELS ====================

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "staff"
    company: str = "Breamway Auto Transport"
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class User(UserBase):
    id: str
    created_at: datetime

class UserLogin(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    username: str

class ResetPasswordRequest(BaseModel):
    username: str
    security_answer: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# --- Quote (main entity - holds all customer + vehicle + address data) ---

class QuoteCreateInput(BaseModel):
    agent_name: Optional[str] = None
    customer_name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    vehicle_year: Optional[str] = ""
    vehicle_make: Optional[str] = ""
    vehicle_model: Optional[str] = ""
    pickup_address: Optional[str] = ""
    pickup_city: Optional[str] = ""
    pickup_state: Optional[str] = ""
    delivery_address: Optional[str] = ""
    delivery_city: Optional[str] = ""
    delivery_state: Optional[str] = ""
    pickup_date: Optional[str] = None
    shipping_type: str = "standard"  # standard, expedited, enclosed
    price: float = 0
    deposit_fee: float = 150
    carrier_fee: float = 0
    source: Optional[str] = ""
    status: str = "lead"  # lead, quoted, order, dispatched, delivered, cancelled
    notes: Optional[str] = ""

class QuoteUpdateInput(BaseModel):
    agent_name: Optional[str] = None
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    vehicle_year: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    pickup_address: Optional[str] = None
    pickup_city: Optional[str] = None
    pickup_state: Optional[str] = None
    pickup_zip: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = None
    delivery_zip: Optional[str] = None
    pickup_date: Optional[str] = None
    shipping_type: Optional[str] = None
    price: Optional[float] = None
    deposit_fee: Optional[float] = None
    carrier_fee: Optional[float] = None
    pricing_standard: Optional[dict] = None
    pricing_expedited: Optional[dict] = None
    pricing_enclosed: Optional[dict] = None
    estimated_distance: Optional[int] = None
    source: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# --- Order ---

class OrderCreateInput(BaseModel):
    quote_id: str
    carrier_name: Optional[str] = ""
    carrier_phone: Optional[str] = ""
    carrier_mc: Optional[str] = ""
    driver_name: Optional[str] = ""
    driver_phone: Optional[str] = ""
    pickup_date: Optional[str] = ""
    delivery_date: Optional[str] = ""
    dispatch_notes: Optional[str] = ""
    status: str = "pending"  # pending, assigned, picked_up, in_transit, delivered

class OrderUpdateInput(BaseModel):
    carrier_name: Optional[str] = None
    carrier_phone: Optional[str] = None
    carrier_mc: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    pickup_date: Optional[str] = None
    delivery_date: Optional[str] = None
    dispatch_notes: Optional[str] = None
    status: Optional[str] = None
    price: Optional[float] = None
    deposit_fee: Optional[float] = None
    carrier_fee: Optional[float] = None
    shipping_type: Optional[str] = None
    pricing_standard: Optional[dict] = None
    pricing_expedited: Optional[dict] = None
    pricing_enclosed: Optional[dict] = None
    estimated_distance: Optional[int] = None
    pickup_zip: Optional[str] = None
    delivery_zip: Optional[str] = None
    payment_method: Optional[str] = None

# --- Carrier ---

class CarrierInput(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""
    mc_number: Optional[str] = ""
    dot_number: Optional[str] = ""
    contact_name: Optional[str] = ""
    notes: Optional[str] = ""

# --- Invoice ---

class InvoiceCreateInput(BaseModel):
    order_id: str
    invoice_type: str = "customer"  # customer or driver
    amount: float = 0
    deposit: float = 150
    notes: Optional[str] = ""
    status: str = "unpaid"  # unpaid, paid, void

class InvoiceUpdateInput(BaseModel):
    amount: Optional[float] = None
    deposit: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class CompanySettings(BaseModel):
    company_name: str = "Breamway Auto Transport"
    company_email: str = "info@breamway.com"
    company_phone: str = ""
    company_address: str = ""
    website: str = "www.breamway.com"
    primary_color: str = "#2563EB"
    invoice_terms: str = "Payment due within 30 days"

# --- Vendor Lead Intake ---

class VendorLeadInput(BaseModel):
    name: str
    phone: Optional[str] = ""
    phone2: Optional[str] = ""
    email: Optional[str] = ""
    vehicle: Optional[dict] = None  # {year, make, model}
    vehicle_year: Optional[str] = ""
    vehicle_make: Optional[str] = ""
    vehicle_model: Optional[str] = ""
    pickup: Optional[str] = ""
    delivery: Optional[str] = ""
    pickup_city: Optional[str] = ""
    pickup_state: Optional[str] = ""
    pickup_zip: Optional[str] = ""
    delivery_city: Optional[str] = ""
    delivery_state: Optional[str] = ""
    delivery_zip: Optional[str] = ""
    date: Optional[str] = None
    pickup_date: Optional[str] = None
    running: Optional[str] = ""
    source: Optional[str] = "vendor"
    lead_source_id: Optional[str] = ""
    notes: Optional[str] = ""

# --- Chat ---

class ChatMessageInput(BaseModel):
    receiver_id: Optional[str] = None  # null = group chat
    channel: str = "all-team"  # 'all-team' or 'dm-{user1}-{user2}'
    text: str = ""
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None  # image, file, link

class ChatGroupCreateInput(BaseModel):
    name: str
    member_ids: List[str]

# --- Agreement/Contract ---

class AgreementCreateInput(BaseModel):
    order_id: str
    agreement_type: str = "transport"  # transport, broker, carrier
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    vehicle_info: str = ""
    pickup_location: str = ""
    delivery_location: str = ""
    price: float = 0
    deposit: float = 0
    terms: str = ""
    special_conditions: str = ""

class AgreementUpdateInput(BaseModel):
    agreement_type: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    vehicle_info: Optional[str] = None
    pickup_location: Optional[str] = None
    delivery_location: Optional[str] = None
    price: Optional[float] = None
    deposit: Optional[float] = None
    terms: Optional[str] = None
    special_conditions: Optional[str] = None
    status: Optional[str] = None

class SignAgreementInput(BaseModel):
    signer_name: str
    signature_data: str  # base64 encoded signature image

# --- Revenue ---

PAYMENT_METHODS = ["Zelle", "COD", "CashApp", "Venmo", "ACH", "Card"]

class RevenueFormInput(BaseModel):
    order_id: str
    customer_name: str = ""
    vehicle_info: str = ""
    route: str = ""
    deposit_amount: float = 0
    total_price: Optional[float] = None
    payment_method: str = "Zelle"
    notes: str = ""


# ==================== AUTHENTICATION ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await db.users.find_one({"username": username}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return User(**user)

async def require_superadmin(current_user: User = Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return current_user


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"username": user_login.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    try:
        password_valid = verify_password(user_login.password, user.get("password", ""))
    except Exception:
        password_valid = False
    if not password_valid:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")
    access_token = create_access_token(
        data={"sub": user["username"]},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(access_token=access_token, token_type="bearer", user=User(**user))

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate, current_user: User = Depends(require_superadmin)):
    if await db.users.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    user_dict = user.model_dump()
    user_dict["password"] = get_password_hash(user.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one(user_dict)
    return User(**user_dict)

# Rate limiter for password reset
_reset_attempts = defaultdict(list)

@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    user = await db.users.find_one({"username": req.username}, {"_id": 0})
    if not user or user.get("role") != "superadmin":
        raise HTTPException(status_code=404, detail="Account not found or not eligible for password reset")
    question = user.get("security_question")
    if not question:
        raise HTTPException(status_code=400, detail="Security question not configured")
    return {"security_question": question, "username": req.username}

@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    now = time.time()
    key = req.username
    _reset_attempts[key] = [t for t in _reset_attempts[key] if now - t < 900]
    if len(_reset_attempts[key]) >= 5:
        raise HTTPException(status_code=429, detail="Too many reset attempts. Try again in 15 minutes.")
    _reset_attempts[key].append(now)
    user = await db.users.find_one({"username": req.username}, {"_id": 0})
    if not user or user.get("role") != "superadmin":
        raise HTTPException(status_code=404, detail="Account not found")
    stored_answer = user.get("security_answer")
    if not stored_answer or not bcrypt.checkpw(req.security_answer.lower().encode('utf-8'), stored_answer.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Incorrect security answer")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one({"username": req.username}, {"$set": {"password": get_password_hash(req.new_password)}})
    _reset_attempts.pop(key, None)
    return {"message": "Password reset successfully."}


# ==================== USER MANAGEMENT ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_superadmin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(None)
    return [User(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(require_superadmin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate, current_user: User = Depends(require_superadmin)):
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    update_dict = {k: v for k, v in user_update.model_dump().items() if v is not None}
    if "password" in update_dict:
        update_dict["password"] = get_password_hash(update_dict["password"])
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return User(**updated)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(require_superadmin)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


# ==================== COMPANY SETTINGS ====================

@api_router.get("/settings/company")
async def get_company_settings(current_user: User = Depends(get_current_user)):
    settings = await db.company_settings.find_one({}, {"_id": 0})
    return settings or CompanySettings().model_dump()

@api_router.put("/settings/company")
async def update_company_settings(settings: CompanySettings, current_user: User = Depends(require_superadmin)):
    await db.company_settings.update_one({}, {"$set": settings.model_dump()}, upsert=True)
    return settings.model_dump()


# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    is_admin = current_user.role in ("superadmin", "admin")

    total_leads = await db.quotes.count_documents({"status": "lead"})
    total_all_quotes = await db.quotes.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_quotes = await db.quotes.count_documents({"status": "quoted"})
    active_orders = await db.orders.count_documents({"status": {"$in": ["pending", "assigned", "picked_up", "in_transit"]}})
    delivered_orders = await db.orders.count_documents({"status": "delivered"})
    total_users = await db.users.count_documents({})
    total_carriers = await db.carriers.count_documents({})

    # Revenue from revenue_forms (deposit-based)
    user_rev_query = {} if is_admin else {"submitted_by_id": current_user.id}
    revenue_docs = await db.revenue_forms.find(user_rev_query, {"_id": 0, "deposit_amount": 1}).to_list(None)
    total_revenue = sum(d.get("deposit_amount", 0) for d in revenue_docs)

    # User's own revenue for target tracking
    my_rev_docs = await db.revenue_forms.find({"submitted_by_id": current_user.id}, {"_id": 0, "deposit_amount": 1}).to_list(None)
    my_revenue = sum(d.get("deposit_amount", 0) for d in my_rev_docs)

    conversion_rate = round((total_orders / total_all_quotes * 100), 1) if total_all_quotes > 0 else 0

    recent_quotes = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)

    # Revenue target levels
    target = 1500
    if my_revenue >= 5000:
        target = 5000
    elif my_revenue >= 3000:
        target = 5000
    elif my_revenue >= 1500:
        target = 3000

    return {
        "total_leads": total_leads,
        "total_quotes": total_all_quotes,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "my_revenue": my_revenue,
        "revenue_target": target,
        "pending_quotes": pending_quotes,
        "active_orders": active_orders,
        "delivered_orders": delivered_orders,
        "total_users": total_users,
        "total_carriers": total_carriers,
        "conversion_rate": conversion_rate,
        "recent_quotes": recent_quotes,
        "recent_orders": recent_orders,
    }


# ==================== LEAD ROUTES ====================

# API Key routes must be defined BEFORE parameterized routes to avoid conflicts
@api_router.get("/leads/api-key")
async def get_vendor_api_key(current_user: User = Depends(require_superadmin)):
    key_doc = await db.settings.find_one({"_id": "vendor_api_key"})
    return {"api_key": key_doc["key"] if key_doc else "NOT_CONFIGURED"}

@api_router.post("/leads/api-key/regenerate")
async def regenerate_vendor_api_key(current_user: User = Depends(require_superadmin)):
    new_key = "brw-" + secrets.token_hex(16)
    await db.settings.update_one({"_id": "vendor_api_key"}, {"$set": {"key": new_key}})
    return {"api_key": new_key}

@api_router.get("/leads/pricing/{lead_id}")
async def get_lead_pricing(lead_id: str, current_user: User = Depends(get_current_user)):
    """Get suggested pricing for a lead based on pickup/delivery distance."""
    lead = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    pickup_city = lead.get("pickup_city", "")
    pickup_state = lead.get("pickup_state", "")
    delivery_city = lead.get("delivery_city", "")
    delivery_state = lead.get("delivery_state", "")
    distance = estimate_distance(pickup_city, pickup_state, delivery_city, delivery_state)
    if not distance:
        return {"distance_miles": None, "pricing": None, "message": "Could not estimate distance for the given cities."}
    pricing = calculate_pricing(distance)
    return {"distance_miles": distance, "pricing": pricing}

class LeadApproveInput(BaseModel):
    pricing_standard: dict  # {deposit_fee, carrier_fee, total_price}
    pricing_expedited: dict
    pricing_enclosed: dict
    estimated_distance: Optional[int] = None

@api_router.post("/leads/{lead_id}/approve")
async def approve_lead(
    lead_id: str,
    data: LeadApproveInput,
    current_user: User = Depends(get_current_user)
):
    """Approve a lead with ALL pricing types and convert to quote."""
    lead = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.get("status") != "lead":
        raise HTTPException(status_code=400, detail="This record is already a quote or order")
    # Use standard as the default/primary price
    std = data.pricing_standard
    update_data = {
        "status": "quoted",
        "price": std.get("total_price", 0),
        "deposit_fee": std.get("deposit_fee", 150),
        "carrier_fee": std.get("carrier_fee", 60),
        "shipping_type": "standard",
        "pricing_standard": data.pricing_standard,
        "pricing_expedited": data.pricing_expedited,
        "pricing_enclosed": data.pricing_enclosed,
        "estimated_distance": data.estimated_distance,
        "approved_by": current_user.full_name,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quotes.update_one({"id": lead_id}, {"$set": update_data})
    updated = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    return updated

@api_router.get("/leads")
async def get_leads(
    skip: int = 0, limit: int = 100,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get leads. New leads visible only to assigned user. Admin/superadmin see all."""
    is_admin = current_user.role in ("superadmin", "admin")
    query = {"status": "lead"}
    if not is_admin:
        # Non-admin users see: leads assigned to them OR legacy leads (no assigned_to_id)
        query["$or"] = [
            {"assigned_to_id": current_user.id},
            {"assigned_to_id": {"$exists": False}},
            {"assigned_to_id": None},
            {"assigned_to_id": ""},
        ]
    if search:
        search_conds = [
            {"quote_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"pickup_city": {"$regex": search, "$options": "i"}},
            {"delivery_city": {"$regex": search, "$options": "i"}},
            {"vehicle_make": {"$regex": search, "$options": "i"}},
        ]
        if "$or" in query:
            query = {"$and": [{"status": "lead"}, {"$or": query["$or"]}, {"$or": search_conds}]}
        else:
            query["$or"] = search_conds
    total = await db.quotes.count_documents(query)
    leads = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"leads": leads, "total": total}

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current_user: User = Depends(get_current_user)):
    lead = await db.quotes.find_one({"id": lead_id, "status": "lead"}, {"_id": 0})
    if not lead:
        lead = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: QuoteUpdateInput, current_user: User = Depends(get_current_user)):
    existing = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Lead not found")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.quotes.update_one({"id": lead_id}, {"$set": update_dict})
    updated = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    return updated

@api_router.post("/leads/{lead_id}/convert-to-quote")
async def convert_lead_to_quote(lead_id: str, current_user: User = Depends(get_current_user)):
    """Convert a lead to a quote (changes status from 'lead' to 'quoted')"""
    lead = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.get("status") != "lead":
        raise HTTPException(status_code=400, detail="This record is already a quote or order")
    await db.quotes.update_one({"id": lead_id}, {"$set": {"status": "quoted", "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.quotes.find_one({"id": lead_id}, {"_id": 0})
    return updated


# ==================== QUOTE ROUTES (Main Entity) ====================

@api_router.post("/quotes")
async def create_quote(data: QuoteCreateInput, current_user: User = Depends(get_current_user)):
    quote_number = await get_next_quote_number()
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["quote_number"] = quote_number
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    if not doc.get("agent_name"):
        doc["agent_name"] = current_user.full_name
    doc["assigned_to_id"] = current_user.id
    await db.quotes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/quotes")
async def get_quotes(
    skip: int = 0, limit: int = 100,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    shipping_type: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["agent_name"] = assigned_to
    if shipping_type:
        query["shipping_type"] = shipping_type
    if search:
        query["$or"] = [
            {"quote_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"pickup_city": {"$regex": search, "$options": "i"}},
            {"delivery_city": {"$regex": search, "$options": "i"}},
            {"agent_name": {"$regex": search, "$options": "i"}},
            {"vehicle_make": {"$regex": search, "$options": "i"}},
        ]
    total = await db.quotes.count_documents(query)
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"quotes": quotes, "total": total}

@api_router.get("/quotes/agents/list")
async def get_quotes_agents(current_user: User = Depends(get_current_user)):
    agents = await db.quotes.distinct("agent_name")
    return [a for a in agents if a]

@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, current_user: User = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return quote

@api_router.put("/quotes/{quote_id}")
async def update_quote(quote_id: str, data: QuoteUpdateInput, current_user: User = Depends(get_current_user)):
    existing = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Quote not found")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.quotes.update_one({"id": quote_id}, {"$set": update_dict})
    updated = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return updated

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: User = Depends(get_current_user)):
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted"}

@api_router.post("/quotes/{quote_id}/convert-to-order")
async def convert_quote_to_order(quote_id: str, current_user: User = Depends(get_current_user)):
    """Convert a quote to an order"""
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    # Check if order already exists
    existing_order = await db.orders.find_one({"quote_id": quote_id}, {"_id": 0})
    if existing_order:
        raise HTTPException(status_code=400, detail="Order already exists for this quote")
    order_number = await get_next_order_number()
    order_doc = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "quote_id": quote_id,
        "quote_number": quote.get("quote_number", ""),
        "customer_name": quote.get("customer_name", ""),
        "phone": quote.get("phone", ""),
        "email": quote.get("email", ""),
        "agent_name": quote.get("agent_name", ""),
        "vehicle_year": quote.get("vehicle_year", ""),
        "vehicle_make": quote.get("vehicle_make", ""),
        "vehicle_model": quote.get("vehicle_model", ""),
        "pickup_address": quote.get("pickup_address", ""),
        "pickup_city": quote.get("pickup_city", ""),
        "pickup_state": quote.get("pickup_state", ""),
        "pickup_zip": quote.get("pickup_zip", ""),
        "delivery_address": quote.get("delivery_address", ""),
        "delivery_city": quote.get("delivery_city", ""),
        "delivery_state": quote.get("delivery_state", ""),
        "delivery_zip": quote.get("delivery_zip", ""),
        "shipping_type": quote.get("shipping_type", "standard"),
        "price": quote.get("price", 0),
        "deposit_fee": quote.get("deposit_fee", 150),
        "carrier_fee": quote.get("carrier_fee", 0),
        "pricing_standard": quote.get("pricing_standard"),
        "pricing_expedited": quote.get("pricing_expedited"),
        "pricing_enclosed": quote.get("pricing_enclosed"),
        "estimated_distance": quote.get("estimated_distance"),
        "carrier_name": "",
        "carrier_phone": "",
        "carrier_mc": "",
        "driver_name": "",
        "driver_phone": "",
        "pickup_date": quote.get("pickup_date", ""),
        "delivery_date": "",
        "dispatch_notes": "",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(order_doc)
    await db.quotes.update_one({"id": quote_id}, {"$set": {"status": "order", "updated_at": datetime.now(timezone.utc).isoformat()}})
    order_doc.pop("_id", None)
    return order_doc


# ==================== ORDER ROUTES ====================

@api_router.get("/orders")
async def get_orders(
    skip: int = 0, limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"carrier_name": {"$regex": search, "$options": "i"}},
        ]
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"orders": orders, "total": total}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.put("/orders/{order_id}")
async def update_order(order_id: str, data: OrderUpdateInput, current_user: User = Depends(get_current_user)):
    existing = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Order not found")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.orders.update_one({"id": order_id}, {"$set": update_dict})
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return updated

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: User = Depends(get_current_user)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}


# ==================== CARRIER ROUTES ====================

@api_router.post("/carriers")
async def create_carrier(data: CarrierInput, current_user: User = Depends(get_current_user)):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.carriers.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/carriers")
async def get_carriers(current_user: User = Depends(get_current_user)):
    carriers = await db.carriers.find({}, {"_id": 0}).sort("name", 1).to_list(None)
    return carriers

@api_router.get("/carriers/{carrier_id}")
async def get_carrier(carrier_id: str, current_user: User = Depends(get_current_user)):
    carrier = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return carrier

@api_router.put("/carriers/{carrier_id}")
async def update_carrier(carrier_id: str, data: CarrierInput, current_user: User = Depends(get_current_user)):
    existing = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Carrier not found")
    update_dict = data.model_dump()
    await db.carriers.update_one({"id": carrier_id}, {"$set": update_dict})
    updated = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    return updated

@api_router.delete("/carriers/{carrier_id}")
async def delete_carrier(carrier_id: str, current_user: User = Depends(get_current_user)):
    result = await db.carriers.delete_one({"id": carrier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return {"message": "Carrier deleted"}


# ==================== INVOICE ROUTES ====================

@api_router.post("/invoices")
async def create_invoice(data: InvoiceCreateInput, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["invoice_number"] = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    doc["order_number"] = order.get("order_number", "")
    doc["customer_name"] = order.get("customer_name", "")
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.invoices.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/invoices")
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return invoices

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceUpdateInput, current_user: User = Depends(get_current_user)):
    existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_dict.get("status") == "paid" and existing.get("status") != "paid":
        update_dict["paid_date"] = datetime.now(timezone.utc).isoformat()
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_dict})
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return updated

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted"}


# ==================== AGREEMENT/CONTRACT ROUTES ====================

DEFAULT_TRANSPORT_TERMS = """VEHICLE TRANSPORT AGREEMENT

This Agreement is entered into between Breamway Auto Transport ("Broker") and the Customer identified below.

1. SERVICES: Broker agrees to arrange transportation of the vehicle(s) described herein from the pickup location to the delivery location.

2. PRICING: The total price includes all transport costs. A deposit is required to secure the booking. The remaining balance is due upon delivery.

3. INSURANCE: All carriers arranged by Broker maintain cargo insurance as required by Federal Motor Carrier Safety Administration (FMCSA) regulations.

4. PICKUP & DELIVERY: Dates provided are estimates. Broker will make reasonable efforts to meet the estimated schedule. Delays due to weather, mechanical issues, or other factors beyond control do not constitute breach.

5. VEHICLE CONDITION: Customer agrees to remove all personal belongings from the vehicle. Broker is not responsible for items left in the vehicle. A condition report will be completed at pickup and delivery.

6. CANCELLATION: Customer may cancel this agreement with written notice. Cancellation fees may apply if a carrier has already been dispatched.

7. LIABILITY: Broker acts solely as an intermediary. Carrier assumes full liability during transport per FMCSA regulations.

8. PAYMENT: Payment is due as specified. Failure to pay may result in carrier holding the vehicle until payment is received.

By signing below, Customer acknowledges reading and agreeing to all terms and conditions."""

@api_router.post("/agreements")
async def create_agreement(data: AgreementCreateInput, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    quote = await db.quotes.find_one({"id": order.get("quote_id", "")}, {"_id": 0})
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["agreement_number"] = f"AGR-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
    doc["order_number"] = order.get("order_number", "")
    # Auto-fill from order/quote if not provided
    if not doc["customer_name"]:
        doc["customer_name"] = order.get("customer_name", "")
    if not doc["customer_email"]:
        doc["customer_email"] = order.get("email", "")
    if not doc["customer_phone"]:
        doc["customer_phone"] = order.get("phone", "")
    if not doc["vehicle_info"]:
        doc["vehicle_info"] = " ".join(filter(None, [order.get("vehicle_year", ""), order.get("vehicle_make", ""), order.get("vehicle_model", "")]))
    if not doc["pickup_location"]:
        doc["pickup_location"] = order.get("pickup_address", "")
    if not doc["delivery_location"]:
        doc["delivery_location"] = order.get("delivery_address", "")
    if not doc["price"]:
        doc["price"] = order.get("price", 0)
    if not doc["deposit"]:
        doc["deposit"] = order.get("deposit_fee", 150)
    if not doc["terms"]:
        doc["terms"] = DEFAULT_TRANSPORT_TERMS
    doc["status"] = "draft"  # draft, sent, signed, void
    doc["signature_data"] = None
    doc["signer_name"] = None
    doc["signed_at"] = None
    doc["created_by"] = current_user.full_name
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.agreements.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/agreements")
async def get_agreements(
    skip: int = 0, limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"agreement_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"order_number": {"$regex": search, "$options": "i"}},
        ]
    total = await db.agreements.count_documents(query)
    agreements = await db.agreements.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"agreements": agreements, "total": total}

@api_router.get("/agreements/{agreement_id}")
async def get_agreement(agreement_id: str, current_user: User = Depends(get_current_user)):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return agreement

@api_router.put("/agreements/{agreement_id}")
async def update_agreement(agreement_id: str, data: AgreementUpdateInput, current_user: User = Depends(get_current_user)):
    existing = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if existing.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Cannot edit a signed agreement")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.agreements.update_one({"id": agreement_id}, {"$set": update_dict})
    updated = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    return updated

@api_router.post("/agreements/{agreement_id}/send")
async def send_agreement(agreement_id: str, current_user: User = Depends(get_current_user)):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    await db.agreements.update_one({"id": agreement_id}, {"$set": {"status": "sent", "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    return updated

@api_router.post("/agreements/{agreement_id}/sign")
async def sign_agreement(agreement_id: str, sign_data: SignAgreementInput, current_user: User = Depends(get_current_user)):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if agreement.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Agreement already signed")
    await db.agreements.update_one({"id": agreement_id}, {"$set": {
        "status": "signed",
        "signature_data": sign_data.signature_data,
        "signer_name": sign_data.signer_name,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    updated = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    return updated

@api_router.post("/agreements/{agreement_id}/void")
async def void_agreement(agreement_id: str, current_user: User = Depends(get_current_user)):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    await db.agreements.update_one({"id": agreement_id}, {"$set": {"status": "void", "updated_at": datetime.now(timezone.utc).isoformat()}})
    updated = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    return updated

@api_router.delete("/agreements/{agreement_id}")
async def delete_agreement(agreement_id: str, current_user: User = Depends(get_current_user)):
    existing = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if existing.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Cannot delete a signed agreement")
    result = await db.agreements.delete_one({"id": agreement_id})
    return {"message": "Agreement deleted"}

# Public signing endpoint - allows customer to view and sign without full auth
@api_router.get("/agreements/public/{agreement_id}")
async def get_public_agreement(agreement_id: str):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0, "signature_data": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if agreement.get("status") == "void":
        raise HTTPException(status_code=400, detail="Agreement has been voided")
    return agreement

@api_router.post("/agreements/public/{agreement_id}/sign")
async def public_sign_agreement(agreement_id: str, sign_data: SignAgreementInput):
    agreement = await db.agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    if agreement.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Agreement already signed")
    if agreement.get("status") == "void":
        raise HTTPException(status_code=400, detail="Agreement has been voided")
    await db.agreements.update_one({"id": agreement_id}, {"$set": {
        "status": "signed",
        "signature_data": sign_data.signature_data,
        "signer_name": sign_data.signer_name,
        "signed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"message": "Agreement signed successfully"}


# ==================== REVENUE FORMS ====================

@api_router.post("/revenue")
async def submit_revenue_form(data: RevenueFormInput, current_user: User = Depends(get_current_user)):
    """Submit a revenue form for an order."""
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["order_number"] = order.get("order_number", "")
    doc["submitted_by"] = current_user.full_name
    doc["submitted_by_id"] = current_user.id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    # Auto-fill if empty
    if not doc["customer_name"]:
        doc["customer_name"] = order.get("customer_name", "")
    if not doc["vehicle_info"]:
        doc["vehicle_info"] = " ".join(filter(None, [order.get("vehicle_year", ""), order.get("vehicle_make", ""), order.get("vehicle_model", "")]))
    if not doc["route"]:
        doc["route"] = f"{order.get('pickup_city', '')}, {order.get('pickup_state', '')} → {order.get('delivery_city', '')}, {order.get('delivery_state', '')}"
    # Update order payment_method
    await db.orders.update_one({"id": data.order_id}, {"$set": {"payment_method": data.payment_method}})
    await db.revenue_forms.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/revenue")
async def get_revenue_forms(
    skip: int = 0, limit: int = 100,
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get revenue forms. Non-admins see only their own."""
    is_admin = current_user.role in ("superadmin", "admin")
    query = {}
    if not is_admin:
        query["submitted_by_id"] = current_user.id
    elif user_id:
        query["submitted_by_id"] = user_id
    total = await db.revenue_forms.count_documents(query)
    forms = await db.revenue_forms.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"forms": forms, "total": total}

@api_router.get("/revenue/by-order/{order_id}")
async def get_revenue_by_order(order_id: str, current_user: User = Depends(get_current_user)):
    """Get revenue form for a specific order."""
    form = await db.revenue_forms.find_one({"order_id": order_id}, {"_id": 0})
    return form

@api_router.get("/revenue/admin/summary")
async def get_revenue_admin_summary(current_user: User = Depends(require_superadmin)):
    """Super admin: revenue per user, by payment method, totals."""
    all_forms = await db.revenue_forms.find({}, {"_id": 0}).to_list(None)
    total_deposits = sum(f.get("deposit_amount", 0) for f in all_forms)
    # Per user
    by_user = {}
    for f in all_forms:
        uid = f.get("submitted_by", "Unknown")
        if uid not in by_user:
            by_user[uid] = {"name": uid, "user_id": f.get("submitted_by_id", ""), "total_deposit": 0, "count": 0}
        by_user[uid]["total_deposit"] += f.get("deposit_amount", 0)
        by_user[uid]["count"] += 1
    # Per payment method
    by_method = {}
    for f in all_forms:
        m = f.get("payment_method", "Other")
        if m not in by_method:
            by_method[m] = {"method": m, "total": 0, "count": 0}
        by_method[m]["total"] += f.get("deposit_amount", 0)
        by_method[m]["count"] += 1
    return {
        "total_deposits": total_deposits,
        "total_forms": len(all_forms),
        "by_user": list(by_user.values()),
        "by_payment_method": list(by_method.values()),
    }


# ==================== LEAD INTAKE (VENDOR API) ====================

def parse_location(location_str):
    if not location_str: return '', ''
    parts = [p.strip() for p in location_str.split(',')]
    if len(parts) >= 2: return parts[0], parts[-1]
    return location_str, ''

async def verify_vendor_key(x_api_key: str = FastAPIHeader(alias="X-API-Key", default="")):
    key_doc = await db.settings.find_one({"_id": "vendor_api_key"})
    if not key_doc or x_api_key != key_doc["key"]:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True

async def distribute_lead(source: str):
    """Auto-distribute lead to agent based on source+weight rules"""
    rules = await db.distribution_rules.find({"source": source, "enabled": True}, {"_id": 0}).to_list(None)
    if not rules:
        rules = await db.distribution_rules.find({"source": "default", "enabled": True}, {"_id": 0}).to_list(None)
    if not rules:
        return ""
    # Weighted random selection
    import random
    total_weight = sum(r.get("weight", 1) for r in rules)
    if total_weight == 0:
        return ""
    pick = random.uniform(0, total_weight)
    current = 0
    for r in rules:
        current += r.get("weight", 1)
        if pick <= current:
            return r.get("agent_name", "")
    return rules[0].get("agent_name", "")

@api_router.post("/leads/incoming")
async def receive_vendor_lead(data: VendorLeadInput, _: bool = Depends(verify_vendor_key)):
    """Public endpoint for vendors to post leads"""
    v_year = data.vehicle_year or (data.vehicle.get("year", "") if data.vehicle else "")
    v_make = data.vehicle_make or (data.vehicle.get("make", "") if data.vehicle else "")
    v_model = data.vehicle_model or (data.vehicle.get("model", "") if data.vehicle else "")

    p_city = data.pickup_city or ""
    p_state = data.pickup_state or ""
    p_zip = data.pickup_zip or ""
    d_city = data.delivery_city or ""
    d_state = data.delivery_state or ""
    d_zip = data.delivery_zip or ""
    if data.pickup and not p_city:
        p_city, p_state = parse_location(data.pickup)
    if data.delivery and not d_city:
        d_city, d_state = parse_location(data.delivery)

    source = data.source or data.lead_source_id or "vendor"
    assigned_agent = await distribute_lead(source)

    quote_number = await get_next_quote_number()
    quote_doc = {
        "id": str(uuid.uuid4()),
        "quote_number": quote_number,
        "agent_name": assigned_agent,
        "customer_name": data.name,
        "phone": data.phone or "",
        "phone2": data.phone2 or "",
        "email": data.email or "",
        "vehicle_year": str(v_year),
        "vehicle_make": str(v_make),
        "vehicle_model": str(v_model),
        "pickup_address": data.pickup or f"{p_city}, {p_state}".strip(", "),
        "pickup_city": p_city,
        "pickup_state": p_state,
        "pickup_zip": p_zip,
        "delivery_address": data.delivery or f"{d_city}, {d_state}".strip(", "),
        "delivery_city": d_city,
        "delivery_state": d_state,
        "delivery_zip": d_zip,
        "pickup_date": data.pickup_date or data.date or "",
        "running": data.running or "",
        "shipping_type": "standard",
        "price": 0,
        "deposit_fee": 150,
        "carrier_fee": 0,
        "source": source,
        "lead_source_id": data.lead_source_id or "",
        "status": "lead",
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.quotes.insert_one(quote_doc)
    quote_doc.pop("_id", None)

    # Log API usage
    await db.api_logs.insert_one({
        "type": "lead_intake", "source": source, "quote_number": quote_number,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    vehicle_str = " ".join(filter(None, [str(v_year), str(v_make), str(v_model)]))
    route_str = f"{p_city or '?'} → {d_city or '?'}"
    notif_doc = {
        "id": str(uuid.uuid4()), "type": "new_lead", "title": "New Lead Received",
        "message": f"{data.name} - {vehicle_str} - {route_str}",
        "quote_id": quote_doc["id"], "quote_number": quote_number,
        "customer_name": data.name, "route": route_str, "vehicle": vehicle_str,
        "is_read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notif_doc)
    notif_doc.pop("_id", None)
    await sse_manager.broadcast("new_lead", {"notification": notif_doc, "quote": quote_doc})

    return {"status": "success", "message": "Lead received", "quote_number": quote_number, "quote_id": quote_doc["id"]}


# Public specs - NO AUTH required
@api_router.get("/leads/specs")
async def get_lead_posting_specs():
    """Public API documentation for vendors - no login required"""
    key_doc = await db.settings.find_one({"_id": "vendor_api_key"})
    api_key = key_doc["key"] if key_doc else "CONTACT_ADMIN"
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "https://crm.breamway.com")
    return {
        "endpoint": f"{base_url}/api/leads/incoming",
        "method": "POST",
        "content_type": "application/json",
        "authentication": {"type": "API Key", "header": "X-API-Key", "key": api_key},
        "required_fields": ["name"],
        "all_fields": {
            "name": "Customer Name (required)",
            "phone": "Phone Number", "phone2": "Phone 2 (alternate)",
            "email": "Email Address",
            "vehicle_year": "Vehicle Year", "vehicle_make": "Vehicle Make", "vehicle_model": "Vehicle Model",
            "vehicle": "OR pass as object: {year, make, model}",
            "pickup": "Pickup Location (e.g. 'Los Angeles, CA')",
            "pickup_city": "Pickup City", "pickup_state": "Pickup State", "pickup_zip": "Pickup Zip",
            "delivery": "Delivery Location (e.g. 'Houston, TX')",
            "delivery_city": "Delivery City", "delivery_state": "Delivery State", "delivery_zip": "Delivery Zip",
            "pickup_date": "Pickup Date", "date": "Alias for pickup_date",
            "running": "Running condition (yes/no)",
            "lead_source_id": "Lead Source ID",
            "source": "Source name (e.g. TOLM, CarrierSoft)",
            "notes": "Additional notes",
        },
        "sample_request": {
            "name": "John Doe", "phone": "1234567890", "phone2": "9876543210",
            "email": "john@example.com",
            "vehicle_year": "2020", "vehicle_make": "Toyota", "vehicle_model": "Camry",
            "pickup_city": "Los Angeles", "pickup_state": "CA", "pickup_zip": "90001",
            "delivery_city": "Houston", "delivery_state": "TX", "delivery_zip": "77001",
            "pickup_date": "2026-02-15", "running": "yes",
            "lead_source_id": "TOLM-12345", "source": "TOLM",
            "notes": "Customer prefers morning pickup"
        },
        "sample_response_success": {"status": "success", "message": "Lead received", "quote_number": "BR040001"},
        "sample_response_error": {"detail": "Invalid API key"},
    }


# ==================== ADMIN CONTROL PANEL ====================

@api_router.get("/admin/api-logs")
async def get_api_logs(limit: int = 100, current_user: User = Depends(require_superadmin)):
    logs = await db.api_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    total = await db.api_logs.count_documents({})
    return {"logs": logs, "total": total}

@api_router.get("/admin/lead-sources")
async def get_lead_sources(current_user: User = Depends(require_superadmin)):
    sources = await db.quotes.distinct("source")
    result = []
    for s in sources:
        if s:
            count = await db.quotes.count_documents({"source": s})
            result.append({"name": s, "count": count})
    return sorted(result, key=lambda x: x["count"], reverse=True)


# ==================== LEAD DISTRIBUTION ====================

@api_router.get("/admin/distribution")
async def get_distribution_rules(current_user: User = Depends(require_superadmin)):
    rules = await db.distribution_rules.find({}, {"_id": 0}).to_list(None)
    return rules

@api_router.post("/admin/distribution")
async def upsert_distribution_rule(
    agent_name: str, source: str, weight: int = 1, enabled: bool = True,
    current_user: User = Depends(require_superadmin)
):
    await db.distribution_rules.update_one(
        {"agent_name": agent_name, "source": source},
        {"$set": {"agent_name": agent_name, "source": source, "weight": weight, "enabled": enabled}},
        upsert=True
    )
    return {"message": "Rule saved"}

@api_router.delete("/admin/distribution")
async def delete_distribution_rule(
    agent_name: str, source: str,
    current_user: User = Depends(require_superadmin)
):
    await db.distribution_rules.delete_one({"agent_name": agent_name, "source": source})
    return {"message": "Rule deleted"}


# ==================== CHAT SYSTEM ====================

# Ensure uploads directory exists
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@api_router.post("/chat/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a file for chat (images, PDFs, small files). Max 10MB."""
    max_size = 10 * 1024 * 1024  # 10MB
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
    file_id = str(uuid.uuid4())
    ext = Path(file.filename or "file").suffix
    stored_name = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / stored_name
    with open(file_path, "wb") as f:
        f.write(contents)
    file_url = f"/api/chat/files/{stored_name}"
    # Determine file type
    content_type = file.content_type or ""
    if content_type.startswith("image/"):
        file_type = "image"
    else:
        file_type = "file"
    return {"file_url": file_url, "file_name": file.filename, "file_type": file_type}

@api_router.get("/chat/files/{filename}")
async def serve_chat_file(filename: str):
    """Serve uploaded chat files."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))

@api_router.post("/chat/groups")
async def create_chat_group(data: ChatGroupCreateInput, current_user: User = Depends(get_current_user)):
    """Create a custom chat group."""
    group_id = f"group-{str(uuid.uuid4())[:8]}"
    # Ensure creator is in member list
    member_ids = list(set(data.member_ids + [current_user.id]))
    group_doc = {
        "id": group_id,
        "name": data.name,
        "type": "group",
        "member_ids": member_ids,
        "created_by": current_user.id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_groups.insert_one(group_doc)
    group_doc.pop("_id", None)
    return group_doc

@api_router.get("/chat/groups")
async def get_chat_groups(current_user: User = Depends(get_current_user)):
    """Get all chat groups the user is a member of."""
    groups = await db.chat_groups.find(
        {"member_ids": current_user.id}, {"_id": 0}
    ).to_list(None)
    return groups

@api_router.get("/chat/users/search")
async def search_chat_users(q: str = "", current_user: User = Depends(get_current_user)):
    """Search users for DM or group creation."""
    query = {"is_active": True, "id": {"$ne": current_user.id}}
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"username": {"$regex": q, "$options": "i"}},
        ]
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(50)
    return [{"id": u["id"], "full_name": u.get("full_name", u.get("username", "")), "username": u.get("username", ""), "role": u.get("role", "")} for u in users]

@api_router.post("/chat/send")
async def send_message(msg: ChatMessageInput, current_user: User = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user.id,
        "sender_name": current_user.full_name,
        "receiver_id": msg.receiver_id,
        "channel": msg.channel,
        "text": msg.text,
        "file_name": msg.file_name,
        "file_url": msg.file_url,
        "file_type": msg.file_type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    await sse_manager.broadcast("chat_message", {"message": doc})
    return doc

@api_router.get("/chat/messages")
async def get_chat_messages(
    channel: str = "all-team", limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    messages = await db.chat_messages.find({"channel": channel}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    messages.reverse()
    return messages

@api_router.get("/chat/channels")
async def get_chat_channels(current_user: User = Depends(get_current_user)):
    users = await db.users.find({"is_active": True}, {"_id": 0, "id": 1, "full_name": 1, "role": 1, "username": 1}).to_list(None)
    channels = [{"id": "all-team", "name": "All Team", "type": "group"}]
    # Add custom groups
    custom_groups = await db.chat_groups.find({"member_ids": current_user.id}, {"_id": 0}).to_list(None)
    for g in custom_groups:
        channels.append({"id": g["id"], "name": g["name"], "type": "group", "is_custom": True, "member_ids": g.get("member_ids", [])})
    # Add DM channels
    for u in users:
        if u["id"] != current_user.id:
            dm_id = "-".join(sorted([current_user.id, u["id"]]))
            channels.append({"id": f"dm-{dm_id}", "name": u["full_name"], "type": "dm", "user_id": u["id"]})
    # Unread counts
    for ch in channels:
        ch["unread"] = await db.chat_messages.count_documents({
            "channel": ch["id"], "is_read": False,
            "sender_id": {"$ne": current_user.id}
        })
    return channels

@api_router.post("/chat/read")
async def mark_chat_read(channel: str, current_user: User = Depends(get_current_user)):
    await db.chat_messages.update_many(
        {"channel": channel, "sender_id": {"$ne": current_user.id}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}


# ==================== NOTIFICATIONS & SSE ====================

@api_router.get("/notifications")
async def get_notifications(
    limit: int = 50, unread_only: bool = False,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if unread_only:
        query["is_read"] = False
    notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread_count = await db.notifications.count_documents({"is_read": False})
    return {"notifications": notifs, "unread_count": unread_count}

@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_user: User = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id}, {"$set": {"is_read": True}})
    return {"message": "Marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many({"is_read": False}, {"$set": {"is_read": True}})
    return {"message": "All marked as read"}

@api_router.get("/notifications/stream")
async def notification_stream(request: Request, token: str = ""):
    """SSE endpoint for real-time notifications"""
    # Validate JWT token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    client_id = f"{username}-{uuid.uuid4().hex[:8]}"

    async def event_generator():
        queue = sse_manager.connect(client_id)
        try:
            # Send initial connected event
            yield f"data: {json.dumps({'type': 'connected', 'client_id': client_id})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_manager.disconnect(client_id)

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # Disable nginx buffering
    })


# ==================== SETUP ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
