from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security - use bcrypt directly
SECRET_KEY = os.getenv("SECRET_KEY", "breamway-crm-secret-key-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Breamway TMS API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== MODELS ====================

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "staff"  # superadmin, admin, staff
    company: str = "Breamway.com"
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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class LeadBase(BaseModel):
    customer_name: str
    phone: str
    email: EmailStr
    phone2: Optional[str] = None
    company_name: Optional[str] = None
    vehicle_year: int
    vehicle_make: str
    vehicle_model: str
    vehicle_type: str
    vehicle_color: Optional[str] = None
    vehicle_vin: Optional[str] = None
    vehicle_license: Optional[str] = None
    vehicle_state: Optional[str] = None
    running_status: str = "Running"
    modifications: List[str] = []
    quote_source: Optional[str] = None
    status: str = "new"
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class LeadCreate(LeadBase):
    pass

class Lead(LeadBase):
    id: str
    created_at: datetime
    updated_at: datetime

class QuoteBase(BaseModel):
    lead_id: str
    pickup_location: str
    pickup_city: str
    pickup_state: str
    pickup_zip: Optional[str] = None
    delivery_location: str
    delivery_city: str
    delivery_state: str
    delivery_zip: Optional[str] = None
    pickup_date_from: Optional[datetime] = None
    pickup_date_to: Optional[datetime] = None
    delivery_date_from: Optional[datetime] = None
    delivery_date_to: Optional[datetime] = None
    distance: float
    vehicle_type: str
    deposit_fee: float = 150
    carrier_fee: float = 0
    price: float
    service_level: str = "standard"
    status: str = "pending"
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    id: str
    quote_number: str
    created_at: datetime
    updated_at: datetime

class OrderBase(BaseModel):
    quote_id: str
    status: str = "pending"
    pickup_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    actual_pickup_date: Optional[datetime] = None
    actual_delivery_date: Optional[datetime] = None
    carrier_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    truck_number: Optional[str] = None
    trailer_number: Optional[str] = None
    bol_number: Optional[str] = None
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    assigned_to: Optional[str] = None

class OrderCreate(OrderBase):
    pass

class Order(OrderBase):
    id: str
    order_number: str
    created_at: datetime
    updated_at: datetime

class CarrierBase(BaseModel):
    name: str
    phone: str
    email: EmailStr
    mc_number: Optional[str] = None
    dot_number: Optional[str] = None
    insurance_company: Optional[str] = None
    insurance_policy: Optional[str] = None
    insurance_expiry: Optional[datetime] = None
    contact_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    active_shipments: int = 0
    rating: float = 5.0
    status: str = "active"
    notes: Optional[str] = None

class CarrierCreate(CarrierBase):
    pass

class Carrier(CarrierBase):
    id: str
    created_at: datetime
    updated_at: datetime

class InvoiceBase(BaseModel):
    order_id: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    deposit_amount: float = 0
    carrier_pay: float = 0
    amount: float
    tax_amount: float = 0
    discount_amount: float = 0
    total_amount: float = 0
    status: str = "unpaid"
    due_date: datetime
    paid_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    id: str
    invoice_number: str
    created_at: datetime
    updated_at: datetime

class CompanySettings(BaseModel):
    company_name: str = "Breamway.com"
    company_email: str = "info@breamway.com"
    company_phone: str = ""
    company_address: str = ""
    logo_url: Optional[str] = None
    primary_color: str = "#2563EB"
    invoice_terms: str = "Payment due within 30 days"
    invoice_notes: str = ""

class DashboardStats(BaseModel):
    total_leads: int
    total_quotes: int
    total_orders: int
    total_revenue: float
    pending_quotes: int
    active_orders: int
    delivered_orders: int
    unpaid_invoices: int
    total_users: int
    total_carriers: int


# ==================== AUTHENTICATION ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate, current_user: User = Depends(require_superadmin)):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    user_dict["password"] = get_password_hash(user.password)
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    
    return User(**user_dict)

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"username": user_login.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(**user)
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ==================== USER MANAGEMENT (Superadmin only) ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_superadmin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(None)
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str, current_user: User = Depends(require_superadmin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate, current_user: User = Depends(require_superadmin)):
    existing_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = {k: v for k, v in user_update.model_dump().items() if v is not None}
    
    if "password" in update_dict:
        update_dict["password"] = get_password_hash(update_dict["password"])
    
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(require_superadmin)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}


# ==================== COMPANY SETTINGS ====================

@api_router.get("/settings/company", response_model=CompanySettings)
async def get_company_settings(current_user: User = Depends(get_current_user)):
    settings = await db.company_settings.find_one({}, {"_id": 0})
    if not settings:
        return CompanySettings()
    return CompanySettings(**settings)

@api_router.put("/settings/company", response_model=CompanySettings)
async def update_company_settings(settings: CompanySettings, current_user: User = Depends(require_superadmin)):
    await db.company_settings.update_one(
        {},
        {"$set": settings.model_dump()},
        upsert=True
    )
    return settings


# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_leads = await db.leads.count_documents({})
    total_quotes = await db.quotes.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_quotes = await db.quotes.count_documents({"status": "pending"})
    active_orders = await db.orders.count_documents({"status": {"$in": ["assigned", "in_transit"]}})
    delivered_orders = await db.orders.count_documents({"status": "delivered"})
    unpaid_invoices = await db.invoices.count_documents({"status": "unpaid"})
    total_users = await db.users.count_documents({})
    total_carriers = await db.carriers.count_documents({})
    
    paid_invoices = await db.invoices.find({"status": "paid"}, {"_id": 0, "amount": 1}).to_list(None)
    total_revenue = sum([inv["amount"] for inv in paid_invoices])
    
    return DashboardStats(
        total_leads=total_leads,
        total_quotes=total_quotes,
        total_orders=total_orders,
        total_revenue=total_revenue,
        pending_quotes=pending_quotes,
        active_orders=active_orders,
        delivered_orders=delivered_orders,
        unpaid_invoices=unpaid_invoices,
        total_users=total_users,
        total_carriers=total_carriers
    )


# ==================== LEAD ROUTES ====================

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead: LeadCreate, current_user: User = Depends(get_current_user)):
    lead_dict = lead.model_dump()
    lead_dict["id"] = str(uuid.uuid4())
    lead_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    lead_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.insert_one(lead_dict)
    return Lead(**lead_dict)

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"vehicle_make": {"$regex": search, "$options": "i"}},
            {"vehicle_model": {"$regex": search, "$options": "i"}}
        ]
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Lead(**lead) for lead in leads]

@api_router.get("/leads/count/total")
async def get_leads_count(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    count = await db.leads.count_documents(query)
    return {"total": count}

@api_router.get("/leads/{lead_id}", response_model=Lead)
async def get_lead(lead_id: str, current_user: User = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return Lead(**lead)

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead_update: LeadCreate, current_user: User = Depends(get_current_user)):
    existing_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not existing_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_dict = lead_update.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.update_one({"id": lead_id}, {"$set": update_dict})
    
    updated_lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return Lead(**updated_lead)

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: User = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted successfully"}


# ==================== QUOTE ROUTES ====================

@api_router.post("/quotes", response_model=Quote)
async def create_quote(quote: QuoteCreate, current_user: User = Depends(get_current_user)):
    lead = await db.leads.find_one({"id": quote.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    quote_dict = quote.model_dump()
    quote_dict["id"] = str(uuid.uuid4())
    quote_dict["quote_number"] = f"Q-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    quote_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    quote_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    for field in ["pickup_date_from", "pickup_date_to", "delivery_date_from", "delivery_date_to"]:
        if quote_dict.get(field):
            quote_dict[field] = quote_dict[field].isoformat()
    
    await db.quotes.insert_one(quote_dict)
    await db.leads.update_one({"id": quote.lead_id}, {"$set": {"status": "quoted", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    return Quote(**quote_dict)

@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes(
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    # Build query
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"quote_number": {"$regex": search, "$options": "i"}},
            {"pickup_city": {"$regex": search, "$options": "i"}},
            {"delivery_city": {"$regex": search, "$options": "i"}},
            {"assigned_to": {"$regex": search, "$options": "i"}}
        ]
    
    quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [Quote(**quote) for quote in quotes]

@api_router.get("/quotes/count/total")
async def get_quotes_count(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    if search:
        query["$or"] = [
            {"quote_number": {"$regex": search, "$options": "i"}},
            {"pickup_city": {"$regex": search, "$options": "i"}},
            {"delivery_city": {"$regex": search, "$options": "i"}},
            {"assigned_to": {"$regex": search, "$options": "i"}}
        ]
    count = await db.quotes.count_documents(query)
    return {"total": count}

@api_router.get("/quotes/agents/list")
async def get_quotes_agents(current_user: User = Depends(get_current_user)):
    """Get unique list of assigned agents"""
    agents = await db.quotes.distinct("assigned_to")
    return [a for a in agents if a]

@api_router.get("/quotes/{quote_id}", response_model=Quote)
async def get_quote(quote_id: str, current_user: User = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return Quote(**quote)

@api_router.put("/quotes/{quote_id}", response_model=Quote)
async def update_quote(quote_id: str, quote_update: QuoteCreate, current_user: User = Depends(get_current_user)):
    existing_quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    if not existing_quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    update_dict = quote_update.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    for field in ["pickup_date_from", "pickup_date_to", "delivery_date_from", "delivery_date_to"]:
        if update_dict.get(field):
            update_dict[field] = update_dict[field].isoformat()
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_dict})
    
    updated_quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return Quote(**updated_quote)

@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, current_user: User = Depends(get_current_user)):
    result = await db.quotes.delete_one({"id": quote_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Quote deleted successfully"}


# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate, current_user: User = Depends(get_current_user)):
    quote = await db.quotes.find_one({"id": order.quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    order_dict = order.model_dump()
    order_dict["id"] = str(uuid.uuid4())
    order_dict["order_number"] = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    order_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    order_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    for field in ["pickup_date", "delivery_date", "actual_pickup_date", "actual_delivery_date"]:
        if order_dict.get(field):
            order_dict[field] = order_dict[field].isoformat()
    
    await db.orders.insert_one(order_dict)
    await db.quotes.update_one({"id": order.quote_id}, {"$set": {"status": "converted", "updated_at": datetime.now(timezone.utc).isoformat()}})
    await db.leads.update_one({"id": quote["lead_id"]}, {"$set": {"status": "converted", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    return Order(**order_dict)

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_update: OrderCreate, current_user: User = Depends(get_current_user)):
    existing_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not existing_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_dict = order_update.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    for field in ["pickup_date", "delivery_date", "actual_pickup_date", "actual_delivery_date"]:
        if update_dict.get(field):
            update_dict[field] = update_dict[field].isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_dict})
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return Order(**updated_order)

@api_router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: User = Depends(get_current_user)):
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted successfully"}


# ==================== CARRIER ROUTES ====================

@api_router.post("/carriers", response_model=Carrier)
async def create_carrier(carrier: CarrierCreate, current_user: User = Depends(get_current_user)):
    carrier_dict = carrier.model_dump()
    carrier_dict["id"] = str(uuid.uuid4())
    carrier_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    carrier_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if carrier_dict.get("insurance_expiry"):
        carrier_dict["insurance_expiry"] = carrier_dict["insurance_expiry"].isoformat()
    
    await db.carriers.insert_one(carrier_dict)
    return Carrier(**carrier_dict)

@api_router.get("/carriers", response_model=List[Carrier])
async def get_carriers(current_user: User = Depends(get_current_user)):
    carriers = await db.carriers.find({}, {"_id": 0}).sort("name", 1).to_list(None)
    return [Carrier(**carrier) for carrier in carriers]

@api_router.get("/carriers/{carrier_id}", response_model=Carrier)
async def get_carrier(carrier_id: str, current_user: User = Depends(get_current_user)):
    carrier = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    if not carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return Carrier(**carrier)

@api_router.put("/carriers/{carrier_id}", response_model=Carrier)
async def update_carrier(carrier_id: str, carrier_update: CarrierCreate, current_user: User = Depends(get_current_user)):
    existing_carrier = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    if not existing_carrier:
        raise HTTPException(status_code=404, detail="Carrier not found")
    
    update_dict = carrier_update.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_dict.get("insurance_expiry"):
        update_dict["insurance_expiry"] = update_dict["insurance_expiry"].isoformat()
    
    await db.carriers.update_one({"id": carrier_id}, {"$set": update_dict})
    
    updated_carrier = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    return Carrier(**updated_carrier)

@api_router.delete("/carriers/{carrier_id}")
async def delete_carrier(carrier_id: str, current_user: User = Depends(get_current_user)):
    result = await db.carriers.delete_one({"id": carrier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Carrier not found")
    return {"message": "Carrier deleted successfully"}


# ==================== INVOICE ROUTES ====================

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice: InvoiceCreate, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({"id": invoice.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    invoice_dict = invoice.model_dump()
    invoice_dict["id"] = str(uuid.uuid4())
    invoice_dict["invoice_number"] = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    invoice_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    invoice_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate total
    invoice_dict["total_amount"] = invoice_dict["amount"] + invoice_dict["tax_amount"] - invoice_dict["discount_amount"]
    
    # Serialize datetime fields
    if invoice_dict.get("due_date"):
        invoice_dict["due_date"] = invoice_dict["due_date"].isoformat()
    if invoice_dict.get("paid_date"):
        invoice_dict["paid_date"] = invoice_dict["paid_date"].isoformat()
    
    await db.invoices.insert_one(invoice_dict)
    return Invoice(**invoice_dict)

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return [Invoice(**invoice) for invoice in invoices]

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return Invoice(**invoice)

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, invoice_update: InvoiceCreate, current_user: User = Depends(get_current_user)):
    existing_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_dict = invoice_update.model_dump()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Calculate total
    update_dict["total_amount"] = update_dict["amount"] + update_dict["tax_amount"] - update_dict["discount_amount"]
    
    # If status changed to paid, set paid_date
    if update_dict["status"] == "paid" and existing_invoice["status"] != "paid":
        update_dict["paid_date"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    if update_dict.get("due_date"):
        if hasattr(update_dict["due_date"], 'isoformat'):
            update_dict["due_date"] = update_dict["due_date"].isoformat()
    if update_dict.get("paid_date"):
        if hasattr(update_dict["paid_date"], 'isoformat'):
            update_dict["paid_date"] = update_dict["paid_date"].isoformat()
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_dict})
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return Invoice(**updated_invoice)

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
