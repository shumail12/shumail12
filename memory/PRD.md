# Breamway Auto Transport CRM - Product Requirements Document

## Original Problem Statement
CRM for auto transport brokerage company (Shumail Technologies LLC / Breamway Auto Transport). Core features: lead processing, dispatch, quotes, tracking, invoicing, reporting, SMS text notifications.

## Core Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor Async)
- **Auth**: JWT-based (bcrypt), Super Admin role, 30-min inactivity auto-logout
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

### Phase 3 - Chat, Admin Panel, Agreements (DONE)
- Internal Chat System: 1-on-1 DM + All Team + custom groups + file upload + user search
- Admin Control Panel: API keys, lead distribution, lead sources, API logs
- Agreement/Contract System: digital signature, public signing, status flow

### Phase 4 - Pricing Engine & Route Intelligence (DONE)
- Editable Pricing for 3 Shipping Types: Standard ($0.75/mi), Expedited ($0.95/mi), Enclosed ($1.00/mi)
- Auto-calculation: Total = Deposit Fee + Carrier Fee + (Distance x Rate)
- Distance Estimation: Built-in US city lookup with haversine formula (~500 cities)
- Lead Approval: "Approve All Prices" saves all 3 types, converts lead to quote
- Pricing Editable Everywhere: Leads, Quotes, and Orders all have PricingEditor
- Zip Code Fields: Pickup and delivery zip codes across all detail pages
- USA Route Map: SVG map with all 50 states, animated dashed route line
- Route Intelligence: City-specific facts + state weather/transport/road facts

### Phase 5 - Revenue Tracking & User-Specific Leads (DONE - March 25, 2026)
- User-specific leads: New leads are private to assigned user, legacy 39.8k quotes visible to all
- Revenue Form: Fill from Order Detail page (deposit, total, payment method)
- Revenue Dashboard (superadmin): Total deposits, per-agent breakdown, per-payment-method breakdown
- Dashboard Revenue Target: Progress bar with 3 levels ($1,500 -> $3,000 -> $5,000)
- Payment methods: Zelle, COD, CashApp, Venmo, ACH, Card
- Quotes table cleanup: Removed Vehicle, Pickup, Delivery, Status columns

### Phase 6 - Advanced Invoice/Agreement System & UX Enhancements (DONE - March 25, 2026)
- **Customer Invoice/Agreement**: Professional Breamway-branded editable document generated from orders
  - Customer info, vehicle details, route info (pickup/delivery with contacts), pricing & payment, full terms & conditions, digital signature pad
  - USDOT# 4246498, MC# 1622825 branding
- **Carrier Invoice/Agreement**: Separate professional carrier dispatch document
  - Carrier info, driver details, customer reference, vehicle info, route info, carrier pay & COD, carrier terms, signature
- **Invoice Generation**: One-click from Order Detail page (Customer Invoice / Carrier Invoice buttons)
- **Editable by admin/superadmin only**: Role-based access control on invoice editing
- **Invoice signing**: Digital signature with signer name and timestamp
- **Print-ready layout**: CSS print styles for professional printout
- **Invoices list enhanced**: Type column (Customer/Carrier badges), Customer/Carrier name column
- **Auto Logout (Session Timeout)**: 30-minute inactivity timeout with "Session expired" message
  - Tracks mouse, keyboard, scroll, touch, click events
- **Login Motivational Popup**: 30 random sales/transport/motivation quotes, auto-dismisses after 30 seconds, manual close button

## Prioritized Backlog

### P1 - Upcoming
- Auto Dealers module with CSV upload

### P2 - Future
- Automated email follow-up system
- Twilio SMS Notifications (requires user Twilio API credentials)
- Email delivery for agreements

### P3 - Deferred
- Central Dispatch API Integration
- Route cost comparison dashboard

### Refactoring
- Break `server.py` (~1900+ lines) into modular routers/models

## Key Components
- `/app/frontend/src/components/PricingEditor.js` - Shared 3-type pricing card
- `/app/frontend/src/components/USARouteMap.js` - SVG route visualization
- `/app/frontend/src/components/TransportFacts.js` - Route intelligence facts
- `/app/frontend/src/components/MotivationalPopup.js` - Login motivational quotes
- `/app/backend/distance_calc.py` - Haversine distance + pricing calculation

## Key API Endpoints
- `POST /api/orders/{order_id}/generate-invoice?invoice_type=customer|carrier` - Generate invoice from order
- `POST /api/invoices/{invoice_id}/sign` - Sign an invoice
- `PUT /api/invoices/{invoice_id}` - Edit invoice (admin/superadmin only)
- `POST /api/orders/{order_id}/revenue` - Save revenue form
- `GET /api/revenue/admin/summary` - Super admin revenue aggregation
- `GET /api/dashboard/stats` - Dashboard stats with revenue targets
