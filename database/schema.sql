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

-- 3. CATEGORIES
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    admin_id INT REFERENCES admins(admin_id) ON DELETE SET NULL,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 4. ADDRESSES
CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    street VARCHAR(150),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    district VARCHAR(100),
    division VARCHAR(100)
);

-- 5. PAYMENT METHODS
CREATE TABLE payment_methods (
    method_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    method_name VARCHAR(50) NOT NULL
);

-- 6. WALLETS
CREATE TABLE wallets (
    wallet_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0)
);

-- 7. ITEMS
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

-- 8. ITEM IMAGES
CREATE TABLE item_images (
    img_id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    img_url TEXT NOT NULL
);

-- 9. AUCTIONS
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

-- 10. AUTO-BIDS
CREATE TABLE auto_bids (
    auto_bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL REFERENCES auctions(auction_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    increment NUMERIC(12, 2) NOT NULL CHECK (increment > 0),
    max_amount NUMERIC(12, 2) NOT NULL CHECK (max_amount > 0)
);

-- 11. BIDS
CREATE TABLE bids (
    bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL REFERENCES auctions(auction_id) ON DELETE CASCADE,
    bidder_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    auto_bid_id INT REFERENCES auto_bids(auto_bid_id) ON DELETE SET NULL,
    bid_amount NUMERIC(12, 2) NOT NULL CHECK (bid_amount > 0),
    bid_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign Key to link Auction winner_bid_id to Bids
ALTER TABLE auctions
    ADD CONSTRAINT fk_auctions_winner_bid
    FOREIGN KEY (winner_bid_id)
    REFERENCES bids(bid_id)
    ON DELETE SET NULL;

-- 12. TRANSACTIONS
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

-- 13. WALLET TRANSACTIONS
CREATE TABLE wallet_transactions (
    wallet_txn_id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    txn_id INT UNIQUE REFERENCES transactions(txn_id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. SHIPMENTS
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

-- 15. REVIEWS
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL REFERENCES transactions(txn_id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    comment TEXT,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. DISPUTES
CREATE TABLE disputes (
    dispute_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL REFERENCES transactions(txn_id) ON DELETE CASCADE,
    raised_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    resolved_by INT REFERENCES admins(admin_id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- 17. NOTIFICATIONS
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- 18. WATCHLIST
CREATE TABLE watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);