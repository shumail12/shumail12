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
- Vendor API Key: `brw-00ab50ce5fd46030e8ab0be1a4d6d1a6`

## What's Been Implemented

### Phase 1-4: Core CRM, Real-time, Chat, Pricing (DONE)
### Phase 5: Revenue Tracking & User-Specific Leads (DONE)
### Phase 6: Invoice/Agreement System & UX (DONE)
### Phase 7: Superadmin Full Edit Control (DONE)
### Phase 8: Revenue Enhancement (DONE)

### Phase 9 - Vendor API Fix (DONE - March 25, 2026)
- Fixed `/api/leads/specs` route ordering (was matching as `{lead_id}`)
- `/api/leads/incoming` GET → 302 redirect to vendor docs page
- `/api/vendor/docs` — Professional HTML documentation page (public)

### Phase 10 - Email Lead Delivery & Reminder Calendar (DONE - March 26, 2026)
- **Email Lead Delivery**:
  - `@leads.breamway.com` email address generated per CRM instance (UUID-based)
  - `POST /api/leads/email-incoming` — Parses Breamway plain-text email format into leads
  - Supports: Name, Pickup/Delivery City/State/Zip, Year/Make/Model, Pickup Date, Running, Email, Phone, Phone2, Notes, Lead Source ID#
  - Admin Panel shows email address with copy button, regenerate, format template
  - Admin Panel shows vendor docs link (Copy Link + Open Docs)
  
- **Advanced Reminder Calendar**:
  - Full CRUD: Create, read, update, delete reminders
  - Types: Pickup, Dispatch, Follow Up, Custom (color-coded)
  - Calendar grid with month navigation (prev/next month)
  - Today's Reminders banner — shows all today's reminders prominently at top
  - Click any calendar day to add a reminder for that date
  - Link reminders to Order #, Quote #
  - Admin/Superadmin see ALL agents' reminders with user filter
  - Regular users see only their own
  - Mark Done / Mark Pending toggle
  - Missed reminder highlighting (past date + pending)
  - Status filter (pending/completed)

## Prioritized Backlog

### P1 - Upcoming
- Auto Dealers module with CSV upload

### P2 - Future
- Automated email follow-up system
- Twilio SMS Notifications (requires user Twilio API credentials)
- Email delivery for agreements
- Actual email server setup for @leads.breamway.com forwarding

### P3 - Deferred
- Central Dispatch API Integration
- Route cost comparison dashboard
- server.py refactoring (~2500+ lines)

## Key API Endpoints
- `POST /api/leads/email-incoming` (parse email-format lead, needs X-API-Key)
- `POST /api/leads/incoming` (JSON lead intake, needs X-API-Key)
- `GET /api/settings/lead-email` (get lead delivery email address)
- `POST /api/settings/lead-email/regenerate` (new email address)
- `POST/GET/PUT/DELETE /api/reminders` (reminder CRUD)
- `GET /api/reminders/today` (today's reminders)
- `GET /api/vendor/docs` (public HTML vendor docs)
- `GET /api/leads/specs` (public JSON specs)
