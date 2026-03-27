# Breamway Auto Transport CRM — PRD

## Original Problem Statement
Build a CRM for Breamway Auto Transport (auto transport brokerage). Core features: lead processing, dispatch, quotes, tracking, invoicing, reporting, SMS notifications, user-specific lead privacy. Modern UI, JWT Auth, Twilio SMS, auto-calc distance pricing, digital agreement signatures, user dashboard revenue tracking, super admin revenue view, USA map visualizations, handling large legacy datasets (~39k records).

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor Async) + SSE for real-time
- **Email:** SendGrid (Inbound Parse for leads, Outbound for quotes)
- **Auth:** JWT + Security Question + 30-min auto-logout

## What's Been Implemented

### Core CRM
- Leads → Quotes → Orders workflow with full CRUD
- Auto-pricing via distance calculation
- Lead distribution rules (round-robin, source-based)
- Vendor API for lead intake (POST /api/leads/incoming)
- Legacy data import (~39k records)

### Email System (NEW - Mar 27, 2026)
- **Inbound Email Leads:** SendGrid Inbound Parse webhook (POST /api/leads/email-webhook) — PUBLIC, no auth. Vendors email leads to @leads.breamway.com, automatically creates CRM leads.
- **Outbound Quote Emails:** When lead is approved, sends professional HTML email to customer with quote details + pricing options via SendGrid.
- **Super Admin Email Settings:** (Admin Panel → Email Settings tab)
  - Sender configuration (email, name, company info)
  - Editable HTML email templates with {{placeholders}}
  - Template preview with sample data
  - Test email sending
  - Email delivery logs

### Sidebar Badge Notifications (NEW - Mar 27, 2026)
- Red pulsing badge on "Leads" nav item showing count of unseen leads
- Red pulsing badge on "Chat" nav item showing count of unread messages
- Counts poll every 15 seconds + refresh on SSE events
- Lead badge decreases when user views individual leads (seen_by tracking)

### Chat Popup Notifications (NEW - Mar 27, 2026)
- Toast popup notification when another user sends a chat message
- Shows sender name, message preview, and "Open Chat" button
- Sound notification on new messages

### Phone Number Search (NEW - Mar 27, 2026)
- Search leads, quotes, and orders by phone number (including phone2)
- Also searches email, city, vehicle make/model, carrier name

### Invoicing & Agreements
- Customer & Carrier editable invoices (Canva-style)
- Digital agreement signatures
- Super admin full-edit permissions

### Admin & Revenue
- Super Admin Control Panel (API keys, lead distribution, sources, logs, email settings)
- Monthly revenue tracking + historical breakdown
- Revenue forms per order

### Other Features
- Internal chat (SSE-based real-time)
- Reminder Calendar
- USA Route Map visualization
- Motivational login popups
- 30-minute auto-logout
- Vendor API Documentation page (public HTML)

## Key Integrations
- **SendGrid:** Inbound Parse (email→lead) + Outbound (quote emails). API Key in backend/.env.
- **Twilio:** Pending — requires user API credentials.

## Prioritized Backlog

### P1 — In Progress / Next
- Advanced Chat Features: typing indicators, read receipts, media uploads, CRM data sharing (Lead/Quote/Order cards in chat)
- Auto Dealers module with CSV upload

### P2 — Planned
- Automated email follow-up system
- Twilio SMS Notifications (requires user Twilio API key)

### P3 — Future
- Daily email digest notifications for agents

## Credentials
- Super Admin: shumail.s / HONDA@2026 / Security: Shark
- Vendor API Key: brw-00ab50ce5fd46030e8ab0be1a4d6d1a6

## Refactoring Notes
- server.py is ~2900 lines. Recommended: break into /routes, /models, /services modules.
