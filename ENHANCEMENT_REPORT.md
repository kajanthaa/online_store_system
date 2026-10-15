# 📈 FreshMart — Practical 01 to Practical 02 Enhancement Report
> **Course / Continuous Assessment (CA) Document**  
> **Topic:** Online Grocery Store (Project #13)  
> **Student Continuous Assessment Report: P01 Core System → P02 Enhancements**

---

## 1. Executive Summary
This report documents the architectural and functional progression of the **FreshMart Online Grocery Store** from **Practical 01 (Core System)** to **Practical 02 (Advanced Enhancements)** as mandated by the Web Application Development assessment specification.

The project demonstrates a production-grade, modular transition from a baseline CRUD system to an enterprise-ready grocery management portal with session-based authentication, cryptographic security, real-time stock alert mechanisms, transactional sandbox payments, and an executive analytics suite.

---

## 2. Progression Comparison: Practical 01 vs. Practical 02

| Dimension | Practical 01 (Baseline Core) | Practical 02 (Enhanced System) |
| :--- | :--- | :--- |
| **Authentication & Access** | Open access / unauthenticated endpoints. | Session-based authentication with bcrypt hashing (`cost: 10`) and protected admin route guards. |
| **Security Architecture** | Basic parameter handling. | Comprehensive input validation, SQL injection prevention via prepared statements, and session cookies (`httpOnly`). |
| **Inventory & Stock Management**| Basic numeric stock storage. | Dynamic low-stock warning badges (`stock <= 10`), Out-of-Stock lockouts, and one-click quick restock workflow. |
| **Search & Filtering** | Simple static product display. | Asynchronous live keyword search (name/category), category pill filtering, and sorting (price / stock). |
| **Order Processing** | Direct database inserts. | Atomic multi-step database transactions (`connection.beginTransaction`) with automated stock decrement. |
| **Payment Flow** | None / placeholder. | End-to-end Mock Payment Gateway (Card / UPI / Cash on Delivery) generating transaction receipts and tracking invoices. |
| **Reporting & Business Analytics**| None. | Comprehensive reporting dashboard with total revenue, category sales distribution progress bars, and top 5 bestsellers. |
| **User Interface & UX** | Standard HTML forms and tables. | Modern dual-interface design: polished storefront and responsive dark-themed executive sidebar dashboard. |

---

## 3. Deep Dive into Practical 02 Implementations

### 3.1 Authentication & Route Guarding (4 Marks)
- **Module:** `routes/auth.js` and `middleware/auth.js`
- **Implementation:**
  - Secure session management using `express-session`.
  - Passwords are never stored in plain text; authenticated using `bcrypt.compare`.
  - The middleware `requireAuth` intercepts all mutating endpoints (`POST`, `PUT`, `DELETE` for products and categories) and reports HTTP 401 if unauthenticated.
  - Dedicated login portal (`/login`) with client-side credential verification.

### 3.2 Security Practices (3 Marks)
- **Cryptographic Hashing:** Uses `bcryptjs` with salt rounds set to 10 for administrator credentials.
- **SQL Injection Prevention:** Every query executed through `mysql2/promise` uses parameterized question marks (`?`). Raw query strings are never concatenated with user input.
- **Defensive Validation:** Dual-layer validation (client-side real-time DOM feedback in `validation.js` + server-side defensive guards in route controllers).

### 3.3 Stock Alert System & Enhancements (5 Marks)
- **Low Stock Threshold:** Products with `stock <= 10` automatically display an alert badge in both the customer store (`⚠️ Only X left!`) and the admin inventory table.
- **Dedicated Alert View:** The Admin Dashboard features an interactive "Inventory Stock Alerts" table highlighting critical items with a "+ Quick Restock" button.
- **Sales & Analytics Suite:**
  - **Revenue Calculator:** Aggregates all paid transactions.
  - **Category Breakdown:** Aggregates units sold and revenue generated per category with visual progress bars.
  - **Top 5 Bestsellers:** Analyzes order items to highlight top performing products.

### 3.4 Payment Workflow Simulator (3 Marks)
- **Module:** `routes/payments.js`
- **Workflow:**
  1. Customer adds items to cart and proceeds to checkout.
  2. Order is registered in the database under transaction lock.
  3. Customer selects payment method (Mock Credit Card, UPI / QR, or Cash on Delivery).
  4. System validates simulated payment credentials and generates a unique transaction reference (e.g., `TXN-GRC-174829-AF91B`).
  5. The order status updates from `Pending` to `Paid`, and a permanent payment record is recorded in the `payments` table.
  6. A printable invoice receipt is generated dynamically on the client.

### 3.5 UI & UX Modernization (3 Marks)
- **Storefront:** Clean green-themed modern layout with sticky navigation, dynamic cart badge, animated modals, and responsive CSS Grid product catalog.
- **Admin Dashboard:** Sidebar navigation with smooth tab switching (no page reloads), metric summary cards with icon illustrations, and mobile-friendly responsive tables.

---

## 4. Technical Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                   Client Layer                         │
│  Storefront (index.html)     Admin Dashboard (admin.html│
│  - Flexbox & CSS Grid UI     - Sidebar & Metric Cards  │
│  - Dynamic DOM updates       - Modal CRUD Operations   │
│  - jQuery & AJAX Handlers    - Visual Sales Reports    │
└───────────────▲────────────────────────▲───────────────┘
                │                        │
                ▼                        ▼
┌────────────────────────────────────────────────────────┐
│                   Server Layer                         │
│                  (server.js)                           │
│  ├── express.json() & express-session                  │
│  ├── requireAuth Middleware (Session Guard)            │
│  └── API Routers:                                      │
│      ├── /api/auth       ├── /api/orders               │
│      ├── /api/products   ├── /api/payments             │
│      ├── /api/categories └── /api/reports              │
└───────────────────────▲────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│                  Database Layer                        │
│                (MySQL: `grocery`)                      │
│  users | categories | products | customers             │
│  orders | order_items | payments                       │
└────────────────────────────────────────────────────────┘
```

---

## 5. Summary of Viva Preparedness
All 5 Viva evaluation criteria are thoroughly addressed:
1. **Working System Demonstration:** Fully operational storefront and admin portal.
2. **Front-End Architecture:** Semantic HTML5, CSS Grid/Flexbox, DOM, jQuery AJAX.
3. **Back-End Architecture:** Node.js Express routes, REST APIs, transactions.
4. **Database Relationships:** Normalized relational schema with foreign key constraints.
5. **Security & Enhancements:** Bcrypt password hashing, session guards, stock alerts, and mock payment workflows.
