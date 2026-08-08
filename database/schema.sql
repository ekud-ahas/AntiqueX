-- =========================================================
-- AntiqueX Database
-- PostgreSQL Database Schema
-- =========================================================


-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL
);


-- =========================================================
-- 2. ADDRESSES
-- =========================================================

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


-- =========================================================
-- 3. CATEGORIES
-- =========================================================

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


-- =========================================================
-- 4. ITEMS
-- =========================================================

CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,

    seller_id INT NOT NULL,
    category_id INT NOT NULL,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    year_of_origin INT,
    condition VARCHAR(100),
    starting_price NUMERIC(12,2) NOT NULL CHECK (starting_price >= 0),

    CONSTRAINT fk_item_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_item_category
        FOREIGN KEY (category_id)
        REFERENCES categories(category_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 5. ITEM IMAGES
-- =========================================================

CREATE TABLE item_images (
    img_id SERIAL PRIMARY KEY,

    item_id INT NOT NULL,
    img_url TEXT NOT NULL,

    CONSTRAINT fk_image_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 6. AUCTIONS
-- =========================================================

CREATE TABLE auctions (
    auction_id SERIAL PRIMARY KEY,

    item_id INT NOT NULL UNIQUE,

    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,

    min_increment NUMERIC(12,2) NOT NULL
        CHECK (min_increment > 0),

    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',

    CONSTRAINT fk_auction_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_auction_time
        CHECK (end_time > start_time)
);


-- =========================================================
-- 7. BIDS
-- =========================================================

CREATE TABLE bids (
    bid_id SERIAL PRIMARY KEY,

    auction_id INT NOT NULL,
    bidder_id INT NOT NULL,

    bid_amount NUMERIC(12,2) NOT NULL
        CHECK (bid_amount > 0),

    bid_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bid_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_bid_bidder
        FOREIGN KEY (bidder_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 8. WATCHLIST
-- =========================================================

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


-- =========================================================
-- 9. PAYMENT METHODS
-- =========================================================

CREATE TABLE payment_methods (
    method_id SERIAL PRIMARY KEY,

    user_id INT NOT NULL,
    method_name VARCHAR(50) NOT NULL,

    CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 10. WALLETS
-- =========================================================

CREATE TABLE wallets (
    wallet_id SERIAL PRIMARY KEY,

    user_id INT NOT NULL UNIQUE,

    balance NUMERIC(12,2) NOT NULL DEFAULT 0
        CHECK (balance >= 0),

    CONSTRAINT fk_wallet_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 11. WALLET TRANSACTIONS
-- =========================================================

CREATE TABLE wallet_transactions (
    wallet_txn_id SERIAL PRIMARY KEY,

    wallet_id INT NOT NULL,

    type VARCHAR(30) NOT NULL,
    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

    transaction_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wallet_transaction_wallet
        FOREIGN KEY (wallet_id)
        REFERENCES wallets(wallet_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 12. TRANSACTIONS
-- =========================================================

CREATE TABLE transactions (
    txn_id SERIAL PRIMARY KEY,

    auction_id INT NOT NULL UNIQUE,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    winner_bid_id INT,

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount >= 0),

    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    close_date TIMESTAMP,

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
        ON DELETE SET NULL
);


-- =========================================================
-- 13. SHIPMENTS
-- =========================================================

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


-- =========================================================
-- 14. REVIEWS
-- =========================================================

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,

    txn_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,

    comment TEXT,

    rating INT NOT NULL
        CHECK (rating BETWEEN 1 AND 5),

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


-- =========================================================
-- 15. DISPUTES
-- =========================================================

CREATE TABLE disputes (
    dispute_id SERIAL PRIMARY KEY,

    txn_id INT NOT NULL,
    raised_by INT NOT NULL,

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
        ON DELETE CASCADE
);


-- =========================================================
-- 16. AUTO-BIDS
-- =========================================================

CREATE TABLE auto_bids (
    auto_bid_id SERIAL PRIMARY KEY,

    auction_id INT NOT NULL,
    user_id INT NOT NULL,

    increment NUMERIC(12,2) NOT NULL
        CHECK (increment > 0),

    max_amount NUMERIC(12,2) NOT NULL
        CHECK (max_amount > 0),

    CONSTRAINT fk_auto_bid_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(auction_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_auto_bid_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);