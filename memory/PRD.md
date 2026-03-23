# Breamway Auto Transport CRM - PRD

## Original Problem Statement
Build a full-featured auto transport CRM platform for Breamway Auto Transport (www.breamway.com). Core features: Lead→Quote→Order workflow, dispatch, carrier management, AI pricing, invoicing, agreements, and SMS notifications. Custom branding "Shumail Technologies LLC".

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn UI
- Backend: FastAPI, MongoDB (Motor Async), direct bcrypt hashing
- Auth: JWT-based, direct bcrypt (no passlib)

## What's Been Implemented

### Phase 1 — Core Foundation (COMPLETE)
- [x] 39,792 quotes imported from 2 CSV files with BR format IDs (BR000001–BR039792)
- [x] Unified data model — quotes embed customer name, phone, email, vehicle, addresses directly
- [x] Quote ID format: BR000001, BR000002... (auto-incrementing)
- [x] Order ID format: ORD000001, ORD000002... 
- [x] Quote table: Quote ID, Agent, Customer, Phone, Email, Vehicle, Pickup, Delivery, Price, Status
- [x] 3 Shipping Types: Standard (5-7 days), Expedited (48hr), Enclosed (ASAP)
- [x] Lead → Quote → Order workflow with Convert buttons
- [x] Quick View modal for instant preview without page navigation
- [x] Vehicle View — clickable vehicle names open Google Images search
- [x] Enhanced Dashboard with conversion rates, revenue, recent quotes
- [x] Search by name, phone, email, city, agent
- [x] Filter by status and agent
- [x] Pagination (100 per page across 398 pages)
- [x] Full detail pages for quotes and orders with edit capability
- [x] New Quote creation form with all fields
- [x] Sidebar: Dashboard, Quotes, Orders, Invoices, Users, Settings
- [x] Breamway Auto Transport branding in sidebar

### Auth & Security (COMPLETE)
- [x] JWT Authentication with direct bcrypt
- [x] Auto-heal superadmin password on startup
- [x] Forgot Password with security question (super admin only)
- [x] Rate limiting on password reset
- [x] "Made with Emergent" badge removed

## Superadmin Credentials
- Username: shumail.s
- Password: HONDA@2026
- Email: shumailghauri12@gmail.com
- Security Q/A: "Who is your work?" → "Shark"

## Critical Notes
- DB has 39,792+ records — all list queries use .skip()/.limit()
- passlib MUST NOT be used
- Login auto-heals on every server startup

## Prioritized Backlog

### Phase 2 — AI & Smart Features (P1)
- [ ] AI Pricing Engine (distance + vehicle + shipping type)
- [ ] Distance calculation between pickup/delivery
- [ ] Dispatch + Carrier management enhancement
- [ ] Auto Dealers module with CSV upload

### Phase 3 — Invoicing & Agreements (P1)
- [ ] Customer Invoice (Breamway branded, terms, deposit info)
- [ ] Driver Invoice (carrier payout, payment terms)
- [ ] Agreement/Contract system with digital signature
- [ ] Terms & Conditions page
- [ ] Auto-generate invoices after order creation

### Phase 4 — Automation & Advanced (P2)
- [ ] Automated email follow-ups (new lead, quote sent, no response)
- [ ] Email sending from agent's email
- [ ] AI Invoice automation
- [ ] Twilio SMS Notifications
- [ ] Advanced UI animations & polish
