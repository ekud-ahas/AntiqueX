-- =====================================================
-- USERS
-- =====================================================

INSERT INTO users (username, full_name, email, password)
VALUES
('john_smith', 'John Smith', 'john@example.com', 'password123'),
('emma_wilson', 'Emma Wilson', 'emma@example.com', 'password123'),
('michael_brown', 'Michael Brown', 'michael@example.com', 'password123'),
('sophia_davis', 'Sophia Davis', 'sophia@example.com', 'password123'),
('william_jones', 'William Jones', 'william@example.com', 'password123');

-- =====================================================
-- CATEGORIES
-- =====================================================

INSERT INTO categories (category_name, description)
VALUES
('Antique Furniture',
 'Historical and collectible furniture'),

('Paintings',
 'Historical and collectible paintings'),

('Jewelry',
 'Antique and vintage jewelry'),

('Coins',
 'Historical and collectible coins');


 -- =====================================================
-- ITEMS
-- =====================================================

INSERT INTO items
(
    seller_id,
    category_id,
    title,
    description,
    year_of_origin,
    condition,
    starting_price
)
VALUES

(
    1,
    1,
    'Sussex Chair, Late 19th Century',
    'Ebonized beech armchair with turned back sections, supports and legs, with a rush seat. Made by Morris & Co.',
    1890,
    'Good',
    15000.00
),

(
    2,
    2,
    'Antique European Landscape Oil Painting',
    '19th-century European landscape oil painting on canvas by Dutch painter Willem Hendriks.',
    1880,
    'Very Good',
    45000.00
),

(
    3,
    3,
    '19th Century Antique Necklace',
    'Historical necklace from the 19th century, preserved in the Cooper Hewitt collection.',
    1850,
    'Good',
    30000.00
),

(
    4,
    4,
    'Early 19th Century Iranian Gold Coin',
    'Historical gold coin from Iran dating to the early 19th century.',
    1820,
    'Good',
    50000.00
);



-- =====================================================
-- ITEM IMAGES
-- =====================================================

INSERT INTO item_images (item_id, img_url)
VALUES

(
    1,
    'https://commons.wikimedia.org/wiki/Special:FilePath/%22Sussex%22_Chair%2C_late_19th_century_%28CH_18700699%29.jpg'
),

(
    2,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Willem_Hendriks_-_0b048fbb61.jpg'
),

(
    3,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Necklace_with_amulet_Necklace%2C_19th_century_%28CH_18386861%29.jpg'
),

(
    4,
    'https://commons.wikimedia.org/wiki/Special:FilePath/Coin%2C_Iran%2C_early_19th_century%2C_gold_-_Aga_Khan_Museum_-_Toronto%2C_Canada_-_DSC07098.jpg'
);


-- =====================================================
-- AUCTIONS
-- =====================================================

INSERT INTO auctions
(
    item_id,
    start_time,
    end_time,
    min_increment,
    status
)
VALUES

(
    1,
    '2026-08-08 10:00:00',
    '2026-08-15 22:00:00',
    1000.00,
    'active'
),

(
    2,
    '2026-08-08 10:00:00',
    '2026-08-18 22:00:00',
    2500.00,
    'active'
),

(
    3,
    '2026-08-09 10:00:00',
    '2026-08-20 22:00:00',
    1500.00,
    'scheduled'
),

(
    4,
    '2026-08-09 10:00:00',
    '2026-08-25 22:00:00',
    2000.00,
    'scheduled'
);



-- =====================================================
-- BIDS
-- =====================================================

INSERT INTO bids
(
    auction_id,
    bidder_id,
    bid_amount
)
VALUES

-- Sussex Chair
(1, 2, 16000.00),
(1, 3, 17000.00),
(1, 4, 18000.00),

-- Willem Hendriks painting
(2, 1, 47500.00),
(2, 5, 50000.00),

-- Necklace
(3, 1, 31500.00),
(3, 4, 33000.00),

-- Iranian gold coin
(4, 2, 52000.00);



-- =====================================================
-- WATCHLIST
-- =====================================================

INSERT INTO watchlist
(
    user_id,
    item_id
)
VALUES

(2, 1),
(3, 1),
(4, 2),
(5, 3),
(1, 4);




-- =====================================================
-- ADDRESSES
-- =====================================================

INSERT INTO addresses
(
    user_id,
    street,
    city,
    postal_code,
    district,
    division
)
VALUES

(
    1,
    '12 Lake Road',
    'Dhaka',
    '1205',
    'Dhaka',
    'Dhaka'
),

(
    2,
    '45 Station Road',
    'Chattogram',
    '4000',
    'Chattogram',
    'Chattogram'
),

(
    3,
    '23 College Road',
    'Khulna',
    '9100',
    'Khulna',
    'Khulna'
),

(
    4,
    '18 Main Street',
    'Rajshahi',
    '6000',
    'Rajshahi',
    'Rajshahi'
),

(
    5,
    '7 University Road',
    'Sylhet',
    '3100',
    'Sylhet',
    'Sylhet'
);


-- =====================================================
-- PAYMENT METHODS
-- =====================================================

INSERT INTO payment_methods
(
    user_id,
    method_name
)
VALUES

(1, 'Credit Card'),
(2, 'Mobile Banking'),
(3, 'Debit Card'),
(4, 'Credit Card'),
(5, 'Bank Transfer');



-- =====================================================
-- WALLETS
-- =====================================================

INSERT INTO wallets
(
    user_id,
    balance
)
VALUES

(1, 100000.00),
(2, 75000.00),
(3, 120000.00),
(4, 95000.00),
(5, 150000.00);



-- =====================================================
-- WALLET TRANSACTIONS
-- =====================================================

INSERT INTO wallet_transactions
(
    wallet_id,
    type,
    amount
)
VALUES

(1, 'deposit', 100000.00),
(2, 'deposit', 75000.00),
(3, 'deposit', 120000.00),
(4, 'deposit', 95000.00),
(5, 'deposit', 150000.00);



