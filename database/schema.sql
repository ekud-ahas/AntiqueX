
-- Drop existing tables (in reverse dependency order to avoid FK errors)

DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS auto_bids CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS item_images CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL
);

-- 2. ADMINS

CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin'
);

-- 3. ADDRESSES (User has Addresses)

CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    street VARCHAR(150),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    district VARCHAR(100),
    division VARCHAR(100),
    CONSTRAINT fk_address_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 4. CATEGORIES (Admin manages Categories, sorts Items)

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 5. ITEMS (User lists Item, Category sorts Item)

CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    admin_id INT, -- Admins manage / approve items
    title VARCHAR(200) NOT NULL,
    description TEXT,
    year_of_origin INT,
    condition VARCHAR(100),
    starting_price NUMERIC(12, 2) NOT NULL CHECK (starting_price >= 0),
    CONSTRAINT fk_item_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_item_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_item_admin
        FOREIGN KEY (admin_id)
        REFERENCES admins(admin_id)
        ON DELETE SET NULL
);

-- 6. ITEM IMAGES (Item displays Item Images)

CREATE TABLE item_images (
    img_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL,
    img_url TEXT NOT NULL,
    CONSTRAINT fk_image_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE
);

-- 7. AUCTIONS (Item opens Auction)

CREATE TABLE auctions (
    auction_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL UNIQUE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    min_increment NUMERIC(12, 2) NOT NULL CHECK (min_increment > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    CONSTRAINT fk_auction_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE,
    CONSTRAINT chk_auction_time
        CHECK (end_time > start_time)
);

-- 8. AUTO-BIDS (User sets Auto-Bid for an Auction)

CREATE TABLE auto_bids (
    auto_bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL,
    user_id INT NOT NULL,
    increment NUMERIC(12, 2) NOT NULL CHECK (increment > 0),
    max_amount NUMERIC(12, 2) NOT NULL CHECK (max_amount > 0),
    CONSTRAINT fk_auto_bid_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_auto_bid_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 9. BIDS (User submits Bid, Auction collects Bids, Auto-Bid places Bids)

CREATE TABLE bids (
    bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL,
    bidder_id INT NOT NULL,
    auto_bid_id INT, -- Linked if placed by an Auto-Bid rule
    bid_amount NUMERIC(12, 2) NOT NULL CHECK (bid_amount > 0),
    bid_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bid_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_bid_bidder
        FOREIGN KEY (bidder_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_bid_auto_bid
        FOREIGN KEY (auto_bid_id)
        REFERENCES auto_bids(auto_bid_id)
        ON DELETE SET NULL
);

-- 10. PAYMENT METHODS (User stores Payment Methods)

CREATE TABLE payment_methods (
    method_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    method_name VARCHAR(50) NOT NULL,
    CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 11. WALLETS (User owns Wallet)

CREATE TABLE wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    CONSTRAINT fk_wallet_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 12. WALLET TRANSACTIONS (Wallet logs Wallet Transactions)

CREATE TABLE wallet_transactions (
    wallet_txn_id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_transaction_wallet
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(wallet_id)
        ON DELETE CASCADE
);

-- 13. TRANSACTIONS (Auction closes Transaction; Buyer/Seller; Payment Method)

CREATE TABLE transactions (
    txn_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL UNIQUE,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    winner_bid_id INT,
    payment_method_id INT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    close_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_buyer
        FOREIGN KEY (buyer_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(user_id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_winner_bid
        FOREIGN KEY (winner_bid_id)
        REFERENCES bids(bid_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_transaction_payment_method
        FOREIGN KEY (payment_method_id)
        REFERENCES payment_methods(method_id)
        ON DELETE SET NULL
);

-- 14. SHIPMENTS (Transaction dispatches Shipment to Address)

CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL UNIQUE,
    address_id INT NOT NULL,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_date TIMESTAMP,
    delivery_date TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    CONSTRAINT fk_shipment_transaction
        FOREIGN KEY (txn_id)
        REFERENCES transactions(txn_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_shipment_address
        FOREIGN KEY (address_id)
        REFERENCES addresses(address_id)
        ON DELETE RESTRICT
);

-- 15. REVIEWS (User leaves / earns Review for a completed Transaction)

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,
    comment TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_transaction
        FOREIGN KEY (txn_id)
        REFERENCES transactions(txn_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewer
        FOREIGN KEY (reviewer_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_review_reviewee
        FOREIGN KEY (reviewee_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 16. DISPUTES (User raises Dispute for Transaction; Admin resolves it)

CREATE TABLE disputes (
    dispute_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL,
    raised_by INT NOT NULL,
    resolved_by INT,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    CONSTRAINT fk_dispute_transaction
        FOREIGN KEY (txn_id)
        REFERENCES transactions(txn_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_dispute_user
        FOREIGN KEY (raised_by)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_dispute_admin
        FOREIGN KEY (resolved_by)
        REFERENCES admins(admin_id)
        ON DELETE SET NULL
);

-- 17. NOTIFICATIONS (User receives Notifications triggered by system events)

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- 18. WATCHLIST (User tracks Items in Watchlist)

CREATE TABLE watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_watchlist_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_watchlist_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE,
    CONSTRAINT unique_watchlist_item
        UNIQUE (user_id, item_id)
);

-- Performance & Query Optimization Indexes

CREATE INDEX idx_items_seller_id ON items(seller_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_auctions_item_id ON auctions(item_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_bids_auction_id ON bids(auction_id);
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_auto_bids_auction_id ON auto_bids(auction_id);
CREATE INDEX idx_transactions_auction_id ON transactions(auction_id);
CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX idx_shipments_txn_id ON shipments(txn_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);