-- =============================================================================
-- AntiqueX Database Schema
-- Clean, Brand-New Relational DDL (18 Tables)
-- =============================================================================

-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS auto_bids CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS item_images CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- 1. USERS
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. ADMINS
-- -----------------------------------------------------------------------------
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin'
);

-- -----------------------------------------------------------------------------
-- 3. CATEGORIES
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- -----------------------------------------------------------------------------
-- 4. ADDRESSES (User has Address)
-- -----------------------------------------------------------------------------
CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    street VARCHAR(150),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    district VARCHAR(100),
    division VARCHAR(100)
);

-- -----------------------------------------------------------------------------
-- 5. PAYMENT METHODS (User stores Payment Method)
-- -----------------------------------------------------------------------------
CREATE TABLE payment_methods (
    method_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    method_name VARCHAR(50) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. WALLETS (User owns Wallet - 1:1 Account)
-- -----------------------------------------------------------------------------
CREATE TABLE wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0)
);

-- -----------------------------------------------------------------------------
-- 7. ITEMS (User lists Item, Category sorts Item, Admin manages)
-- -----------------------------------------------------------------------------
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    seller_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
    admin_id INT REFERENCES admins(admin_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    year_of_origin INT,
    condition VARCHAR(100),
    starting_price NUMERIC(12, 2) NOT NULL CHECK (starting_price >= 0)
);

-- -----------------------------------------------------------------------------
-- 8. ITEM IMAGES (Item displays Item Image)
-- -----------------------------------------------------------------------------
CREATE TABLE item_images (
    img_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    img_url TEXT NOT NULL
);

-- -----------------------------------------------------------------------------
-- 9. AUCTIONS (Item opens Auction)
-- -----------------------------------------------------------------------------
CREATE TABLE auctions (
    auction_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL UNIQUE REFERENCES items(item_id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    min_increment NUMERIC(12, 2) NOT NULL CHECK (min_increment > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    winner_bid_id INT,
    CHECK (end_time > start_time)
);

-- -----------------------------------------------------------------------------
-- 10. AUTO-BIDS (User allows Auto-Bid)
-- -----------------------------------------------------------------------------
CREATE TABLE auto_bids (
    auto_bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL REFERENCES auctions(auction_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    increment NUMERIC(12, 2) NOT NULL CHECK (increment > 0),
    max_amount NUMERIC(12, 2) NOT NULL CHECK (max_amount > 0)
);

-- -----------------------------------------------------------------------------
-- 11. BIDS (User submits Bid, Auction collects Bid, Auto-Bid places Bid)
-- -----------------------------------------------------------------------------
CREATE TABLE bids (
    bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL REFERENCES auctions(auction_id) ON DELETE CASCADE,
    bidder_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    auto_bid_id INT REFERENCES auto_bids(auto_bid_id) ON DELETE SET NULL,
    bid_amount NUMERIC(12, 2) NOT NULL CHECK (bid_amount > 0),
    bid_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key for auction winner_bid_id after bids table is created
ALTER TABLE auctions
    ADD CONSTRAINT fk_auctions_winner_bid
    FOREIGN KEY (winner_bid_id)
    REFERENCES bids(bid_id)
    ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 12. TRANSACTIONS (Auction closes Transaction, Payment Method used)
-- -----------------------------------------------------------------------------
CREATE TABLE transactions (
    txn_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL UNIQUE REFERENCES auctions(auction_id) ON DELETE RESTRICT,
    buyer_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    seller_id INT NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    winner_bid_id INT REFERENCES bids(bid_id) ON DELETE SET NULL,
    payment_method_id INT REFERENCES payment_methods(method_id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    close_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 13. WALLET TRANSACTIONS (Wallet logs, Transaction credits 1:1)
-- -----------------------------------------------------------------------------
CREATE TABLE wallet_transactions (
    wallet_txn_id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    txn_id INT UNIQUE REFERENCES transactions(txn_id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 14. SHIPMENTS (Transaction dispatches Shipment to Address)
-- -----------------------------------------------------------------------------
CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL UNIQUE REFERENCES transactions(txn_id) ON DELETE CASCADE,
    address_id INT NOT NULL REFERENCES addresses(address_id) ON DELETE RESTRICT,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_date TIMESTAMP,
    delivery_date TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
);

-- -----------------------------------------------------------------------------
-- 15. REVIEWS (User leaves / earns Review for Transaction)
-- -----------------------------------------------------------------------------
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL REFERENCES transactions(txn_id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    comment TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 16. DISPUTES (User raises Dispute, Admin resolves Dispute)
-- -----------------------------------------------------------------------------
CREATE TABLE disputes (
    dispute_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL REFERENCES transactions(txn_id) ON DELETE CASCADE,
    raised_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    resolved_by INT REFERENCES admins(admin_id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- -----------------------------------------------------------------------------
-- 17. NOTIFICATIONS (User receives Notifications)
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- -----------------------------------------------------------------------------
-- 18. WATCHLIST (User tracks Item in Watchlist)
-- -----------------------------------------------------------------------------
CREATE TABLE watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

-- =============================================================================
-- Query Optimization Indexes
-- =============================================================================
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_items_seller_id ON items(seller_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_item_images_item_id ON item_images(item_id);
CREATE INDEX idx_auctions_item_id ON auctions(item_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auto_bids_auction_id ON auto_bids(auction_id);
CREATE INDEX idx_auto_bids_user_id ON auto_bids(user_id);
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_transactions_auction_id ON transactions(auction_id);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_wallet_txns_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_shipments_txn_id ON shipments(txn_id);
CREATE INDEX idx_reviews_txn_id ON reviews(txn_id);
CREATE INDEX idx_disputes_txn_id ON disputes(txn_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);