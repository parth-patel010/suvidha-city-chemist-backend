# Objective
Comprehensive UI overhaul: dark navy sidebar with grouped nav sections, role-based access, new pages (Loyalty, WhatsApp, AI Analytics, Branches, Users, Alerts), action columns on all tables, pagination, improved Products/Customers/Suppliers/Reports/Dashboard/Sales/Settings pages.

# Tasks

### T001: Layout Redesign - Dark Navy Sidebar with Grouped Nav + RBAC
- **Blocked By**: []
- **Details**:
  - Redesign Layout.tsx with persistent dark navy sidebar (#0F172A) on desktop
  - Group menu items: MAIN (Dashboard), OPERATIONS (Products, Inventory, Sales/POS, Online Orders), MANAGEMENT (Purchase Orders, Suppliers, Customers), ANALYTICS (Reports, AI Analytics, Alerts), ADMIN (Branches, Users, Loyalty, WhatsApp, Settings)
  - Active item: blue highlight with left border indicator
  - Notification badges on Alerts, Online Orders
  - Bottom of sidebar: user avatar circle, name, role, logout button
  - Mobile: hamburger menu with Sheet
  - Header bar: branch name, user info
  - Role-based visibility: Admin sees all, Manager sees all except admin-only (Branches, Users), Cashier sees only Dashboard, POS, Products (view), Inventory (view)
  - Files: client/src/components/Layout.tsx
  - Acceptance: Dark sidebar with sections, RBAC menu visibility

### T002: App.tsx - Register New Pages
- **Blocked By**: []
- **Details**:
  - Add routes for: /loyalty, /whatsapp, /ai-analytics, /branches, /users, /alerts
  - Import and register new page components
  - Files: client/src/App.tsx
  - Acceptance: All new routes work

### T003: Backend - Add missing API routes
- **Blocked By**: []
- **Details**:
  - Add DELETE endpoints for: products, inventory, customers, suppliers, purchase-orders, sales
  - Add PUT /api/auth/change-password for password changes
  - Add GET /api/reports/sales-summary with date range + aggregation
  - Add GET /api/reports/gst-summary with date range
  - Add GET /api/reports/inventory-summary
  - Add GET /api/reports/customer-summary
  - Files: server/routes.ts
  - Acceptance: All CRUD + report endpoints work

### T004: Products Page - Full Rebuild
- **Blocked By**: []
- **Details**:
  - Add columns: MRP (from first inventory), GST%, Reorder Level, Schedule Type badges, Stock Level badge
  - Actions column: View (eye), Edit (pencil), Delete (trash) - icon-only with Tooltip
  - Category filter dropdown, Status filter (Active/Inactive)
  - Record count: "Showing X of Y products"
  - Pagination (10/25/50 per page)
  - Delete confirmation dialog with undo toast
  - Edit opens pre-filled form dialog
  - View opens detail dialog with batch/stock info
  - Add Product dialog must work with all fields including MRP, purchase price, selling price, GST%, reorder level
  - Export to Excel button (CSV download)
  - Files: client/src/pages/Products.tsx
  - Acceptance: Full CRUD with actions, filters, pagination

### T005: Customers Page - Full Rebuild
- **Blocked By**: []
- **Details**:
  - Add columns: Date of Birth, Last Visit, Days Since Last Visit badge (red if 60+), Actions (View Profile, Edit, Delete, Send WhatsApp)
  - Loyalty tier filter dropdown
  - Record count + pagination
  - Add Customer dialog working with validation (required fields marked *)
  - Edit dialog pre-filled
  - Delete with confirmation
  - View Profile shows purchase history
  - Send WhatsApp button
  - Success toast on save, error toast on fail
  - Files: client/src/pages/Customers.tsx
  - Acceptance: Full customer management with profile view

### T006: Suppliers Page - Full Rebuild
- **Blocked By**: []
- **Details**:
  - Table: supplierCode, supplierName, contactPerson, phone, email, city, gstNumber, paymentTerms, creditLimit, outstandingBalance (red if >0), status badge
  - Actions: View, Edit, Delete
  - Add Supplier button opens modal form
  - Search by name, code, phone
  - Record count + pagination
  - Export to Excel
  - Outstanding amount in red if > 0
  - Files: client/src/pages/Suppliers.tsx
  - Acceptance: Full supplier CRUD

### T007: Reports Page - Full Rebuild
- **Blocked By**: []
- **Details**:
  - 6 tabs: Sales, Inventory, Customers, GST, Purchases, Profit & Margin
  - Quick date filter buttons: Today, This Week, This Month, This Quarter, This Year
  - Sales: total revenue, total bills, avg bill value, top 10 products, daily table
  - Inventory: total stock value, low stock items, expiry risk items, dead stock
  - Customers: new this month, top 10 by purchase, loyalty tier distribution
  - GST: CGST/SGST/IGST summary cards + invoice-wise detail table; "No sales data" note when empty
  - Purchases: PO summary, supplier-wise breakdown
  - Profit & Margin: gross profit, margin %, top profitable products
  - Export PDF/Excel buttons on each tab
  - Files: client/src/pages/Reports.tsx
  - Acceptance: All 6 tabs with real data

### T008: Sales/POS Page - Full Rebuild
- **Blocked By**: []
- **Details**:
  - Keep existing summary cards + transactions table
  - New Sale opens full POS dialog/page with two-column layout:
    - Left: large search bar, product cards/list with name, price, stock badge, add to cart
    - Right: cart with items (qty, discount, GST, total), subtotal, GST breakup (CGST+SGST), discount, loyalty points, grand total, payment method, amount paid, change
  - Big green "Complete Sale" button
  - Actions on sales table: View invoice details, Print
  - Pagination on sales table
  - Files: client/src/pages/Sales.tsx
  - Acceptance: Full POS billing flow

### T009: Dashboard Page - Fix and Enhance
- **Blocked By**: []
- **Details**:
  - Fix "+12% from yesterday" - hide % change if previous data is 0 or unavailable
  - Verify dashboard stats show correct data from seed
  - Add sales trend section (last 7 days summary)
  - Add recent sales table (last 5)
  - Add expiry alerts list
  - Quick action cards link properly using Link from wouter
  - Files: client/src/pages/Dashboard.tsx
  - Acceptance: Dashboard shows real data, no fake percentages

### T010: New Pages - Loyalty & Rewards
- **Blocked By**: []
- **Details**:
  - Show loyalty tiers configuration (from /api/loyalty-tiers)
  - Recent loyalty transactions list
  - Tier distribution of customers
  - Files: client/src/pages/Loyalty.tsx
  - Acceptance: Loyalty page shows tier info and transactions

### T011: New Pages - WhatsApp Management
- **Blocked By**: []
- **Details**:
  - WhatsApp connection status (/api/whatsapp/status)
  - Message templates list (/api/whatsapp/templates) with add template
  - Message log (/api/whatsapp/messages)
  - Send message form (phone, message)
  - Campaign send (bulk)
  - Files: client/src/pages/WhatsApp.tsx
  - Acceptance: WhatsApp management page functional

### T012: New Pages - AI Analytics
- **Blocked By**: []
- **Details**:
  - AI service health check (/api/ai/health)
  - Demand forecasting: select product, show forecast
  - Expiry risk: show batch risk scores
  - Sales trends: show trend analysis
  - Customer segmentation: show segments
  - Files: client/src/pages/AIAnalytics.tsx
  - Acceptance: AI analytics dashboard with all 4 features

### T013: New Pages - Branches, Users, Alerts
- **Blocked By**: []
- **Details**:
  - Branches.tsx: list branches (/api/branches), add branch form, edit/delete
  - Users.tsx: list users (/api/users), add user form (with role/branch select), edit/delete
  - Alerts.tsx: expiry alerts (/api/alerts/expiry) + stock alerts (/api/alerts/stock), resolve buttons
  - Files: client/src/pages/Branches.tsx, client/src/pages/Users.tsx, client/src/pages/Alerts.tsx
  - Acceptance: All 3 pages functional

### T014: Inventory, Online Orders, Purchase Orders - Add Actions + Pagination
- **Blocked By**: []
- **Details**:
  - Inventory.tsx: Add actions (View, Edit, Delete), pagination, record count
  - OnlineOrders.tsx: Add actions (View details), record count
  - PurchaseOrders.tsx: Add actions (View, Edit status, Delete), record count
  - Files: client/src/pages/Inventory.tsx, client/src/pages/OnlineOrders.tsx, client/src/pages/PurchaseOrders.tsx
  - Acceptance: All tables have actions and pagination

### T015: Settings Page - Enhance
- **Blocked By**: []
- **Details**:
  - Ensure all sections work properly
  - Add password change form that actually works (POST to /api/auth/change-password)
  - Files: client/src/pages/Settings.tsx
  - Acceptance: Settings fully functional
