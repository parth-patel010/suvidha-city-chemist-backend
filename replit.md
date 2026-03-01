# Suvidha Pharmacy Pro

## Overview
Production-grade full-stack pharmacy management system with multi-branch support, GST-compliant billing, batch-level inventory tracking, customer loyalty engine, online order portal, AI analytics microservice, and WhatsApp automation. Built by PM Web Solutions.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI (port 5000)
- **Backend**: Express.js + TypeScript + Drizzle ORM (port 5000, same process via Vite middleware)
- **AI Service**: Python Flask microservice (port 8000) — scikit-learn, pandas, statsmodels
- **Database**: PostgreSQL via Drizzle ORM
- **WhatsApp**: Meta WhatsApp Cloud API via axios

## Workflows
- `Start application` — `npm run dev` (port 5000, webview)
- `AI Service` — `cd ai-service && python app.py` (port 8000, console)

## Startup Scripts
- `run.bat` — Windows startup script with dependency checks, ASCII banner, service status
- `run.sh` — Linux/Mac startup script with colored output, dependency checks, service status

## Key Files
- `shared/schema.ts` — 25+ Drizzle tables with full relations
- `server/routes.ts` — All API routes (auth, CRUD, WhatsApp, AI proxy, reports, dashboard)
- `server/index.ts` — Express server entry point
- `server/whatsapp.ts` — Meta WhatsApp Cloud API service
- `server/ai-client.ts` — HTTP client for Flask AI microservice
- `client/src/App.tsx` — React app with wouter routing, auth, TooltipProvider
- `client/src/components/Layout.tsx` — Dark navy sidebar with grouped nav sections, RBAC
- `client/src/index.css` — Theme variables (pharmacy blue/navy palette)

## Pages (16 total)
- Dashboard — KPI cards, sales trend, recent sales, expiry alerts, quick actions
- Products — Full CRUD, batch/stock info, category/status filters, pagination, CSV export
- Inventory — View/Edit/Delete actions, pagination, record count
- Sales/POS — Two-column POS dialog, GST breakup, invoice view/print, pagination
- Customers — Profile view, edit, delete, WhatsApp, loyalty filter, pagination, CSV export
- Online Orders — View details, status badges, pagination
- Purchase Orders — View/Edit status/Delete, pagination
- Suppliers — Full CRUD, search, pagination, CSV export, outstanding balance highlight
- Reports — 6 tabs (Sales, Inventory, Customers, GST, Purchases, Profit & Margin), date filters, CSV export
- Settings — Profile, password change, store config
- Loyalty — Tier configuration, transactions, distribution
- WhatsApp — Connection status, templates, message log, send form
- AI Analytics — Health check, demand forecast, expiry risk, sales trends, customer segmentation
- Branches — Branch management (admin only)
- Users — User management with role/branch assignment (admin only)
- Alerts — Expiry alerts + stock alerts with resolve buttons

## Sidebar Navigation Groups
- MAIN: Dashboard
- OPERATIONS: Products, Inventory, Sales/POS, Online Orders
- MANAGEMENT: Purchase Orders, Suppliers, Customers
- ANALYTICS: Reports, AI Analytics, Alerts
- ADMIN: Branches, Users, Loyalty, WhatsApp, Settings

## Role-Based Access
- Admin: Full access to all features
- Manager: All except Branches and Users management
- Cashier: Dashboard, POS, Products (view), Inventory (view)

## Database
- PostgreSQL via `DATABASE_URL`
- Schema push: `npx drizzle-kit push`
- Seed: `npx tsx seed.ts`

## Auth
- JWT-based (stored in localStorage as `pharmacy_token`)
- Demo: admin/password123, manager1/password123, cashier1/password123

## AI Endpoints (Flask, port 8000)
- `GET /health` — health check
- `POST /predict/demand` — demand forecasting
- `POST /predict/expiry-risk` — batch expiry risk scoring
- `POST /analyze/sales-trends` — seasonal trend analysis
- `POST /segment/customers` — RFM customer segmentation

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection
- `SESSION_SECRET` — JWT signing key
- `WHATSAPP_ACCESS_TOKEN` — Meta API bearer token
- `WHATSAPP_PHONE_NUMBER_ID` — Meta phone number ID
- `WHATSAPP_BUSINESS_ACCOUNT_ID` — Meta business account ID
