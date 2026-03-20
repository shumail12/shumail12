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
from passlib.context import CryptContext
from jose import JWTError, jwt
from twilio.rest import Client


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security = HTTPBearer()

# Twilio Client (optional - will initialize if credentials provided)
twilio_client = None
if os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"):
    twilio_client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ==================== MODELS ====================

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "staff"  # admin, staff

class UserCreate(UserBase):
    password: str

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
    vehicle_year: int
    vehicle_make: str
    vehicle_model: str
    vehicle_type: str  # sedan, suv, truck, motorcycle, etc.
    status: str = "new"  # new, contacted, quoted, converted, lost
    notes: Optional[str] = None

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
    delivery_location: str
    delivery_city: str
    delivery_state: str
    distance: float  # in miles
    vehicle_type: str
    price: float
    status: str = "pending"  # pending, approved, rejected, converted
    notes: Optional[str] = None

class QuoteCreate(QuoteBase):
    pass

class Quote(QuoteBase):
    id: str
    quote_number: str
    created_at: datetime
    updated_at: datetime

class OrderBase(BaseModel):
    quote_id: str
    status: str = "pending"  # pending, assigned, in_transit, delivered, cancelled
    pickup_date: Optional[datetime] = None
    delivery_date: Optional[datetime] = None
    carrier_id: Optional[str] = None
    notes: Optional[str] = None

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
    mc_number: Optional[str] = None  # Motor Carrier number
    insurance_expiry: Optional[datetime] = None
    active_shipments: int = 0
    status: str = "active"  # active, inactive

class CarrierCreate(CarrierBase):
    pass

class Carrier(CarrierBase):
    id: str
    created_at: datetime
    updated_at: datetime

class InvoiceBase(BaseModel):
    order_id: str
    amount: float
    status: str = "unpaid"  # unpaid, paid, overdue
    due_date: datetime
    paid_date: Optional[datetime] = None
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    id: str
    invoice_number: str
    created_at: datetime
    updated_at: datetime

class DashboardStats(BaseModel):
    total_leads: int
    total_quotes: int
    total_orders: int
    total_revenue: float
    pending_quotes: int
    active_orders: int
    delivered_orders: int
    unpaid_invoices: int


# ==================== AUTHENTICATION ====================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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


# ==================== SMS NOTIFICATIONS ====================

async def send_sms(to_phone: str, message: str):
    """Send SMS notification via Twilio"""
    if not twilio_client:
        logging.warning("Twilio not configured. SMS not sent.")
        return False
    
    try:
        from_phone = os.getenv("TWILIO_PHONE_NUMBER")
        if not from_phone:
            logging.error("TWILIO_PHONE_NUMBER not configured")
            return False
        
        message = twilio_client.messages.create(
            body=message,
            from_=from_phone,
            to=to_phone
        )
        logging.info(f"SMS sent: {message.sid}")
        return True
    except Exception as e:
        logging.error(f"Error sending SMS: {str(e)}")
        return False


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
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
    
    return User(
        id=user_dict["id"],
        username=user_dict["username"],
        email=user_dict["email"],
        full_name=user_dict["full_name"],
        role=user_dict["role"],
        created_at=user_dict["created_at"]
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_login: UserLogin):
    user = await db.users.find_one({"username": user_login.username}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    if not verify_password(user_login.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
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


# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Count documents
    total_leads = await db.leads.count_documents({})
    total_quotes = await db.quotes.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_quotes = await db.quotes.count_documents({"status": "pending"})
    active_orders = await db.orders.count_documents({"status": {"$in": ["assigned", "in_transit"]}})
    delivered_orders = await db.orders.count_documents({"status": "delivered"})
    unpaid_invoices = await db.invoices.count_documents({"status": "unpaid"})
    
    # Calculate total revenue from paid invoices
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
        unpaid_invoices=unpaid_invoices
    )


# ==================== LEAD ROUTES ====================

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead: LeadCreate, current_user: User = Depends(get_current_user)):
    lead_dict = lead.model_dump()
    lead_dict["id"] = str(uuid.uuid4())
    lead_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    lead_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.insert_one(lead_dict)
    
    # Send SMS notification
    message = f"New lead received: {lead.customer_name} - {lead.vehicle_year} {lead.vehicle_make} {lead.vehicle_model}"
    await send_sms(lead.phone, f"Thank you for contacting us! We'll reach out shortly. - Auto Transport CRM")
    
    return Lead(**lead_dict)

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(current_user: User = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return [Lead(**lead) for lead in leads]

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
    # Verify lead exists
    lead = await db.leads.find_one({"id": quote.lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    quote_dict = quote.model_dump()
    quote_dict["id"] = str(uuid.uuid4())
    quote_dict["quote_number"] = f"Q-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    quote_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    quote_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.quotes.insert_one(quote_dict)
    
    # Update lead status to quoted
    await db.leads.update_one({"id": quote.lead_id}, {"$set": {"status": "quoted", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    # Send SMS notification
    message = f"Quote {quote_dict['quote_number']}: ${quote.price} for transport from {quote.pickup_city} to {quote.delivery_city}"
    await send_sms(lead["phone"], message)
    
    return Quote(**quote_dict)

@api_router.get("/quotes", response_model=List[Quote])
async def get_quotes(current_user: User = Depends(get_current_user)):
    quotes = await db.quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return [Quote(**quote) for quote in quotes]

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
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_dict})
    
    updated_quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
    return Quote(**updated_quote)


# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate, current_user: User = Depends(get_current_user)):
    # Verify quote exists
    quote = await db.quotes.find_one({"id": order.quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    order_dict = order.model_dump()
    order_dict["id"] = str(uuid.uuid4())
    order_dict["order_number"] = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    order_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    order_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    if order_dict.get("pickup_date"):
        order_dict["pickup_date"] = order_dict["pickup_date"].isoformat()
    if order_dict.get("delivery_date"):
        order_dict["delivery_date"] = order_dict["delivery_date"].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Update quote status to converted
    await db.quotes.update_one({"id": order.quote_id}, {"$set": {"status": "converted", "updated_at": datetime.now(timezone.utc).isoformat()}})
    
    # Update lead status to converted
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
    if update_dict.get("pickup_date"):
        update_dict["pickup_date"] = update_dict["pickup_date"].isoformat()
    if update_dict.get("delivery_date"):
        update_dict["delivery_date"] = update_dict["delivery_date"].isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_dict})
    
    # Send SMS notification if status changed
    if update_dict.get("status") != existing_order.get("status"):
        quote = await db.quotes.find_one({"id": existing_order["quote_id"]}, {"_id": 0})
        if quote:
            lead = await db.leads.find_one({"id": quote["lead_id"]}, {"_id": 0})
            if lead:
                status_messages = {
                    "assigned": "Your shipment has been assigned to a carrier.",
                    "in_transit": "Your vehicle is now in transit!",
                    "delivered": "Your vehicle has been delivered. Thank you!"
                }
                if update_dict["status"] in status_messages:
                    await send_sms(lead["phone"], f"Order {existing_order['order_number']}: {status_messages[update_dict['status']]}")
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return Order(**updated_order)


# ==================== CARRIER ROUTES ====================

@api_router.post("/carriers", response_model=Carrier)
async def create_carrier(carrier: CarrierCreate, current_user: User = Depends(get_current_user)):
    carrier_dict = carrier.model_dump()
    carrier_dict["id"] = str(uuid.uuid4())
    carrier_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    carrier_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
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
    
    # Serialize datetime fields
    if update_dict.get("insurance_expiry"):
        update_dict["insurance_expiry"] = update_dict["insurance_expiry"].isoformat()
    
    await db.carriers.update_one({"id": carrier_id}, {"$set": update_dict})
    
    updated_carrier = await db.carriers.find_one({"id": carrier_id}, {"_id": 0})
    return Carrier(**updated_carrier)


# ==================== INVOICE ROUTES ====================

@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice: InvoiceCreate, current_user: User = Depends(get_current_user)):
    # Verify order exists
    order = await db.orders.find_one({"id": invoice.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    invoice_dict = invoice.model_dump()
    invoice_dict["id"] = str(uuid.uuid4())
    invoice_dict["invoice_number"] = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    invoice_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    invoice_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
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
    
    # If status changed to paid, set paid_date
    if update_dict["status"] == "paid" and existing_invoice["status"] != "paid":
        update_dict["paid_date"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize datetime fields
    if update_dict.get("due_date"):
        update_dict["due_date"] = update_dict["due_date"].isoformat()
    if update_dict.get("paid_date"):
        update_dict["paid_date"] = update_dict["paid_date"].isoformat()
    
    await db.invoices.update_one({"id": invoice_id}, {"$set": update_dict})
    
    updated_invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    return Invoice(**updated_invoice)


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