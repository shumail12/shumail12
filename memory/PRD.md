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
- Internal Chat (1-on-1, Team, Groups, File Upload), Admin Control Panel, Agreement/Contract System with digital signature

### Phase 4 - Pricing Engine & Route Intelligence (DONE)
- Editable 3-tier Pricing (Standard/Expedited/Enclosed), Auto-calculation, Distance Estimation, USA Route Map, Route Intelligence

### Phase 5 - Revenue Tracking & User-Specific Leads (DONE)
- User-specific leads, Revenue Form, Revenue Dashboard, Dashboard Revenue Targets, Payment Methods

### Phase 6 - Advanced Invoice/Agreement System & UX (DONE)
- Customer & Carrier Invoices (Breamway-branded, print-ready), Auto Logout (30-min), Motivational Popup

### Phase 7 - Superadmin Full Edit Control & Speed (DONE)
- Superadmin Invoice Editor (Canva-style: header, DOT#, title, terms editable), Superadmin Order Editor (customer/vehicle/location), Signed Invoice Protection, Chat SSE Reconnection

### Phase 8 - Revenue Enhancement System (DONE - March 25, 2026)
- **Superadmin Edit Revenue**: Edit deposit, payment method, customer name, notes on any revenue entry
- **Superadmin Delete Revenue**: Remove incorrect entries with confirmation dialog
- **Monthly Revenue Reset**: Dashboard progress bar shows CURRENT MONTH only. Old data fully preserved.
- **Monthly Revenue History**: Month-by-month breakdown cards showing total, count, per-user performance
- **Month Filter**: Revenue admin summary filterable by month (YYYY-MM)
- **User Filter on History**: Filter monthly history by specific user
- **Dashboard Month Label**: Revenue target shows current month name (e.g., "March 2026")
- **Instant Updates**: Edit/delete immediately refreshes all dashboard totals and reports

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
- Break `server.py` (~2100+ lines) into modular routers/models

## Key API Endpoints
- `PUT /api/revenue/{id}` (superadmin edit revenue)
- `DELETE /api/revenue/{id}` (superadmin delete revenue)
- `GET /api/revenue/monthly-history` (month-by-month breakdown)
- `GET /api/revenue/admin/summary?month=YYYY-MM` (filtered admin summary)
- `GET /api/dashboard/stats` (current month revenue for target)
- `POST /api/orders/{order_id}/generate-invoice?invoice_type=customer|carrier`
- `PUT /api/invoices/{invoice_id}` (admin/superadmin, branding+all fields)
