"""
Import quotes data from CSV into Breamway CRM
"""
import asyncio
import csv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import uuid
import re
from dotenv import load_dotenv

load_dotenv()

def parse_price(price_str):
    """Parse price string like '1,280.00' to float"""
    if not price_str:
        return 0.0
    # Remove commas and convert to float
    cleaned = re.sub(r'[,$]', '', str(price_str))
    try:
        return float(cleaned)
    except:
        return 0.0

def parse_date(date_str):
    """Parse date string like '1/09/2026' to ISO format"""
    if not date_str or date_str.strip() == '':
        return None
    try:
        # Try M/DD/YYYY format
        dt = datetime.strptime(date_str.strip(), '%m/%d/%Y')
        return dt.isoformat()
    except:
        try:
            # Try M/D/YYYY format
            dt = datetime.strptime(date_str.strip(), '%m/%d/%Y')
            return dt.isoformat()
        except:
            return None

def extract_city_state(location):
    """Extract city and state from 'City, ST' format"""
    if not location:
        return '', ''
    parts = location.split(',')
    if len(parts) >= 2:
        city = parts[0].strip()
        state = parts[1].strip()
        return city, state
    return location.strip(), ''

async def import_quotes():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Read CSV file
    quotes_to_import = []
    leads_to_import = []
    
    with open('/tmp/quotes_data.csv', 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Skip empty rows
            if not row.get('Name') or row.get('Name').strip() == '':
                continue
            
            # Create lead first
            lead_id = str(uuid.uuid4())
            pickup_city, pickup_state = extract_city_state(row.get('Pickup', ''))
            delivery_city, delivery_state = extract_city_state(row.get('Delivery', ''))
            
            lead = {
                "id": lead_id,
                "customer_name": row.get('Name', '').strip(),
                "phone": row.get('Phone', '').strip(),
                "email": row.get('Email Address', '').strip() or f"noemail_{lead_id[:8]}@placeholder.com",
                "phone2": "",
                "company_name": "",
                "vehicle_year": int(row.get('Year', '2020')) if row.get('Year', '').isdigit() else 2020,
                "vehicle_make": row.get('Make', '').strip(),
                "vehicle_model": row.get('Model', '').strip(),
                "vehicle_type": "Sedan",  # Default
                "vehicle_color": "",
                "vehicle_vin": "",
                "vehicle_license": "",
                "vehicle_state": "",
                "running_status": "Running",
                "modifications": [],
                "quote_source": row.get('Lead Source', '').strip(),
                "status": "quoted",
                "notes": "",
                "assigned_to": row.get('Sales Agent', '').strip(),
                "created_at": parse_date(row.get('Date Received', '')) or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            leads_to_import.append(lead)
            
            # Create quote
            quote_id = str(uuid.uuid4())
            quote_number = f"Q-{datetime.now().strftime('%Y%m%d')}-{quote_id[:8].upper()}"
            
            quote = {
                "id": quote_id,
                "lead_id": lead_id,
                "quote_number": quote_number,
                "pickup_location": "",
                "pickup_city": pickup_city,
                "pickup_state": pickup_state,
                "pickup_zip": "",
                "delivery_location": "",
                "delivery_city": delivery_city,
                "delivery_state": delivery_state,
                "delivery_zip": "",
                "pickup_date_from": parse_date(row.get('Pickup Date', '')),
                "pickup_date_to": None,
                "delivery_date_from": None,
                "delivery_date_to": None,
                "distance": 0,  # Not in CSV
                "vehicle_type": "Sedan",
                "deposit_fee": parse_price(row.get('Deposit Fee', '0')),
                "carrier_fee": parse_price(row.get('Carrier Fee', '0')),
                "price": parse_price(row.get('Total Price', '0')),
                "service_level": "standard",
                "status": "pending",
                "notes": "",
                "assigned_to": row.get('Sales Agent', '').strip(),
                "created_at": parse_date(row.get('Date Received', '')) or datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            quotes_to_import.append(quote)
    
    # Insert into database
    if leads_to_import:
        await db.leads.insert_many(leads_to_import)
        print(f"✅ Imported {len(leads_to_import)} leads")
    
    if quotes_to_import:
        await db.quotes.insert_many(quotes_to_import)
        print(f"✅ Imported {len(quotes_to_import)} quotes")
    
    # Also create staff users for each sales agent
    sales_agents = set()
    for lead in leads_to_import:
        if lead.get('assigned_to'):
            sales_agents.add(lead['assigned_to'])
    
    print(f"\n📋 Found {len(sales_agents)} sales agents in data:")
    for agent in sorted(sales_agents):
        print(f"   - {agent}")
    
    client.close()
    print(f"\n🎉 Import complete!")

if __name__ == "__main__":
    asyncio.run(import_quotes())
