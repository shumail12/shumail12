# Breamway Auto Transport CRM - PRD

## Original Problem Statement
Build a full-featured auto transport CRM platform for Breamway Auto Transport (www.breamway.com). Core features: Lead→Quote→Order workflow, dispatch, carrier management, AI pricing, invoicing, agreements, SMS notifications, and real-time lead vendor integration.

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI, Sonner (toasts)
- Backend: FastAPI, MongoDB (Motor Async), SSE (Server-Sent Events), direct bcrypt
- Auth: JWT-based, direct bcrypt (no passlib)
- Real-time: SSE for push notifications

## What's Been Implemented

### Phase 1 — Core CRM (COMPLETE)
- [x] 39,793+ quotes imported with BR format IDs (BR000001–BR039792+)
- [x] Unified data model — quotes embed customer, vehicle, addresses directly
- [x] Quote ID: BR000001, Order ID: ORD000001 (auto-incrementing)
- [x] Lead → Quote → Order workflow with Convert buttons
- [x] 3 Shipping Types: Standard, Expedited, Enclosed
- [x] Quick View modal, Vehicle View (Google Images), search & filters
- [x] Enhanced Dashboard with stats, conversion rates, revenue
- [x] Pagination (100/page), full detail pages, new quote creation

### Real-Time Lead Integration (COMPLETE - 2026-03-23)
- [x] **Vendor Lead Intake API**: POST /api/leads/incoming (API key auth)
- [x] **SSE Real-Time Notifications**: All logged-in users notified instantly
- [x] **Popup Notifications**: Toast with customer name, vehicle, route, quick actions
- [x] **Sound Alert**: Audio plays on new lead arrival
- [x] **Notification Bell**: In header with unread badge count
- [x] **Notification Panel**: Click bell → see all notifications with View/Quote buttons
- [x] **Mark as Read**: Individual + bulk "Mark all read"
- [x] **Quick Actions**: "View Lead" and "Start Quote" from popup & panel
- [x] **Auto Distribution**: All leads visible to all users simultaneously
- [x] **API Key Management**: Superadmin can view/regenerate vendor API key
- [x] **Lead Posting Specs**: GET /api/leads/specs returns full vendor documentation

### Auth & Security (COMPLETE)
- [x] JWT Auth, auto-heal superadmin on startup
- [x] Forgot Password with security question (super admin only)
- [x] "Made with Emergent" badge removed

## Vendor Lead Posting API
- **Endpoint**: POST /api/leads/incoming
- **Auth Header**: X-API-Key: [vendor_api_key]
- **Fields**: name (required), phone, email, vehicle {year, make, model}, pickup, delivery, date

## Superadmin Credentials
- Username: shumail.s | Password: HONDA@2026
- Security Q/A: "Who is your work?" → "Shark"

## Prioritized Backlog

### Phase 2 — AI & Smart Features (P1)
- [ ] AI Pricing Engine (distance + vehicle + shipping type)
- [ ] Distance calculation between pickup/delivery
- [ ] Auto Dealers module with CSV upload

### Phase 3 — Invoicing & Agreements (P1)
- [ ] Customer & Driver Invoice system (Breamway branded)
- [ ] Agreement/Contract with digital signature
- [ ] Terms & Conditions, auto-generate invoices

### Phase 4 — Automation (P2)
- [ ] Automated email follow-ups
- [ ] Email sending from agent's email
- [ ] AI Invoice automation
- [ ] Twilio SMS Notifications
