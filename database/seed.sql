-- ============================================================================
-- AntiqueX Database Seed Data
-- Populates comprehensive sample data for all 18 tables matching the ERD
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADMINS
-- ----------------------------------------------------------------------------
INSERT INTO admins (username, email, password, role) VALUES
('admin', 'admin@antiquex.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD', 'super_admin'),
('moderator_sarah', 'sarah.mod@antiquex.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD', 'moderator');


-- ----------------------------------------------------------------------------
-- 2. USERS
-- ----------------------------------------------------------------------------
INSERT INTO users (username, full_name, email, password) VALUES
('john_smith', 'John Smith', 'john@example.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD'),
('emma_wilson', 'Emma Wilson', 'emma@example.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD'),
('michael_brown', 'Michael Brown', 'michael@example.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD'),
('sophia_davis', 'Sophia Davis', 'sophia@example.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD'),
('william_jones', 'William Jones', 'william@example.com', '$2b$10$wOaUj5x9b3vK2eQ9qZ7Ype7XjJqC8vL7tW6uR5eT4yU3iO2pA1sD');


-- ----------------------------------------------------------------------------
-- 3. ADDRESSES
-- ----------------------------------------------------------------------------
INSERT INTO addresses (user_id, street, city, postal_code, district, division) VALUES
(1, '12 Lake Road, Gulshan-2', 'Dhaka', '1212', 'Dhaka', 'Dhaka'),
(2, '45 Station Road, Agrabad', 'Chattogram', '4000', 'Chattogram', 'Chattogram'),
(3, '23 College Road, Sonadanga', 'Khulna', '9100', 'Khulna', 'Khulna'),
(4, '18 Main Street, Boalia', 'Rajshahi', '6000', 'Rajshahi', 'Rajshahi'),
(5, '7 University Road, Zindabazar', 'Sylhet', '3100', 'Sylhet', 'Sylhet');


-- ----------------------------------------------------------------------------
-- 4. CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO categories (category_name, description) VALUES
('Antique Furniture', 'Historical craftsmanship and collectible period furniture'),
('Fine Art & Paintings', 'Rare 18th-20th century European and Asian fine paintings'),
('Vintage Jewelry', 'Estate jewelry, authentic gemstones, and period precious ornaments'),
('Rare Coins & Currency', 'Numismatic treasures, ancient gold coins, and historical banknotes'),
('Ancient Sculptures', 'Sculptures and statues from classical and ancient eras');


-- ----------------------------------------------------------------------------
-- 5. ITEMS
-- ----------------------------------------------------------------------------
INSERT INTO items (seller_id, category_id, admin_id, title, description, year_of_origin, condition, starting_price) VALUES
(1, 1, 1, 'Sussex Chair, Late 19th Century', 'Ebonized beech armchair with turned back sections and rush seat. Made by Morris & Co.', 1890, 'Good', 15000.00),
(2, 2, 1, 'Antique European Landscape Oil Painting', '19th-century European landscape oil on canvas by Dutch painter Willem Hendriks.', 1880, 'Very Good', 45000.00),
(3, 3, 2, '19th Century Antique Gold & Emerald Necklace', 'Historical necklace with fine emeralds preserved in museum-grade velvet casing.', 1850, 'Excellent', 30000.00),
(4, 4, 1, 'Early 19th Century Iranian Gold Toman Coin', 'Rare historical gold coin from Qajar Dynasty Iran dating to the early 19th century.', 1820, 'Good', 50000.00),
(5, 5, 2, 'Roman Bronze Centurion Figurine', 'Authentic excavated bronze figurine with natural green patina.', 200, 'Fair', 25000.00);


-- ----------------------------------------------------------------------------
-- 6. ITEM IMAGES
-- ----------------------------------------------------------------------------
INSERT INTO item_images (item_id, img_url) VALUES
(1, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Antique%20chair%20(23094768876).jpg'),
(2, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Willem%20Hendriks%20-%200b048fbb61.jpg'),
(3, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/British%20Museum%20Roman%20Empire%2018022019%20Emeralds%20and%20gold%20necklace%205806.jpg'),
(4, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Iran%20AH1314%20(c.1896)%2010%20Toman.jpg'),
(5, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Roman%20Bronze%20Statuette%20of%20a%20Gladiator,%20100-200%20AD%20(10458504904).jpg');

-- ----------------------------------------------------------------------------
-- 7. AUCTIONS
-- ----------------------------------------------------------------------------
INSERT INTO auctions (item_id, start_time, end_time, min_increment, status) VALUES
(1, '2026-08-01 10:00:00', '2026-08-05 22:00:00', 1000.00, 'ended'),
(2, '2026-08-10 10:00:00', '2026-08-20 22:00:00', 2500.00, 'ended'),
(3, '2026-08-20 10:00:00', '2026-08-30 22:00:00', 1500.00, 'active'),
(4, '2026-08-22 10:00:00', '2026-09-02 22:00:00', 2000.00, 'active'),
(5, '2026-09-01 10:00:00', '2026-09-15 22:00:00', 1000.00, 'scheduled');


-- ----------------------------------------------------------------------------
-- 8. AUTO-BIDS
-- ----------------------------------------------------------------------------
INSERT INTO auto_bids (auction_id, user_id, increment, max_amount) VALUES
(1, 4, 1000.00, 20000.00),
(2, 5, 2500.00, 60000.00),
(3, 1, 1500.00, 40000.00);


-- ----------------------------------------------------------------------------
-- 9. BIDS
-- ----------------------------------------------------------------------------
INSERT INTO bids (auction_id, bidder_id, auto_bid_id, bid_amount, bid_time) VALUES
(1, 2, NULL, 16000.00, '2026-08-02 11:00:00'),
(1, 3, NULL, 17000.00, '2026-08-03 14:30:00'),
(1, 4, 1, 18000.00, '2026-08-04 18:00:00'),
(2, 1, NULL, 47500.00, '2026-08-12 12:00:00'),
(2, 5, 2, 50000.00, '2026-08-15 16:45:00'),
(3, 2, NULL, 31500.00, '2026-08-21 09:15:00'),
(3, 1, 3, 33000.00, '2026-08-22 10:30:00'),
(4, 2, NULL, 52000.00, '2026-08-23 15:00:00');


-- ----------------------------------------------------------------------------
-- 10. PAYMENT METHODS
-- ----------------------------------------------------------------------------
INSERT INTO payment_methods (user_id, method_name) VALUES
(1, 'Credit Card (Visa ****4242)'),
(2, 'bKash / Mobile Banking'),
(3, 'Debit Card (Mastercard ****8812)'),
(4, 'Credit Card (Amex ****1005)'),
(5, 'Bank Wire Transfer');


-- ----------------------------------------------------------------------------
-- 11. WALLETS
-- ----------------------------------------------------------------------------
INSERT INTO wallets (user_id, balance) VALUES
(1, 150000.00),
(2, 75000.00),
(3, 120000.00),
(4, 95000.00),
(5, 200000.00);


-- ----------------------------------------------------------------------------
-- 12. WALLET TRANSACTIONS
-- ----------------------------------------------------------------------------
INSERT INTO wallet_transactions (wallet_id, type, amount, transaction_time) VALUES
(1, 'deposit', 150000.00, '2026-08-01 09:00:00'),
(2, 'deposit', 75000.00, '2026-08-01 09:15:00'),
(3, 'deposit', 120000.00, '2026-08-01 09:30:00'),
(4, 'deposit', 95000.00, '2026-08-01 09:45:00'),
(5, 'deposit', 200000.00, '2026-08-01 10:00:00');


-- ----------------------------------------------------------------------------
-- 13. TRANSACTIONS
-- ----------------------------------------------------------------------------
INSERT INTO transactions (auction_id, buyer_id, seller_id, winner_bid_id, payment_method_id, amount, payment_status, close_date) VALUES
(1, 4, 1, 3, 4, 18000.00, 'completed', '2026-08-05 22:05:00'),
(2, 5, 2, 5, 5, 50000.00, 'completed', '2026-08-20 22:05:00');


-- ----------------------------------------------------------------------------
-- 14. SHIPMENTS
-- ----------------------------------------------------------------------------
INSERT INTO shipments (txn_id, address_id, carrier, tracking_number, shipping_date, delivery_date, status) VALUES
(1, 4, 'DHL Express', 'DHL-8921-9901', '2026-08-06 10:00:00', '2026-08-09 14:30:00', 'delivered'),
(2, 5, 'FedEx Priority', 'FDX-7731-4412', '2026-08-21 11:30:00', NULL, 'in_transit');


-- ----------------------------------------------------------------------------
-- 15. REVIEWS
-- ----------------------------------------------------------------------------
INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, comment, rating, date) VALUES
(1, 4, 1, 'The Sussex Chair arrived in pristine condition, very well packaged!', 5, '2026-08-10 16:00:00'),
(1, 1, 4, 'Prompt payment, courteous buyer. Excellent transaction!', 5, '2026-08-10 17:30:00');


-- ----------------------------------------------------------------------------
-- 16. DISPUTES
-- ----------------------------------------------------------------------------
INSERT INTO disputes (txn_id, raised_by, resolved_by, status, date, reason) VALUES
(2, 5, 1, 'resolved', '2026-08-22 09:00:00', 'Inquired regarding tracking update delay on international transit. Admin verified courier customs clearance.');


-- ----------------------------------------------------------------------------
-- 17. NOTIFICATIONS
-- ----------------------------------------------------------------------------
INSERT INTO notifications (user_id, type, message, created_at, is_read) VALUES
(4, 'auction_win', 'Congratulations! You won the auction for Sussex Chair, Late 19th Century.', '2026-08-05 22:05:00', TRUE),
(1, 'item_sold', 'Your item "Sussex Chair" was sold for 18,000 BDT.', '2026-08-05 22:05:00', TRUE),
(5, 'outbid_alert', 'You were outbid on 19th Century Antique Gold & Emerald Necklace.', '2026-08-22 10:30:00', FALSE),
(2, 'payment_received', 'Payment of 50,000 BDT received for European Landscape Oil Painting.', '2026-08-20 22:10:00', TRUE);


-- ----------------------------------------------------------------------------
-- 18. WATCHLIST
-- ----------------------------------------------------------------------------
INSERT INTO watchlist (user_id, item_id, date) VALUES
(1, 4, '2026-08-22 11:00:00'),
(2, 1, '2026-08-02 08:30:00'),
(3, 1, '2026-08-02 09:00:00'),
(4, 2, '2026-08-11 14:00:00'),
(5, 3, '2026-08-20 18:00:00');
