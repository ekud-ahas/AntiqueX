-- =============================================================================
-- AntiqueX Full Reset: Drop all tables, recreate schema, and seed data
-- =============================================================================

-- Drop all tables in reverse dependency order
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
DROP TABLE IF EXISTS revoked_tokens CASCADE;

-- =============================================================================
-- SCHEMA
-- =============================================================================

-- 1. USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    profile_picture_url VARCHAR(255),
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
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
    house VARCHAR(100),
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
    method_name VARCHAR(50) NOT NULL,
    provider VARCHAR(50),
    account_number VARCHAR(100),
    secret_code VARCHAR(100)
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
    item_uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    seller_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
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
    winner_bid_id INT REFERENCES bids(bid_id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. WALLET TRANSACTIONS
CREATE TABLE wallet_transactions (
    wallet_txn_id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    bid_id INT REFERENCES bids(bid_id) ON DELETE SET NULL,
    txn_id INT UNIQUE REFERENCES transactions(txn_id) ON DELETE SET NULL,
    payment_method_id INT REFERENCES payment_methods(method_id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    trx_id VARCHAR(50) UNIQUE DEFAULT ('TRX-' || upper(substr(md5(random()::text), 1, 8))),
    time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. SHIPMENTS
CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    txn_id INT NOT NULL UNIQUE REFERENCES transactions(txn_id) ON DELETE CASCADE,
    address_id INT NOT NULL REFERENCES addresses(address_id) ON DELETE RESTRICT,
    carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    shipping_date TIMESTAMP,
    deliver_date TIMESTAMP,
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
    shipment_id INT NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,
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

-- 19. REVOKED TOKENS
CREATE TABLE IF NOT EXISTS revoked_tokens (
    token_id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- 1. ADMINS
INSERT INTO admins (username, email, password, role) VALUES
('admin', 'admin@antiquex.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e', 'admin'),
('moderator_sarah', 'sarah.mod@antiquex.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e', 'moderator');

-- 2. USERS (Default password: 'password123')
INSERT INTO users (username, full_name, email, password) VALUES
('john_smith', 'John Smith', 'john@example.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e'),
('emma_wilson', 'Emma Wilson', 'emma@example.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e'),
('michael_brown', 'Michael Brown', 'michael@example.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e'),
('sophia_davis', 'Sophia Davis', 'sophia@example.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e'),
('william_jones', 'William Jones', 'william@example.com', '$2b$10$5nfxbX4B52C80wfTZis0AON4YQ0LEgHv7P3I6TB6u0h22s.JyOD7e');

-- 3. CATEGORIES
INSERT INTO categories (admin_id, category_name, description) VALUES
(1, 'Antique Furniture', 'Historical craftsmanship and collectible period furniture'),
(1, 'Fine Art & Paintings', 'Rare 18th-20th century European and Asian fine paintings'),
(2, 'Vintage Jewelry', 'Estate jewelry, authentic gemstones, and period precious ornaments'),
(1, 'Rare Coins & Currency', 'Numismatic treasures, ancient gold coins, and historical banknotes'),
(2, 'Ancient Sculptures', 'Sculptures and statues from classical and ancient eras');

-- 4. ADDRESSES
INSERT INTO addresses (user_id, street, city, postal_code, district, division) VALUES
(1, '12 Lake Road, Gulshan-2', 'Dhaka', '1212', 'Dhaka', 'Dhaka'),
(2, '45 Station Road, Agrabad', 'Chattogram', '4000', 'Chattogram', 'Chattogram'),
(3, '23 College Road, Sonadanga', 'Khulna', '9100', 'Khulna', 'Khulna'),
(4, '18 Main Street, Boalia', 'Rajshahi', '6000', 'Rajshahi', 'Rajshahi'),
(5, '7 University Road, Zindabazar', 'Sylhet', '3100', 'Sylhet', 'Sylhet');

-- 5. PAYMENT METHODS
INSERT INTO payment_methods (user_id, method_name) VALUES
(1, 'Visa Credit Card (****4242)'),
(2, 'bKash Mobile Banking'),
(3, 'Mastercard Debit Card (****8812)'),
(4, 'Nagad Mobile Banking'),
(5, 'Bank Wire Transfer');

-- 6. WALLETS
INSERT INTO wallets (user_id, balance) VALUES
(1, 185000.00),
(2, 198000.00),
(3, 120000.00),
(4,  82000.00),
(5, 150000.00);

-- 7. ITEMS
INSERT INTO items (seller_id, category_id, title, description, year_of_origin, condition, starting_price) VALUES
(1, 1, 'Sussex Chair, Late 19th Century', 'Ebonized beech armchair with turned back sections and rush seat. Made by Morris & Co.', 1890, 'Good', 15000.00),
(2, 2, 'Antique European Landscape Oil Painting', '19th-century European landscape oil on canvas by Dutch painter Willem Hendriks.', 1880, 'Very Good', 45000.00),
(3, 3, '19th Century Antique Gold & Emerald Necklace', 'Historical necklace with fine emeralds preserved in museum-grade velvet casing.', 1850, 'Excellent', 30000.00),
(4, 4, 'Early 19th Century Iranian Gold Toman Coin', 'Rare historical gold coin from Qajar Dynasty Iran dating to the early 19th century.', 1820, 'Good', 50000.00),
(5, 5, 'Roman Bronze Centurion Figurine', 'Authentic excavated bronze figurine with natural green patina.', 200, 'Fair', 25000.00);

-- 8. ITEM IMAGES
INSERT INTO item_images (item_id, img_url) VALUES
(1, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Antique%20chair%20(23094768876).jpg'),
(2, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Willem%20Hendriks%20-%200b048fbb61.jpg'),
(3, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/British%20Museum%20Roman%20Empire%2018022019%20Emeralds%20and%20gold%20necklace%205806.jpg'),
(4, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Iran%20AH1314%20(c.1896)%2010%20Toman.jpg'),
(5, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Roman%20Bronze%20Statuette%20of%20a%20Gladiator,%20100-200%20AD%20(10458504904).jpg');

-- 9. AUCTIONS
INSERT INTO auctions (item_id, start_time, end_time, min_increment, status) VALUES
(1, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 1000.00, 'ended'),
(2, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '1 day',  2500.00, 'ended'),
(3, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '5 days', 1500.00, 'active'),
(4, CURRENT_TIMESTAMP - INTERVAL '1 day',  CURRENT_TIMESTAMP + INTERVAL '6 days', 2000.00, 'active'),
(5, CURRENT_TIMESTAMP - INTERVAL '6 hours',CURRENT_TIMESTAMP + INTERVAL '7 days', 1000.00, 'active');

-- 10. AUTO-BIDS
INSERT INTO auto_bids (user_id, increment, max_amount) VALUES
(4, 1000.00, 20000.00),
(5, 2500.00, 60000.00),
(1, 1500.00, 40000.00);

-- 11. BIDS
INSERT INTO bids (auction_id, bidder_id, auto_bid_id, bid_amount, bid_time) VALUES
(1, 2, NULL, 16000.00, CURRENT_TIMESTAMP - INTERVAL '6 days'),
(1, 3, NULL, 17000.00, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(1, 4, 1,   18000.00, CURRENT_TIMESTAMP - INTERVAL '3 days'),
(2, 1, NULL, 47500.00, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(2, 5, 2,   50000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 2, NULL, 31500.00, CURRENT_TIMESTAMP - INTERVAL '20 hours'),
(3, 1, 3,   33000.00, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
(4, 2, NULL, 52000.00, CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- Link winning bids to ended auctions
UPDATE auctions SET winner_bid_id = 3 WHERE auction_id = 1;
UPDATE auctions SET winner_bid_id = 5 WHERE auction_id = 2;

-- 12. TRANSACTIONS
INSERT INTO transactions (auction_id, winner_bid_id, amount, payment_status, date) VALUES
(1, 3, 18000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 5, 50000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- 13. WALLET TRANSACTIONS
INSERT INTO wallet_transactions (wallet_id, bid_id, txn_id, type, amount, time) VALUES
-- Initial deposits
(1, NULL, NULL, 'deposit', 200000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(2, NULL, NULL, 'deposit', 200000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(3, NULL, NULL, 'deposit', 120000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(4, NULL, NULL, 'deposit', 100000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(5, NULL, NULL, 'deposit', 200000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
-- Escrow holds at bid time (txn_id is NULL — transaction not yet created)
(2, 1,   NULL, 'bid_escrow',    16000.00, CURRENT_TIMESTAMP - INTERVAL '6 days'),
(3, 2,   NULL, 'bid_escrow',    17000.00, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(4, 3,   NULL, 'bid_escrow',    18000.00, CURRENT_TIMESTAMP - INTERVAL '3 days'),
(1, 4,   NULL, 'bid_escrow',    47500.00, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(5, 5,   NULL, 'bid_escrow',    50000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- Auction 1 settlement: losers refunded, seller gets proceeds (txn_id=1)
(2, 1,   NULL, 'bid_refund',    16000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 2,   NULL, 'bid_refund',    17000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
(1, NULL, 1,   'sale_proceeds', 18000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- Auction 2 settlement: loser refunded, seller gets proceeds (txn_id=2)
(1, 4,   NULL, 'bid_refund',    47500.00, CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, NULL, 2,   'sale_proceeds', 50000.00, CURRENT_TIMESTAMP - INTERVAL '1 day'),
-- Active auction 3: User 2 outbid by User 1 (immediate refund), User 1 holds escrow
(2, 6,   NULL, 'bid_escrow',    31500.00, CURRENT_TIMESTAMP - INTERVAL '20 hours'),
(2, 6,   NULL, 'bid_refund',    31500.00, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
(1, 7,   NULL, 'bid_escrow',    33000.00, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
-- Active auction 4: User 2 holds escrow
(2, 8,   NULL, 'bid_escrow',    52000.00, CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- 14. SHIPMENTS
INSERT INTO shipments (txn_id, address_id, carrier, tracking_number, shipping_date, deliver_date, status) VALUES
(1, 4, 'DHL Express',    'DHL-8921-9901', CURRENT_TIMESTAMP - INTERVAL '36 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours', 'delivered'),
(2, 5, 'FedEx Priority', 'FDX-7731-4412', CURRENT_TIMESTAMP - INTERVAL '18 hours', NULL, 'in_transit');

-- 15. REVIEWS
INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, comment, rating, date) VALUES
(1, 4, 1, 'The Sussex Chair arrived in pristine condition, very well packaged!', 5, CURRENT_TIMESTAMP - INTERVAL '10 hours'),
(1, 1, 4, 'Prompt payment, courteous buyer. Excellent transaction!', 5, CURRENT_TIMESTAMP - INTERVAL '8 hours');

-- 16. DISPUTES
INSERT INTO disputes (shipment_id, raised_by, resolved_by, status, date, reason) VALUES
(2, 5, 1, 'resolved', CURRENT_TIMESTAMP - INTERVAL '20 hours', 'Inquired regarding tracking update delay on international transit. Admin verified courier customs clearance.');

-- 17. NOTIFICATIONS
INSERT INTO notifications (user_id, type, message, created_at, is_read) VALUES
(4, 'auction_won',      'Congratulations! You won the auction for Sussex Chair, Late 19th Century. Payment of BDT 18,000 has been finalized and your shipment is being prepared.', CURRENT_TIMESTAMP - INTERVAL '2 days', TRUE),
(1, 'item_sold',        'Your item "Sussex Chair, Late 19th Century" was sold for BDT 18,000. Funds have been credited to your wallet.', CURRENT_TIMESTAMP - INTERVAL '2 days', TRUE),
(5, 'auction_won',      'Congratulations! You won the auction for Antique European Landscape Oil Painting. Payment of BDT 50,000 has been finalized and your shipment is in transit.', CURRENT_TIMESTAMP - INTERVAL '1 day', TRUE),
(2, 'item_sold',        'Your item "Antique European Landscape Oil Painting" was sold for BDT 50,000. Funds have been credited to your wallet.', CURRENT_TIMESTAMP - INTERVAL '1 day', TRUE),
(2, 'outbid_alert',     'You have been outbid on "19th Century Antique Gold & Emerald Necklace". Your bid of BDT 31,500 has been refunded to your wallet.', CURRENT_TIMESTAMP - INTERVAL '12 hours', FALSE),
(1, 'wallet_deposit',   'Successfully deposited BDT 200,000 into your AntiqueX wallet via VISA.', CURRENT_TIMESTAMP - INTERVAL '8 days', TRUE),
(2, 'wallet_deposit',   'Successfully deposited BDT 200,000 into your AntiqueX wallet via BKASH.', CURRENT_TIMESTAMP - INTERVAL '8 days', TRUE);

-- 18. WATCHLIST
INSERT INTO watchlist (user_id, item_id, date) VALUES
(1, 4, CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 1, CURRENT_TIMESTAMP - INTERVAL '6 days'),
(3, 1, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(4, 2, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(5, 3, CURRENT_TIMESTAMP - INTERVAL '2 days');
