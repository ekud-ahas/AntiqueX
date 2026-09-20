# AntiqueX — Online Antique Auction & Collectibles Platform
## Complete Project Documentation & 60% Milestone Evaluation Report

---

## 1. Project Purpose & System Overview

### 1.1 What is AntiqueX?
**AntiqueX** is a full-stack, database-driven web application designed as an **online antique auction and e-commerce marketplace**. The platform connects antique collectors, historians, and verified sellers with passionate buyers and curators worldwide. It facilitates the discovery, bidding, acquisition, payment, shipment tracking, and dispute management of rare historical artifacts, period furniture, fine art, vintage jewelry, ancient coins, and classical sculptures.

Unlike conventional fixed-price e-commerce sites, AntiqueX centers around an **English Auction model** featuring real-time price discovery, automated minimum increments, proxy auto-bidding provisions, an internal digital wallet ledger, and comprehensive role-based access control.

### 1.2 Core Target Users & Platform Roles
The system accommodates three distinct user roles with strict server-side boundary enforcement:
1. **Customer (Buyer & Seller):**
   - **As a Buyer:** Browse active auctions, filter by categories, maintain a personalized watchlist, place real-time bids, configure auto-bids, fund their internal digital wallet, execute atomic order checkouts for won auctions, and track shipments.
   - **As a Seller:** List rare items with detailed provenance (year of origin, condition, high-resolution multi-image uploads), define starting bid prices and auction durations, monitor incoming bids, receive proceeds into their wallet upon checkout, and dispatch shipments.
2. **Moderator:**
   - Possesses elevated privileges to monitor platform activity, view platform performance metrics, inspect catalog listings, and intervene by cancelling or modifying auction statuses for suspicious listings.
3. **Admin (Super Administrator):**
   - Possesses full platform governance: manages the category taxonomy, views platform-wide financial and transactional analytics, audits user accounts, and can suspend fraudulent or policy-violating users (which immediately revokes all their write capabilities via middleware).

---

## 2. System Architecture & How Things Are Done

The application is structured into a modern decoupled architecture adhering to strict academic and production standards:

```
┌────────────────────────────────────────────────────────┐
│                   React + Vite SPA                     │
│    (Role-Aware Navigation, State, Responsive Views)    │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON (REST APIs + JWT)
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js / Express.js                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Middlewares: JWT Auth, RBAC, Status, Multer Upload│  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Controllers & Routers (REST Endpoints)           │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Pure SQL Data Access Layer (NO ORM - strictly pg)│  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────┬─────────────────────────────┘
                           │ Parameterized SQL Queries ($1, $2)
┌──────────────────────────▼─────────────────────────────┐
│                PostgreSQL Relational DB                │
│    18 Normalized Entities | Constraints | Triggers     │
└────────────────────────────────────────────────────────┘
```

### 2.1 Backend Technology & Database Connection
- **Runtime & Framework:** Node.js with Express.js.
- **Database Engine:** PostgreSQL.
- **Driver / Connectivity:** Uses `pg` (`Pool` connection pool), ensuring high performance and connection lifecycle management without ad-hoc single connections.
- **Strict Prohibition of ORM:** Per BUET CSE 216 course guidelines, **no Object-Relational Mapping (ORM) library is used**. Every database operation is performed using handwritten, optimized, raw SQL queries with parameterization (`$1, $2, ...`) to eliminate SQL injection vulnerabilities.
- **External Museum API Integration:** Features a background integration module (`metImporter.js`) that interfaces with **The Metropolitan Museum of Art Collection API** to automatically seed authentic public-domain artifacts into the platform catalog with real high-resolution imagery and historical metadata.

### 2.2 Relational Data Modeling & ERD Alignment
The database schema is derived directly from the provided Entity-Relationship Diagram (`AntiqueX.pdf` and `schema.sql`), structured in **Third Normal Form (3NF)** with 19 distinct relational tables:

| # | Entity / Table | Role in the System | Key Relational Foreign Keys |
|---|---|---|---|
| 1 | `users` | Customer profiles (buyers/sellers) with status (`active`, `suspended`). | Primary identifier for regular users. |
| 2 | `admins` | Administrative personnel with granular roles (`admin`, `moderator`). | Isolated from customer credentials. |
| 3 | `categories` | Antique classifications (Furniture, Fine Art, Coins, etc.). | Managed by `admin_id` (`admins`). |
| 4 | `addresses` | User postal addresses for shipment routing and delivery. | References `user_id` (`users`). |
| 5 | `payment_methods` | Stored payment channels (Credit Card, bKash, Wire Transfer). | References `user_id` (`users`). |
| 6 | `wallets` | In-platform digital wallet balance with non-negative constraint (`balance >= 0`). | 1-to-1 unique mapping with `user_id`. |
| 7 | `items` | Antique listings containing title, description, origin year, condition, starting price, and UUID. | References `seller_id` (`users`) and `category_id`. |
| 8 | `item_images` | Multi-image gallery attachments for each antique item. | 1-to-Many mapping to `item_id` (`items`). |
| 9 | `auctions` | Auction lifecycle (start/end times, minimum increment, status, winning bid). | 1-to-1 mapping with `item_id`; references `winner_bid_id`. |
| 10 | `auto_bids` | Proxy auto-bidding configurations (increment step and max ceiling budget). | References `user_id` (`users`). |
| 11 | `bids` | Audit log of all bids placed by users, amounts, and timestamps. | References `auction_id`, `bidder_id`, and optional `auto_bid_id`. |
| 12 | `transactions` | Official purchase records closing ended auctions with winning bids. | 1-to-1 with `auction_id`; references `winner_bid_id`. |
| 13 | `wallet_transactions` | Double-entry financial audit ledger (deposits, withdrawals, payments, sales proceeds). | References `wallet_id`, `txn_id`, `payment_method_id`. |
| 14 | `shipments` | Courier logistics tracking, carrier details, tracking number, delivery dates, and status. | 1-to-1 with `txn_id`; references `address_id`. |
| 15 | `reviews` | Bilateral feedback ratings (1–5) and comments between buyer and seller. | References `txn_id`, `reviewer_id`, and `reviewee_id`. |
| 16 | `disputes` | Shipment problem escalation tickets submitted by users, resolved by admins. | References `shipment_id`, `raised_by`, `resolved_by`. |
| 17 | `notifications` | In-app alerts for auction wins, outbid events, payments, and sales. | References `user_id` (`users`). |
| 18 | `watchlist` | Many-to-Many bridge table allowing users to bookmark auctions. | Composite uniqueness on `(user_id, item_id)`. |
| 19 | `revoked_tokens` | Server-side blacklist for invalidated JWT tokens upon user logout (§3.1). | Indexed on `token` and `expires_at`. |

---

## 3. How Core Workflows Function in AntiqueX

### 3.1 Authentication & Role-Based Access Control (RBAC)
- **Two-Table Schema Isolation:** Customers are registered in the `users` table; staff members are stored in the `admins` table. Table membership and the persisted `admins.role` column dictate authority—the client **never** specifies its own role.
- **Password Security:** All passwords are salted and hashed using `bcrypt` (10 salt rounds). No plaintext or MD5/SHA-1 passwords exist in the database.
- **Session Tokens:** Stateless authentication is maintained via signed JSON Web Tokens (JWT) transmitted via the `Authorization: Bearer <token>` header.
- **Account Suspension Guard:** The authentication middleware (`authMiddleware.js`) verifies on every single request whether a user account has been marked as `suspended` in the database. If suspended, the request is immediately aborted with HTTP 403 Forbidden.

### 3.2 Auction Lifecycle & Escrow Pre-Funded Bidding (Option A)
1. **Creation:** When a seller lists an item (`POST /items`), a database transaction creates the item, inserts gallery image records, and initializes an `active` auction with an automatically calculated minimum increment (5% of the starting price, rounded to 100 BDT, minimum 100 BDT).
2. **Escrow Pre-Funded Bidding (`placeBidWithLock`):**
   - **ACID Row Lock:** Locks the auction row (`FOR UPDATE OF a`) and verifies real-time status and non-expired timestamp (`NOW() < end_time`).
   - **Anti-Shill Bidding:** Sellers cannot bid on their own listings.
   - **Bidder Wallet Check & Fund Hold:** Locks bidder's wallet (`SELECT balance FROM wallets FOR UPDATE`). If `balance < bid_amount`, rejects the bid with HTTP 400. Deducts `bid_amount` immediately into escrow and logs a `bid_escrow` record in `wallet_transactions`. (If bidder is already leading bidder raising their own bid, only the incremental difference is deducted).
   - **Instant Outbid Refund:** If another user previously held the highest bid, their held amount is **immediately refunded back into their wallet** in the same transaction, a `bid_refund` record is logged, and an outbid notification is issued. No bidder's funds remain trapped after being outbid!
3. **Auction Expiration & Instant Settlement:**
   - When an auction closes (`closeAuctionAndRecordWinner`), the winning bidder's held bid is transferred directly to the **Seller's wallet** (`UPDATE wallets SET balance = balance + $winning_bid`).
   - A `sale_proceeds` record is logged in `wallet_transactions`.
   - The transaction is marked `completed` and a delivery `shipments` record is automatically provisioned for the winning buyer's address.

### 3.3 Wallet & Mock Payment Gateway Server
- **Simulated External Payment Gateway (`backend/services/mockPaymentGateway.js`):**
  - Simulates an external payment gateway API (e.g. bKash, Nagad, Visa/Mastercard).
  - Validates provider channels, card/mobile numbers, and mock PINs.
  - Generates realistic gateway references (e.g. `GW_BKASH_...`) and authorization codes (`AUTH_...`).
- **In-Platform Wallet Management:**
  - Users deposit fiat funds through the Mock Payment Gateway (`POST /api/wallet/deposit`), immediately crediting their auction bidding balance.
  - Users can withdraw accumulated sale proceeds back to their real-world accounts (`POST /api/wallet/withdraw`).
  - Double-entry ledger in `wallet_transactions` tracks every deposit, withdrawal, bid hold (`bid_escrow`), outbid refund (`bid_refund`), and sale payout (`sale_proceeds`).

---

## 4. Evaluation Against CSE 216 60% Milestone Guidelines

| Guideline Section | Requirement | Project Implementation Status | Verification Proof / Implementation Details |
|---|---|---|---|
| **3.1 Authentication (All Roles)** | Functional sign-up and login for all roles | **COMPLETED (100%)** | Customers register via `/api/auth/register`. Login endpoint `/api/auth/login` checks both `users` and `admins` tables, identifying `customer`, `admin`, and `moderator`. |
| | Passwords salted and hashed (bcrypt) | **COMPLETED (100%)** | Handled with `bcrypt.hash(password, 10)` in `authController.js`. Zero plaintext passwords. |
| | Session / Token Management | **COMPLETED (100%)** | Signed JWT issued upon login, inspected by `authenticateToken` middleware. |
| | Functional Server-Side Logout | **COMPLETED (100%)** | Dedicated `/api/auth/logout` endpoint stores token in `revoked_tokens` table until expiry; `authenticateToken` rejects revoked tokens with HTTP 401. |
| | Input validation & HTTP status codes | **COMPLETED (100%)** | Comprehensive checks returning 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 409 (Conflict on duplicate user/email). |
| | Role stored in DB, not trusted from client | **COMPLETED (100%)** | Role is resolved exclusively by backend database queries on `users` / `admins` tables. |
| **3.2 Authorization (Role Separation)** | Distinct capability per role | **COMPLETED (100%)** | Customers see personal wallet, bids, selling, orders, and notifications; Admins see system analytics, user suspension, and category controls; Moderators see moderation controls without category deletion. |
| | Cross-role access blocked | **COMPLETED (100%)** | Strict middleware: `requireRole("customer")` blocks Admins from customer financial/bidding routes; `requireRole("admin")` blocks Customers and Moderators from admin actions (HTTP 403). |
| | Object-level ownership checks | **COMPLETED (100%)** | Users cannot edit or delete items of other users, cannot view or transact on other users' wallets (`/api/wallet/:userId`), and cannot pay for unowned transactions. |
| | Server-side enforcement | **COMPLETED (100%)** | Fully enforced on backend; verified via automated test suite `test/test-comprehensive-fixes.js` bypassing the frontend. |
| **3.3 HTTP/API Requests (≥ 20% Features)** | REST conventions & HTTP methods | **COMPLETED (100%)** | 35+ endpoints using `GET`, `POST`, `PUT`, `PATCH`, `DELETE` across 10 route modules with standard HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500). |
| | Parameterized SQL queries (No ORM) | **COMPLETED (100%)** | Strictly raw SQL queries through `pg` connection pool with `$1, $2, ...` placeholders. Zero ORMs used. |
| | ACID Concurrency & Row-Level Locking | **COMPLETED (100%)** | Implemented `placeBidWithLock` with `BEGIN`, `SELECT ... FOR UPDATE OF a`, real-time expiration check, and `COMMIT` to guarantee race condition safety under concurrent bidding. |
| **3.4 Minimal Functional Frontend** | Authentication screens | **COMPLETED (100%)** | React `Login.jsx` and `Register.jsx` pages wired directly to the backend. |
| | Role-aware interface | **COMPLETED (100%)** | Dynamic `Navbar.jsx` rendering role badges (`CUSTOMER`, `MODERATOR`, `ADMIN`) and conditionally exposing role-specific navigation routes. |
| | Feature access from UI | **COMPLETED (100%)** | 15 functional React views allowing listing items, uploading images, viewing details, placing bids, managing watchlist, wallet deposit/withdraw, purchasing, notifications, and admin dashboard. |
| | Error feedback | **COMPLETED (100%)** | Form validation feedback and server error banners rendered in red/amber alerts across all forms. |

---

## 5. Detailed Breakdown of Implemented Features

### 5.1 Authentication, Users & Administrative Security
- **Multi-Role Authentication:**
  - Customer registration with duplicate email and username validation.
  - Universal login resolving customer, moderator, and administrator roles.
  - JWT token generation and Bearer header parsing.
- **Admin Governance & Platform Oversight:**
  - Administrative dashboard (`AdminDashboard.jsx`) with aggregate platform KPIs: total registered users, active auctions, total sales volume, item inventory count, and recent bidding activity.
  - User management directory with real-time status toggling (instant **Suspend** / **Reactivate** user actions).
  - Auction moderation allowing administrators and moderators to toggle auction status (`active`, `ended`, `cancelled`).
  - Category management (creating new categories and deleting existing categories with foreign key safety).
- **Enforced Account Suspension:**
  - Real-time middleware check ensuring suspended users are blocked from placing bids, selling items, or withdrawing funds.

### 5.2 Item & Catalog Management
- **Full Item CRUD Operations:**
  - Public browsing of antique catalog with pagination/order sorting.
  - Detailed single item view (`ItemDetails.jsx`) displaying item specifications, provenance, condition, current highest bid, seller details, and image carousel.
  - Item listing form (`SellItem.jsx`) supporting title, category selection, origin year, condition, and starting price.
  - Multi-image handling: support for external image URLs as well as direct file uploads via `Multer`.
  - Item edit (`EditItem.jsx`) and delete features with strict seller ownership verification.
- **Category Browsing:**
  - Dedicated category gallery (`Categories.jsx`) and category-specific item exploration (`CategoryItems.jsx`).
- **External Museum Seeding Integration:**
  - Background module importing high-resolution public-domain artifacts from The Metropolitan Museum of Art API.

### 5.3 Bidding & English Auction Engine
- **Auction Engine:**
  - 1-to-1 linkage between antique items and auctions.
  - Automatic calculation of minimum bid increments.
  - Dynamic status tracking (`scheduled`, `active`, `ended`, `cancelled`).
  - Automatic expiration processing: expired active auctions are automatically identified and settled upon inspection.
- **Bidding Rules & Constraints:**
  - Bid submission with real-time validation against current highest bid + minimum increment.
  - Anti-shill bidding check: sellers are prohibited from placing bids on their own items.
  - Full bid history audit trail displayed on the item page.

### 5.4 Digital Wallet & Payment Settlement
- **Digital Wallet:**
  - User wallet balance tracking with non-negative constraints.
  - Deposit funds with transaction logging.
  - Withdraw funds with balance validation.
  - Transaction history ledger listing all deposits, withdrawals, and purchase credits/debits.
- **Auction Settlement & Order Flow:**
  - Automatic winning bid resolution upon auction expiration.
  - Pending transaction generation for the auction winner.
  - Order checkout view (`Purchases.jsx`) allowing buyers to pay for won auctions using their wallet balance.
  - Atomic database transactions with `FOR UPDATE` locking ensuring secure funds transfer between buyer and seller.
  - Automatic provisioning of a `shipments` record upon payment completion.

### 5.5 Watchlist System
- **Personalized Watchlist:**
  - Add items to watchlist (`POST /api/watchlist`).
  - Remove items from watchlist (`DELETE /api/watchlist`).
  - Dedicated watchlist management page (`Watchlist.jsx`) displaying current highest bids and auction statuses of bookmarked items.
### 5.6 Notification Center
- **In-App Notification Alerts:**
  - Automatic notification generation upon auction events (outbid notifications via `placeBidWithLock`, auction settlement alerts).
  - Backend endpoints: `GET /api/notifications` and `PATCH /api/notifications/:id/read`.
  - Dedicated frontend view (`Notifications.jsx`) accessible from the navigation bar, allowing users to review alerts and mark them as read.

---

## 6. Remaining Features (What is Left to be Done)

While the core functional requirements of the 60% evaluation are fully met, the comprehensive 19-table Entity-Relationship Diagram outlines several advanced platform features designated for final completion:

```
┌────────────────────────────────────────────────────────────────────────┐
│               REMAINING IMPLEMENTATION ROADMAP                         │
├───────────────────────────────┬────────────────────────────────────────┤
│ Feature Area                  │ Target Entity / Functionality          │
├───────────────────────────────┼────────────────────────────────────────┤
│ 1. Proxy Auto-Bidding Engine  │ auto_bids Table                        │
│ 2. Logistics & Courier Module │ shipments Table (Full dispatch cycle)  │
│ 3. Bilateral Review & Rating  │ reviews Table                          │
│ 4. Dispute Resolution System  │ disputes Table                         │
│ 5. Address Book Management    │ addresses Table (CRUD UI)              │
│ 6. Payment Methods Management │ payment_methods Table (Cards/MFS UI)   │
│ 7. Search & Advanced Filtering│ Multi-facet catalog search             │
└───────────────────────────────┴────────────────────────────────────────┘
```

### 6.1 Automated Proxy Bidding (`auto_bids`)
- **Current State:** Table exists in database schema and seed data; foreign key link `bids.auto_bid_id` is defined.
- **What is Left to Do:**
  - Build endpoints (`POST /api/auctions/:id/auto-bid`, `DELETE /api/auctions/:id/auto-bid`) allowing a user to specify an automated increment and a maximum budget ceiling.
  - Implement the proxy bidding engine: when an opposing manual bid is submitted, the engine automatically checks for active auto-bids on the auction and generates an incremental bid on behalf of the auto-bidder up to their ceiling.

### 6.2 Full Logistics & Shipment Tracking Management (`shipments`)
- **Current State:** Shipment records are automatically created as `pending` upon transaction completion, with schema support for carrier, tracking number, and delivery dates.
- **What is Left to Do:**
  - **Seller Dispatch Interface:** Allow sellers to select a courier (e.g., DHL, FedEx, SA Paribahan), input a tracking number, and mark status as `in_transit`.
  - **Buyer Delivery Confirmation:** Allow buyers to mark items as `delivered` upon receiving them, updating `deliver_date`.
  - Dedicated Shipments tab on the user dashboard.

### 6.3 Bilateral Review & Reputation System (`reviews`)
- **Current State:** Table defined in schema and seed data with rating check (`CHECK (rating BETWEEN 1 AND 5)`).
- **What is Left to Do:**
  - Build `POST /api/reviews` enabling verified buyers to leave reviews and 1–5 star ratings for sellers upon delivery, and vice versa.
  - Aggregate seller reputation ratings displayed on seller profiles and item detail cards.

### 6.4 Dispute & Conflict Resolution System (`disputes`)
- **Current State:** Table exists in schema with status tracking (`open`, `resolved`, `rejected`) and foreign keys to `shipments`, `raised_by`, and `resolved_by`.
- **What is Left to Do:**
  - **Customer Ticket Submission:** Allow buyers to raise a dispute against a shipment (e.g., damaged antique, tracking delay, item mismatch).
  - **Admin Dispute Resolution:** Add a dedicated "Disputes" tab in the `AdminDashboard` where admins can inspect evidence, contact parties, and mark disputes as `resolved` or issue wallet refunds.

### 6.5 User Address Book & Multiple Shipping Addresses (`addresses`)
- **Current State:** Schema and seed data exist; payment currently picks the first available address.
- **What is Left to Do:**
  - User address management UI: add, edit, and set primary shipping addresses with division, district, city, street, and postal code.
  - Allow selecting from saved addresses during order checkout.

### 6.6 Dedicated Payment Instruments Management (`payment_methods`)
- **Current State:** Schema and basic backend CRUD endpoints exist.
- **What is Left to Do:**
  - Frontend interface in the user profile to add/remove saved payment cards, bKash/Nagad accounts, or bank wire details.

### 6.7 Advanced Search, Sorting, and Era-Based Filtering
- **Current State:** Category filtering is active.
- **What is Left to Do:**
  - Full-text search by antique keywords and descriptions.
  - Multi-attribute filtering by origin century/year range (e.g., 18th Century, Victorian, Pre-1900), condition grade (Mint, Excellent, Good, Fair), and price range sliders.
  - Sorting controls: "Ending Soonest", "Newly Listed", "Price: Low to High", "Most Bids".

---

## 7. Comprehensive Bug Audit & Resolved Flaws (Developer Handover)

> **Notice for Teammates & Collaborators:**  
> This section logs all major architectural bugs, security vulnerabilities, race conditions, and guideline violations discovered during the whole-codebase review, along with how they were resolved. Review this carefully before extending features or modifying routes.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             SUMMARY OF AUDITED & FIXED DEFECTS                                   │
├────┬───────────────────────────────┬───────────────────┬─────────────────────────────────────────┤
│ ID │ Vulnerability / Defect Area   │ Severity          │ Guideline / File Reference              │
├────┼───────────────────────────────┼───────────────────┼─────────────────────────────────────────┤
│ B1 │ No Server-Side Logout (JWT)   │ Critical          │ §3.1 Token Invalidation                 │
│ B2 │ PK Collision & Role Ambiguity │ Critical (Security│ §3.2 RBAC Cross-Role Isolation          │
│ B3 │ Body-ID Spoofing (Ownership)  │ High (IDOR)       │ §3.2 Object-Level Ownership Checks      │
│ B4 │ Bidding Concurrency Race Cond.│ Critical (ACID)   │ §3.3 Concurrency & Double-Bidding       │
│ B5 │ Bidding on Expired Auctions   │ High (Business)   │ auctionModel.js                         │
│ B6 │ Unchecked Item Deletion       │ High (Integrity)  │ itemModel.js                            │
│ B7 │ Destructive PUT Item Updates  │ Medium (Data Loss)│ itemModel.js (Missing COALESCE)         │
│ B8 │ Double-Credit on Payment Fail │ High (Financial)  │ transactionModel.js                     │
│ B9 │ External Payment Impersonation│ Medium (Financial)│ transactionModel.js / paymentModel.js   │
│ B10│ Missing Customer Notifications│ Medium (Feature)  │ notificationModel.js / UI missing       │
│ B11│ Frontend Missing Auth Headers │ High (UX / 401s)  │ §3.4 Minimal Frontend (api.js wrapper)  │
└────┴───────────────────────────────┴───────────────────┴─────────────────────────────────────────┘
```

### Bug B1: No Server-Side Token Invalidation on Logout (§3.1)
- **Problem**: When a user logged out, the frontend simply deleted `localStorage.token`. The backend had no revocation mechanism. The token remained valid until its 24-hour expiration, violating course guideline §3.1.
- **Fix**:
  - Created the `revoked_tokens (token_id, token, revoked_at, expires_at)` table in PostgreSQL with an index on `token`.
  - `POST /api/auth/logout` extracts the token claims and inserts it into `revoked_tokens`.
  - `authenticateToken` middleware queries `revoked_tokens` on every protected request. Blacklisted tokens return `401 Unauthorized` immediately.
  - `Navbar.jsx` updated to send `Authorization: Bearer <token>` on logout.

### Bug B2: Primary Key Collision & Lack of Cross-Role Isolation (§3.2)
- **Problem**: Regular users are stored in `users` (`user_id` sequence 1, 2, ...), while staff are in `admins` (`admin_id` sequence 1, 2, ...). When an admin logged in, their JWT had `userId = 1`. In endpoints lacking role checks (e.g. `POST /api/wallet/deposit`), an Admin was treated as Customer #1 (John Smith), modifying John's wallet balance!
- **Fix**:
  - Applied strict `requireRole("customer")` on:
    - `/api/wallet/deposit` & `/api/wallet/withdraw`
    - `POST /api/auctions/:id/bids`
    - `POST /items` (sell item)
    - `POST /api/watchlist` & `DELETE /api/watchlist`
    - `POST /api/payments/methods`
    - `POST /api/transactions/:id/pay`
  - Applied `requireRole("admin")` or `requireRole("admin", "moderator")` on administrative endpoints.
  - In `authController.js`, registration now checks against `admins.username` to prevent a customer from claiming reserved admin handles.

### Bug B3: Insecure Direct Object References (IDOR via Request Body) (§3.2)
- **Problem**: Controllers trusted client-supplied identifiers in request bodies:
  - `walletController.depositFunds` used `req.body.user_id`.
  - `watchlistController` used `req.body.user_id`.
  - `transactionController.payForWonAuction` used `req.body.buyer_id`.
  - Any user could deposit funds or trigger actions using another customer's ID by altering the JSON payload.
- **Fix**:
  - Completely removed reliance on `req.body.user_id` and `req.body.buyer_id` in write controllers.
  - All operations now exclusively use `req.user.userId` extracted from the cryptographically signed JWT.
  - Added object-level ownership checks preventing users from querying or modifying resources owned by other users.

### Bug B4: Auction Bidding Concurrency Race Condition & Double-Bidding (§3.3)
- **Problem**: `auctionModel.insertBid` executed a basic read-then-write sequence without table or row locks. If two users bid at the exact same millisecond:
  1. Both read the same highest bid.
  2. Both submitted the same increment.
  3. Both bids were inserted with the same price, corrupting the audit trail and violating English auction rules.
- **Fix**:
  - Implemented `placeBidWithLock` inside an explicit ACID transaction (`BEGIN` ... `COMMIT` / `ROLLBACK`).
  - Row-level locking: `SELECT ... FROM auctions a JOIN items i ON a.item_id = i.item_id WHERE a.auction_id = $1 FOR UPDATE OF a;`
  - Under the lock, re-reads the latest bid before inserting. Simultaneous duplicate bids are rejected with `400 Bad Request`.

### Bug B5: Bidding on Expired or Non-Active Auctions
- **Problem**: The bid endpoint did not verify `end_time` against current time in real-time. Bids could be inserted onto auctions whose end timestamp had already elapsed.
- **Fix**:
  - In `placeBidWithLock`, added real-time evaluation: `if (new Date(auction.end_time).getTime() <= Date.now()) throw Error("Auction ended")`.
  - Rejects bids on any auction with status other than `'active'`.

### Bug B6: Unrestricted Item Deletion and Inconsistent State
- **Problem**: A seller could delete an item (`DELETE /items/:id`) even if the auction already had active bids or was settled in a completed transaction, leaving orphan records or crashing foreign key queries.
- **Fix**:
  - Updated `itemModel.deleteItem`: queries `bids` and `transactions` before deletion.
  - If bids or transactions exist, deletion is rejected with `400 Bad Request` ("Cannot delete item with active bids or transactions").
  - In `updateItem`, blocked editing `starting_price` or auction duration if bids have already been placed.

### Bug B7: Destructive Partial Updates on Items (Missing SQL COALESCE)
- **Problem**: `itemModel.updateItem` replaced all columns directly. If a frontend form sent only a subset of fields, unspecified fields were overwritten with `NULL`.
- **Fix**:
  - Converted the query to parameterized `COALESCE($1, column)` expressions so omitted properties preserve existing database values.

### Bug B8: Financial Settlement Asynchrony & False Crediting
- **Problem**: In `transactionModel.processPayment`, seller balance was credited before buyer balance deduction was verified. If buyer deduction failed (e.g. database error), the seller could still be credited.
- **Fix**:
  - Structured the payment inside a strict transaction where buyer debit must succeed and return the modified row before seller credit is executed.
  - If either step fails, the entire transaction issues `ROLLBACK`.

### Bug B9: External Payment Method Impersonation
- **Problem**: When paying using a stored payment method, the backend never verified that the `payment_method_id` actually belonged to the paying user.
- **Fix**:
  - Added query validation: `SELECT 1 FROM payment_methods WHERE payment_method_id = $1 AND user_id = $2`. Rejects unowned payment methods.

### Bug B10: Missing Notification Triggers & Missing UI
- **Problem**: When a customer was outbid, no notification was stored. Even when notifications were created for sales, there were no API endpoints or UI page for the user to view or mark them as read.
- **Fix**:
  - Created `notificationModel.js`, `notificationController.js`, and `notificationRoutes.js` (`/api/notifications`).
  - Added automatic outbid notice insertion inside `placeBidWithLock`.
  - Created `Notifications.jsx` in frontend and linked it in `Navbar.jsx`.

### Bug B11: Frontend Missing Authorization Headers (401 Errors) (§3.4)
- **Problem**: Multiple React components used native `fetch()` without passing the `Authorization` header, triggering unexpected `401 Unauthorized` errors across the UI.
- **Fix**:
  - Created centralized [`frontend/src/utils/api.js`](file:///g:/CSE%20216%20DB%20Project/AntiqueX/frontend/src/utils/api.js) exporting `authFetch` and `api` helper methods.
  - Refactored all protected pages (`ItemDetails`, `SellItem`, `EditItem`, `MyItems`, `Purchases`, `Wallet`, `Watchlist`, `Categories`, `Navbar`) to automatically inject `Authorization: Bearer <token>`.

---

## 8. Summary & Final Assessment

AntiqueX demonstrates a robust, production-grade architectural foundation that **exceeds the 60% evaluation benchmark** established by the Department of CSE, BUET:
- **Database Layer:** 100% normalized 3NF schema, complete with constraints, triggers, and foreign keys across 19 entities.
- **Data Access:** Exclusively raw parameterized SQL through pooled client connections, adhering strictly to the zero-ORM policy.
- **Security & RBAC:** Multi-role authentication (Customer, Moderator, Admin) with server-side validation, password hashing, and object-level ownership checks across every sensitive resource.
- **Feature Completion:** Far exceeds the mandatory 20% functional route milestone with a fully wired React frontend driving real auction lifecycles, digital wallet funding, atomic checkout settlements, and administrative moderation.
