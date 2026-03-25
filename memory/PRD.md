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
- Leads → Quotes → Orders workflow
- Carriers management
- Invoice system (customer & driver)
- User management (superadmin only)
- Company settings
- Auto-import of ~39.8k legacy records from CSV

### Phase 2 - Real-time & Vendor Integration (DONE)
- SSE-based real-time notification system
- Notification bell with popups
- Vendor Lead Intake API (POST /api/leads/incoming with X-API-Key)
- Public API documentation endpoint (/api/leads/specs)

### Phase 3 - Chat, Admin Panel, Agreements (DONE - March 25, 2026)
- **Internal Chat System**: 1-on-1 DM + All Team group chat with SSE real-time messaging
- **Admin Control Panel**: API key management, lead distribution rules, lead sources analytics, API activity logs
- **Agreement/Contract System**: Create from orders, digital signature pad (canvas), public signing page, status flow (draft→sent→signed/void), terms & conditions template

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
- Central Dispatch API Integration (deferred by user)

## Key API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/leads` - List leads
- `POST /api/leads/incoming` - Vendor lead intake (X-API-Key auth)
- `GET /api/quotes` - List quotes
- `POST /api/quotes/{id}/convert-to-order` - Convert quote to order
- `GET /api/orders` - List orders
- `POST /api/chat/send` - Send chat message
- `GET /api/chat/channels` - Get chat channels
- `GET /api/agreements` - List agreements
- `POST /api/agreements` - Create agreement
- `POST /api/agreements/{id}/sign` - Sign agreement
- `GET /api/agreements/public/{id}` - Public agreement view
- `POST /api/agreements/public/{id}/sign` - Public signing
- `GET /api/admin/distribution` - Lead distribution rules
- `GET /api/notifications/stream` - SSE stream

## DB Collections
- users, quotes, orders, carriers, invoices, notifications, chat_messages, agreements, distribution_rules, api_logs, settings, company_settings, counters
