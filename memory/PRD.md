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
- JWT Auth, Dashboard, Leads -> Quotes -> Orders workflow, Carriers, Invoices, User management
- Auto-import ~39.8k legacy records from CSV

### Phase 2 - Real-time & Vendor Integration (DONE)
- SSE-based real-time notifications, Vendor Lead Intake API

### Phase 3 - Chat, Admin Panel, Agreements (DONE)
- Internal Chat (1-on-1, Team, Groups, File Upload), Admin Control Panel, Agreement/Contract System

### Phase 4 - Pricing Engine & Route Intelligence (DONE)
- 3-tier Pricing, Auto-calculation, Distance Estimation, USA Route Map, Route Intelligence

### Phase 5 - Revenue Tracking & User-Specific Leads (DONE)
- User-specific leads, Revenue Form, Revenue Dashboard, Revenue Targets, Payment Methods

### Phase 6 - Invoice/Agreement System & UX (DONE)
- Customer & Carrier Invoices (Breamway-branded), Auto Logout (30-min), Motivational Popup

### Phase 7 - Superadmin Full Edit Control (DONE)
- Canva-style Invoice Editor, Superadmin Order Editor, Signed Invoice Protection, Chat SSE Fix

### Phase 8 - Revenue Enhancement (DONE)
- Superadmin Edit/Delete Revenue, Monthly Reset, Monthly History, Month/User Filters

### Phase 9 - Vendor API Fix (DONE - March 25, 2026)
- **Root cause**: `/api/leads/specs` was registered AFTER `/api/leads/{lead_id}`, causing FastAPI to match `specs` as a lead_id parameter and return 401/403
- **Fix**: Moved specs endpoint BEFORE the parameterized route
- **New**: `/api/vendor/docs` — Professional HTML documentation page (public, no auth) with:
  - API endpoint, authentication section with API key
  - All request fields reference table
  - cURL example with copy button
  - Success/error response examples
  - Breamway branding
- **Verified**: Lead submission via API works end-to-end (tested with cURL)
- **URLs for vendor**:
  - Docs page: `{base_url}/api/vendor/docs`
  - JSON specs: `{base_url}/api/leads/specs`
  - Lead POST endpoint: `{base_url}/api/leads/incoming`

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
- server.py refactoring (~2200+ lines)
