# AntiqueX — Online Antique Auction & Marketplace

> **BUET CSE 216: Database Sessional Course Project**  
> Complete implementation for the **60% Milestone Evaluation** conforming strictly to course guidelines.

---

## 📌 Project Overview

**AntiqueX** is a full-stack, database-driven web platform designed as an **online antique auction and e-commerce marketplace**. It allows verified sellers to list rare historical artifacts, period furniture, fine art, and ancient coins, while buyers can participate in English auctions with live price discovery, proxy auto-bidding provisions, in-platform digital wallet funding, atomic checkout settlements, and order shipment tracking.

### 🌟 Key Highlights
- **100% Raw Parameterized SQL:** Strictly **Zero ORMs** used per CSE 216 course guidelines. All queries use `$1, $2, ...` parameterized bindings to prevent SQL injection.
- **ACID Concurrency & Escrow Pre-Funded Bidding:** High-concurrency bidding implemented via PostgreSQL transactions (`BEGIN` ... `COMMIT`) using `SELECT ... FOR UPDATE` row locks. Bid amounts are held directly from the bidder's wallet into escrow. Outbid users are **immediately refunded in full** in the same transaction!
- **Mock / Dummy Payment Gateway Server:** Built-in simulated payment gateway (`mockPaymentGateway.js`) authorizing external fiat deposits via **bKash**, **Nagad**, and **Credit Card** with realistic transaction IDs (`GW_BKASH_...`) and authorization codes.
- **Server-Side Token Revocation (§3.1):** Genuine server-side token invalidation on logout via `revoked_tokens` table.
- **Strict Role-Based Access Control (§3.2):** Full boundary separation between **Customer**, **Moderator**, and **Admin** roles. Primary key collisions prevented and cross-role requests blocked with `403 Forbidden`.
- **Object-Level Ownership:** Users cannot read, alter, or delete another user's wallet, items, payment methods, or transactions.
- **Dynamic Role-Aware Frontend (§3.4):** Built with React + Vite, featuring role-based dashboards, interactive auction detail views, and real-time outbid notifications.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Database** | PostgreSQL 16+, 19 Normalized Relational Tables (3NF), Constraints, Indexes, Triggers |
| **Backend** | Node.js, Express.js 5.x, `pg` (Connection Pooling), JWT (`jsonwebtoken`), `bcrypt` (10 salt rounds), `multer` |
| **Frontend** | React 18, Vite 8, React Router DOM 6, Custom Modern CSS |
| **Testing** | Node native test harness (`backend/test/test-comprehensive-fixes.js`) |

---

## 👥 Roles & Test Credentials for Evaluation

For quick and clean-state evaluation during viva/demonstration:

| Role | Email | Password | Allowed Capabilities |
|---|---|---|---|
| **Admin** | `admin@antiquex.com` | `password123` | Full governance: platform analytics, category creation/deletion, user suspension/reactivation, auction moderation. Cannot bid or access customer wallets. |
| **Moderator** | `sarah.mod@antiquex.com` | `password123` | Catalog & auction moderation (inspect listings, cancel suspicious auctions, manage item status). Cannot delete categories. |
| **Customer 1** | `john@example.com` | `password123` | Browse auctions, list items for sale, place bids, manage watchlist, wallet deposit/withdraw, checkout won auctions, view notifications. |
| **Customer 2** | `emma@example.com` | `password123` | Independent customer account for testing outbid notifications and competitive bidding against Customer 1. |

---

## 🚀 Getting Started (Setup & Execution)

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher running on `localhost:5432`)

### 1. Database Initialization
1. Ensure your PostgreSQL server is running and a database named `antiquex_db` exists:
   ```sql
   CREATE DATABASE antiquex_db;
   ```
2. Configure backend environment in `backend/.env`:
   ```env
   PORT=5000
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=antiquex_db
   JWT_SECRET=your_secret_key_here
   ```
3. Run the schema and seed scripts:
   ```bash
   # In psql or your preferred database client:
   psql -U postgres -d antiquex_db -f database/schema.sql
   psql -U postgres -d antiquex_db -f database/seed.sql
   ```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev   # Starts Express server on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev   # Starts Vite React dev server on http://localhost:5173
```

During local development, Vite proxies `/api`, `/items`, and `/uploads` to the backend.
For a separately hosted backend, add `frontend/.env` with `VITE_API_BASE_URL=https://api.example.com`.

---

## 🧪 Automated Verification Test Suite

A standalone test suite is provided to verify all mandatory requirements under Section 3 of the 60% guidelines without manual clicking:

```bash
cd backend
node test/test-comprehensive-fixes.js
```

### What this test verifies:
1. **Sign-up & Login**: Registration and JWT generation.
2. **Server-Side Token Invalidation (§3.1)**: User logs out; the invalidated token immediately receives `401 Unauthorized` on protected endpoints.
3. **Cross-Role Access Blocking (§3.2)**: Admin attempting to access customer wallet deposit receives `403 Forbidden`; Customer attempting admin category creation receives `403 Forbidden`.
4. **Item Deletion Guardrails**: Deleting an item with active bids is rejected.
5. **ACID Bidding Race Condition Test (§3.3)**: Simulates simultaneous identical bids using `Promise.all`; verifies row-level lock allows only one winning bid.
6. **Notifications**: Verifies notification retrieval and status updates.

---

## 📂 Project Structure

```
AntiqueX/
├── backend/
│   ├── config/              # Database connection pool (pg.Pool)
│   ├── controllers/         # Business logic & request handling
│   │   ├── adminController.js
│   │   ├── auctionController.js
│   │   ├── authController.js
│   │   ├── categoryController.js
│   │   ├── itemController.js
│   │   ├── notificationController.js
│   │   ├── paymentController.js
│   │   ├── transactionController.js
│   │   ├── walletController.js
│   │   └── watchlistController.js
│   ├── middleware/          # JWT authentication & RBAC middleware
│   ├── models/              # Pure raw SQL data access layer
│   ├── routes/              # Express REST route definitions
│   ├── test/                # Automated verification test suite
│   └── server.js            # Server entrypoint
├── database/
│   ├── schema.sql           # 19 normalized DDL table definitions
│   └── seed.sql             # Relational sample records for evaluation
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, WatchlistButton, Layouts
│   │   ├── pages/           # React views (Items, Wallet, Orders, Admin, etc.)
│   │   └── utils/api.js     # Centralized authenticated fetch client
│   └── package.json
├── PROJECT_DOCUMENTATION.md # Detailed architectural documentation
└── README.md
```

---

## 📖 Comprehensive Documentation
For the complete technical specification, Entity-Relationship Diagram details, table mapping, and 60% evaluation compliance matrix, please see [**`PROJECT_DOCUMENTATION.md`**](./PROJECT_DOCUMENTATION.md).
