CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL
);

CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'admin'
);


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


CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,

    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    admin_id INT,

    title VARCHAR(200) NOT NULL,
    description TEXT,
    year_of_origin INT,
    condition VARCHAR(100),
    starting_price NUMERIC(12,2) NOT NULL
        CHECK (starting_price >= 0),

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


CREATE TABLE item_images (
    img_id SERIAL PRIMARY KEY,

    item_id INT NOT NULL,
    img_url TEXT NOT NULL,

    CONSTRAINT fk_image_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE
);


CREATE TABLE auctions (
    auction_id SERIAL PRIMARY KEY,

    item_id INT NOT NULL UNIQUE,

    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,

    min_increment NUMERIC(12,2) NOT NULL
        CHECK (min_increment > 0),

    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',

    winner_bid_id INT,

    CONSTRAINT fk_auction_item
        FOREIGN KEY (item_id)
        REFERENCES items(item_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_auction_time
        CHECK (end_time > start_time)
);


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

ALTER TABLE auctions
ADD CONSTRAINT fk_auction_winner_bid
FOREIGN KEY (winner_bid_id)
REFERENCES bids(bid_id)
ON DELETE SET NULL;


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



CREATE TABLE payment_methods (
    method_id SERIAL PRIMARY KEY,

    user_id INT NOT NULL,
    method_name VARCHAR(50) NOT NULL,

    CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);


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