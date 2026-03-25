# Breamway Auto Transport CRM - Product Requirements Document

## Original Problem Statement
CRM for auto transport brokerage company (Shumail Technologies LLC / Breamway Auto Transport). Core features: lead processing, dispatch, quotes, tracking, invoicing, reporting, SMS text notifications.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor Async)
- **Auth**: JWT-based (bcrypt), Super Admin role
- **Real-time**: SSE for notifications and chat

## Credentials
- Superadmin: `shumail.s` / `HONDA@2026`, Security Answer: `Shark`

## What's Been Implemented

### Phase 1 - Core CRM (DONE)
- JWT Auth with self-healing bcrypt
- Dashboard with stats
- Leads -> Quotes -> Orders workflow
- Carriers management, Invoice system, User management
- Auto-import of ~39.8k legacy records from CSV

### Phase 2 - Real-time & Vendor Integration (DONE)
- SSE-based real-time notifications
- Vendor Lead Intake API (POST /api/leads/incoming with X-API-Key)

### Phase 3 - Chat, Admin Panel, Agreements (DONE - March 25, 2026)
- Internal Chat System: 1-on-1 DM + All Team + custom groups + file upload + user search
- Admin Control Panel: API keys, lead distribution, lead sources, API logs
- Agreement/Contract System: digital signature, public signing, status flow

### Phase 4 - Pricing Engine & Route Intelligence (DONE - March 25, 2026)
- **Editable Pricing for 3 Shipping Types**: Standard ($0.75/mi), Expedited ($0.95/mi), Enclosed ($1.00/mi)
- **Auto-calculation**: Total = Deposit Fee + Carrier Fee + (Distance x Rate)
- **Distance Estimation**: Built-in US city lookup with haversine formula (~500 cities)
- **Lead Approval**: "Approve All Prices" saves all 3 types, converts lead to quote
- **Pricing Editable Everywhere**: Leads, Quotes, and Orders all have PricingEditor
- **Zip Code Fields**: Pickup and delivery zip codes across all detail pages
- **USA Route Map**: SVG map with all 50 states, animated dashed route line between pickup/delivery
- **Route Intelligence**: City-specific facts + state weather/transport/road facts for both route endpoints

## Prioritized Backlog

### P1 - Upcoming
- AI Pricing Engine (distance-based using Google Maps API)
- Customer & Driver Invoice system (Breamway branded)
- Auto Dealers module with CSV upload

### P2 - Future
- Automated email follow-up system
- Twilio SMS Notifications (requires user Twilio API credentials)
- Invoice payment update bug fix

### P3 - Deferred
- Central Dispatch API Integration

## Key Components
- `/app/frontend/src/components/PricingEditor.js` - Shared 3-type pricing card
- `/app/frontend/src/components/USARouteMap.js` - SVG route visualization
- `/app/frontend/src/components/TransportFacts.js` - Route intelligence facts
- `/app/backend/distance_calc.py` - Haversine distance + pricing calculation
