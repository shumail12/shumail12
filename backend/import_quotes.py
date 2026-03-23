"""Import both CSV files into unified quotes collection with BR format IDs"""
import asyncio
import csv
import re
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid

load_dotenv()

def parse_price(price_str):
    if not price_str:
        return 0.0
    cleaned = re.sub(r'[,$]', '', str(price_str))
    try:
        return float(cleaned)
    except Exception:
        return 0.0

def parse_year(year_str):
    if not year_str:
        return ""
    cleaned = re.sub(r'[,\s]', '', str(year_str))
    try:
        return str(int(float(cleaned)))
    except Exception:
        return str(year_str).strip()

def extract_city_state(location):
    if not location:
        return '', ''
    parts = location.split(',')
    if len(parts) >= 2:
        return parts[0].strip(), parts[-1].strip()
    return location.strip(), ''

async def import_data():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]

    # Clear old data (keep users)
    print("Clearing old data...")
    await db.quotes.delete_many({})
    await db.leads.delete_many({})
    await db.orders.delete_many({})
    await db.invoices.delete_many({})
    await db.counters.delete_many({})
    print("Old data cleared.")

    quotes_to_import = []
    seq = 0

    # File 1: Breamway All Quotes Data.csv (37k records)
    file1 = '/tmp/breamway_all_quotes.csv'
    if os.path.exists(file1):
        print(f"Reading {file1}...")
        with open(file1, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get('Name') or '').strip()
                if not name:
                    continue
                seq += 1
                pickup_city, pickup_state = extract_city_state(row.get('Pickup', ''))
                delivery_city, delivery_state = extract_city_state(row.get('Delivery', ''))

                quotes_to_import.append({
                    "id": str(uuid.uuid4()),
                    "quote_number": f"BR{seq:06d}",
                    "agent_name": (row.get('Sales Agent') or '').strip(),
                    "customer_name": name,
                    "phone": (row.get('Phone') or '').strip(),
                    "email": (row.get('Email Address') or '').strip(),
                    "vehicle_year": parse_year(row.get('Year', '')),
                    "vehicle_make": (row.get('Make') or '').strip(),
                    "vehicle_model": (row.get('Model') or '').strip(),
                    "pickup_address": (row.get('Pickup') or '').strip(),
                    "pickup_city": pickup_city,
                    "pickup_state": pickup_state,
                    "delivery_address": (row.get('Delivery') or '').strip(),
                    "delivery_city": delivery_city,
                    "delivery_state": delivery_state,
                    "pickup_date": (row.get('Pickup Date') or '').strip() or None,
                    "shipping_type": "standard",
                    "price": parse_price(row.get('Total Price', '0')),
                    "deposit_fee": parse_price(row.get('Deposit Fee', '150')),
                    "carrier_fee": parse_price(row.get('Carrier Fee', '0')),
                    "source": (row.get('Lead Source') or '').strip(),
                    "status": "quoted",
                    "notes": "",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        print(f"  Parsed {seq} records from file 1")

    # File 2: export(2).csv (2.6k records)
    file2 = '/tmp/export2.csv'
    if os.path.exists(file2):
        print(f"Reading {file2}...")
        count2 = 0
        with open(file2, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = (row.get('Name') or '').strip()
                if not name:
                    continue
                seq += 1
                count2 += 1
                pickup_city = (row.get('Pickup City') or '').strip()
                pickup_state = (row.get('Pickup State') or '').strip()
                delivery_city = (row.get('Delivery City') or '').strip()
                delivery_state = (row.get('Delivery State') or '').strip()

                quotes_to_import.append({
                    "id": str(uuid.uuid4()),
                    "quote_number": f"BR{seq:06d}",
                    "agent_name": (row.get('Sales Agent') or '').strip(),
                    "customer_name": name,
                    "phone": (row.get('Phone') or '').strip(),
                    "email": (row.get('Email Address') or '').strip(),
                    "vehicle_year": parse_year(row.get('Year', '')),
                    "vehicle_make": (row.get('Make') or '').strip(),
                    "vehicle_model": (row.get('Model') or '').strip(),
                    "pickup_address": f"{pickup_city}, {pickup_state}" if pickup_city else "",
                    "pickup_city": pickup_city,
                    "pickup_state": pickup_state,
                    "delivery_address": f"{delivery_city}, {delivery_state}" if delivery_city else "",
                    "delivery_city": delivery_city,
                    "delivery_state": delivery_state,
                    "pickup_date": (row.get('Pickup Date') or '').strip() or None,
                    "shipping_type": "standard",
                    "price": parse_price(row.get('Total Price', '0')),
                    "deposit_fee": 150.0,
                    "carrier_fee": 0.0,
                    "source": "",
                    "status": "quoted",
                    "notes": "",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                })
        print(f"  Parsed {count2} records from file 2")

    # Insert in batches of 5000
    print(f"\nInserting {len(quotes_to_import)} total quotes...")
    batch_size = 5000
    for i in range(0, len(quotes_to_import), batch_size):
        batch = quotes_to_import[i:i+batch_size]
        await db.quotes.insert_many(batch)
        print(f"  Inserted batch {i//batch_size + 1} ({len(batch)} records)")

    # Set counter to current seq
    await db.counters.update_one({"_id": "quote_seq"}, {"$set": {"seq": seq}}, upsert=True)
    await db.counters.update_one({"_id": "order_seq"}, {"$set": {"seq": 0}}, upsert=True)

    # Create indexes
    await db.quotes.create_index("quote_number", unique=True)
    await db.quotes.create_index([("created_at", -1)])
    await db.quotes.create_index("status")
    await db.quotes.create_index("agent_name")

    print(f"\nImport complete! Total quotes: {seq}")
    print(f"Quote IDs: BR000001 to BR{seq:06d}")
    client.close()

if __name__ == "__main__":
    asyncio.run(import_data())
