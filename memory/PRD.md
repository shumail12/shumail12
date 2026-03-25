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
- Editable Pricing for 3 Shipping Types: Standard, Expedited, Enclosed
- Auto-calculation: Total = Deposit Fee + Carrier Fee + (Distance x Rate)
- Distance Estimation: Built-in US city lookup with haversine formula
- Lead Approval, Zip Codes, USA Route Map, Route Intelligence

### Phase 5 - Revenue Tracking & User-Specific Leads (DONE)
- User-specific leads: New leads are private to assigned user
- Revenue Form, Revenue Dashboard (superadmin), Dashboard Revenue Targets
- Payment methods: Zelle, COD, CashApp, Venmo, ACH, Card

### Phase 6 - Advanced Invoice/Agreement System & UX Enhancements (DONE - March 25, 2026)
- Customer & Carrier Invoice/Agreement: Professional Breamway-branded editable documents
- Invoice Generation: One-click from Order Detail page
- Auto Logout (30-min Session Timeout), Login Motivational Popup

### Phase 7 - Superadmin Full Edit Control & Speed (DONE - March 25, 2026)
- **Superadmin Invoice/Agreement Editor (Canva-style)**: Header company name, subtitle, DOT numbers, document title — all editable before signing
- **Superadmin Order Editor**: Customer name, phone, email, vehicle year/make/model, pickup/delivery city/state/zip, agent, source — all editable
- **Signed Invoice Protection**: Admin cannot edit signed invoices (403), superadmin can
- **Terms & Conditions**: Fully editable by superadmin before signing
- **Chat SSE Reconnection**: Auto-reconnect on error with 3-second retry (was dying on disconnect)
- Backend: OrderUpdateInput expanded with 12 new fields, InvoiceUpdateInput expanded with 4 branding fields

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
- Break `server.py` (~2000+ lines) into modular routers/models

## Key API Endpoints
- `POST /api/orders/{order_id}/generate-invoice?invoice_type=customer|carrier`
- `PUT /api/invoices/{invoice_id}` (admin/superadmin, branding+all fields)
- `PUT /api/orders/{order_id}` (superadmin: customer/vehicle/location fields)
- `POST /api/invoices/{invoice_id}/sign`
- `POST /api/orders/{order_id}/revenue`
- `GET /api/revenue/admin/summary`
