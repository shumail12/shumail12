# Auto Transport CRM - PRD (Shumail Technologies)

## Original Problem Statement
Build a CRM for an auto transport brokerage company. Core features: lead processing, dispatch, quotes, tracking, invoicing, reporting, and SMS text notifications.

## Product Requirements
- Modern/clean UI, JWT-based auth, Twilio SMS integration
- Full-page details for entities, super admin user assignment capabilities
- Custom branding ("Shumail Technologies")
- Handle large datasets (37k+ records)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor Async), direct bcrypt hashing
- Architecture: Client-Server with JWT Auth, custom pagination

## What's Been Implemented
- [x] Initial Setup: React, FastAPI, MongoDB, Tailwind CSS
- [x] JWT Authentication (direct bcrypt, no passlib)
- [x] CRM Core Pages: Dashboard, Leads, Quotes, Orders, Dispatch, Invoices
- [x] UI Branding updates to "Shumail Technologies"
- [x] CSV Bulk Data Import (37k+ records)
- [x] Pagination (skip/limit of 100)
- [x] Full-page detail views for Leads, Quotes, Orders, Invoices
- [x] Super-admin user assignment logic
- [x] **Quotes page updated** - Shows Customer Name, Phone, Email, Pickup Address, Drop-off Address, Price (2026-03-23)
- [x] **Optimized quotes fetching** - New `/api/quotes/enriched` endpoint with batch lead lookup instead of N+1 queries (2026-03-23)
- [x] **MongoDB indexes** on leads.id, quotes.id, quotes.created_at for performance (2026-03-23)

## Superadmin Credentials
- Username: shumail.s
- Password: HONDA@2026

## Critical Notes
- DB has 37k+ records. All list queries MUST use .skip() and .limit()
- passlib MUST NOT be used (causes AttributeError with bcrypt on Python 3.11)
- Use direct bcrypt.hashpw / bcrypt.checkpw

## Prioritized Backlog

### P0
- Verify bcrypt auth works on deployment (login flow)

### P1
- Twilio SMS Notifications (playbook fetched, not implemented - needs user API keys)
- Invoice payment update bug (minor)

### P2
- Central Dispatch API Integration (deferred per user)
- Customer-facing tracking portal
- server.py cleanup/refactoring
