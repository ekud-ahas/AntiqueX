-- =============================================================================
-- AntiqueX Database Seed Data
-- 18 Relational Entities matching the ERD
-- =============================================================================

-- 1. ADMINS
-- Default password for all accounts: 'password123'
-- Roles: 'admin' (full control) | 'moderator' (items/auctions only)
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

-- 3. CATEGORIES (Admin manages Categories)
INSERT INTO categories (admin_id, category_name, description) VALUES
(1, 'Antique Furniture', 'Historical craftsmanship and collectible period furniture'),
(1, 'Fine Art & Paintings', 'Rare 18th-20th century European and Asian fine paintings'),
(2, 'Vintage Jewelry', 'Estate jewelry, authentic gemstones, and period precious ornaments'),
(1, 'Rare Coins & Currency', 'Numismatic treasures, ancient gold coins, and historical banknotes'),
(2, 'Ancient Sculptures', 'Sculptures and statues from classical and ancient eras');

-- 4. ADDRESSES (User has Addresses)
INSERT INTO addresses (user_id, street, city, postal_code, district, division) VALUES
(1, '12 Lake Road, Gulshan-2', 'Dhaka', '1212', 'Dhaka', 'Dhaka'),
(2, '45 Station Road, Agrabad', 'Chattogram', '4000', 'Chattogram', 'Chattogram'),
(3, '23 College Road, Sonadanga', 'Khulna', '9100', 'Khulna', 'Khulna'),
(4, '18 Main Street, Boalia', 'Rajshahi', '6000', 'Rajshahi', 'Rajshahi'),
(5, '7 University Road, Zindabazar', 'Sylhet', '3100', 'Sylhet', 'Sylhet');

-- 5. PAYMENT METHODS (User stores Payment Method — used only for wallet top-up deposits)
INSERT INTO payment_methods (user_id, method_name) VALUES
(1, 'Visa Credit Card (****4242)'),
(2, 'bKash Mobile Banking'),
(3, 'Mastercard Debit Card (****8812)'),
(4, 'Nagad Mobile Banking'),
(5, 'Bank Wire Transfer');

-- 6. WALLETS (User owns Wallet)
-- Balances reflect net position AFTER escrow holds for active bids below:
--   Auction 3 (Jewelry): User 2 bid 31,500 (held), User 1 bid 33,000 (held, outbid User 2 refunded 31,500)
--   Auction 4 (Coins):   User 2 bid 52,000 (held)
--   Auction 5 (Sculpture): No active bids from seed (clean start for demo)
--   Ended auctions: User 4 won auction 1 (18,000 paid to User 1); User 5 won auction 2 (50,000 paid to User 2)
-- Starting deposits: U1=200k, U2=200k, U3=120k, U4=100k, U5=200k
-- U1: 200,000 + 18,000 (sale) - 33,000 (escrow hold auction 3) = 185,000
-- U2: 200,000 + 50,000 (sale) - 52,000 (escrow hold auction 4) = 198,000
-- U3: 120,000 (no active bids)
-- U4: 100,000 - 18,000 (paid auction 1 winner) = 82,000
-- U5: 200,000 - 50,000 (paid auction 2 winner) = 150,000
INSERT INTO wallets (user_id, balance) VALUES
(1, 185000.00),
(2, 198000.00),
(3, 120000.00),
(4,  82000.00),
(5, 150000.00);

-- 7. ITEMS (User lists Item; Category sorts Item)
INSERT INTO items (seller_id, category_id, title, description, year_of_origin, condition, starting_price) VALUES
(1, 1, 'Sussex Chair, Late 19th Century', 'Ebonized beech armchair with turned back sections and rush seat. Made by Morris & Co.', 1890, 'Good', 15000.00),
(2, 2, 'Antique European Landscape Oil Painting', '19th-century European landscape oil on canvas by Dutch painter Willem Hendriks.', 1880, 'Very Good', 45000.00),
(3, 3, '19th Century Antique Gold & Emerald Necklace', 'Historical necklace with fine emeralds preserved in museum-grade velvet casing.', 1850, 'Excellent', 30000.00),
(4, 4, 'Early 19th Century Iranian Gold Toman Coin', 'Rare historical gold coin from Qajar Dynasty Iran dating to the early 19th century.', 1820, 'Good', 50000.00),
(5, 5, 'Roman Bronze Centurion Figurine', 'Authentic excavated bronze figurine with natural green patina.', 200, 'Fair', 25000.00);

-- 8. ITEM IMAGES (Item displays Item Images)
INSERT INTO item_images (item_id, img_url) VALUES
(1, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Antique%20chair%20(23094768876).jpg'),
(2, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Willem%20Hendriks%20-%200b048fbb61.jpg'),
(3, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/British%20Museum%20Roman%20Empire%2018022019%20Emeralds%20and%20gold%20necklace%205806.jpg'),
(4, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Iran%20AH1314%20(c.1896)%2010%20Toman.jpg'),
(5, 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Roman%20Bronze%20Statuette%20of%20a%20Gladiator,%20100-200%20AD%20(10458504904).jpg');

-- 9. AUCTIONS (Item opens Auction)
-- Auctions 1 & 2: ended (historical, for transaction/review demo data)
-- Auctions 3, 4, 5: currently active with generous end windows for live demo
INSERT INTO auctions (item_id, start_time, end_time, min_increment, status) VALUES
(1, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 1000.00, 'ended'),
(2, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '1 day',  2500.00, 'ended'),
(3, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '5 days', 1500.00, 'active'),
(4, CURRENT_TIMESTAMP - INTERVAL '1 day',  CURRENT_TIMESTAMP + INTERVAL '6 days', 2000.00, 'active'),
(5, CURRENT_TIMESTAMP - INTERVAL '6 hours',CURRENT_TIMESTAMP + INTERVAL '7 days', 1000.00, 'active');

-- 10. AUTO-BIDS (User allows Auto-Bid)
INSERT INTO auto_bids (user_id, increment, max_amount) VALUES
(4, 1000.00, 20000.00),
(5, 2500.00, 60000.00),
(1, 1500.00, 40000.00);

-- 11. BIDS (User submits Bid; Auction collects Bid)
-- Ended auctions: historical bids are fine as-is (escrow was settled at close)
-- Active auctions: bids reflect escrow holds accounted for in wallet balances above
INSERT INTO bids (auction_id, bidder_id, auto_bid_id, bid_amount, bid_time) VALUES
-- Ended auction 1 bids (historical)
(1, 2, NULL, 16000.00, CURRENT_TIMESTAMP - INTERVAL '6 days'),
(1, 3, NULL, 17000.00, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(1, 4, 1,   18000.00, CURRENT_TIMESTAMP - INTERVAL '3 days'),
-- Ended auction 2 bids (historical)
(2, 1, NULL, 47500.00, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(2, 5, 2,   50000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- Active auction 3 bids (Jewelry — User 2 outbid by User 1; only User 1's 33,000 held)
(3, 2, NULL, 31500.00, CURRENT_TIMESTAMP - INTERVAL '20 hours'),
(3, 1, 3,   33000.00, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
-- Active auction 4 bids (Coins — User 2 holds 52,000 escrow)
(4, 2, NULL, 52000.00, CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- Link winning bids to ended auctions
UPDATE auctions SET winner_bid_id = 3 WHERE auction_id = 1;
UPDATE auctions SET winner_bid_id = 5 WHERE auction_id = 2;

-- 12. TRANSACTIONS (Auction closes Transaction)
INSERT INTO transactions (auction_id, winner_bid_id, amount, payment_status, date) VALUES
(1, 3, 18000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 5, 50000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- 13. WALLET TRANSACTIONS (Wallet logs wallet activity)
-- Records the full financial history matching the wallet balances above
INSERT INTO wallet_transactions (wallet_id, bid_id, txn_id, type, amount, time) VALUES
-- Initial deposits (all users topped up their wallets)
(1, NULL, NULL, 'deposit', 200000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(2, NULL, NULL, 'deposit', 200000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(3, NULL, NULL, 'deposit', 120000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(4, NULL, NULL, 'deposit', 100000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
(5, NULL, NULL, 'deposit', 200000.00, CURRENT_TIMESTAMP - INTERVAL '8 days'),
-- Auction 1 settlement: User 4 paid 18,000 (escrow), User 1 received sale proceeds
(4, 3,   1,    'bid_escrow',    18000.00, CURRENT_TIMESTAMP - INTERVAL '3 days'),
(1, NULL, 1,   'sale_proceeds', 18000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- Auction 1: User 2 (bid 16k) and User 3 (bid 17k) lost, their escrow was refunded at close
(2, 1,   NULL, 'bid_escrow',    16000.00, CURRENT_TIMESTAMP - INTERVAL '6 days'),
(2, 1,   NULL, 'bid_refund',    16000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
(3, 2,   NULL, 'bid_escrow',    17000.00, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(3, 2,   NULL, 'bid_refund',    17000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
-- Auction 2 settlement: User 5 paid 50,000, User 2 received sale proceeds
(5, 5,   2,    'bid_escrow',    50000.00, CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, NULL, 2,   'sale_proceeds', 50000.00, CURRENT_TIMESTAMP - INTERVAL '1 day'),
-- Auction 2: User 1 (bid 47.5k) lost, refunded at close
(1, 4,   NULL, 'bid_escrow',    47500.00, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(1, 4,   NULL, 'bid_refund',    47500.00, CURRENT_TIMESTAMP - INTERVAL '1 day'),
-- Active auction 3: User 2 bid 31,500 then was outbid by User 1 (31,500 refunded to User 2 immediately)
(2, 6,   NULL, 'bid_escrow',    31500.00, CURRENT_TIMESTAMP - INTERVAL '20 hours'),
(2, 6,   NULL, 'bid_refund',    31500.00, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
-- Active auction 3: User 1 holds 33,000 (current top bidder)
(1, 7,   NULL, 'bid_escrow',    33000.00, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
-- Active auction 4: User 2 holds 52,000 (current top bidder)
(2, 8,   NULL, 'bid_escrow',    52000.00, CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- 14. SHIPMENTS (Transaction dispatches Shipment)
INSERT INTO shipments (txn_id, address_id, carrier, tracking_number, shipping_date, deliver_date, status) VALUES
(1, 4, 'DHL Express',    'DHL-8921-9901', CURRENT_TIMESTAMP - INTERVAL '36 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours', 'delivered'),
(2, 5, 'FedEx Priority', 'FDX-7731-4412', CURRENT_TIMESTAMP - INTERVAL '18 hours', NULL, 'in_transit');

-- 15. REVIEWS (User leaves / earns Review for a Transaction)
INSERT INTO reviews (txn_id, reviewer_id, reviewee_id, comment, rating, date) VALUES
(1, 4, 1, 'The Sussex Chair arrived in pristine condition, very well packaged!', 5, CURRENT_TIMESTAMP - INTERVAL '10 hours'),
(1, 1, 4, 'Prompt payment, courteous buyer. Excellent transaction!', 5, CURRENT_TIMESTAMP - INTERVAL '8 hours');

-- 16. DISPUTES (Dispute on Shipment; resolved by Admin)
INSERT INTO disputes (shipment_id, raised_by, resolved_by, status, date, reason) VALUES
(2, 5, 1, 'resolved', CURRENT_TIMESTAMP - INTERVAL '20 hours', 'Inquired regarding tracking update delay on international transit. Admin verified courier customs clearance.');

-- 17. NOTIFICATIONS (User receives Notifications)
INSERT INTO notifications (user_id, type, message, created_at, is_read) VALUES
(4, 'auction_won',      'Congratulations! You won the auction for Sussex Chair, Late 19th Century. Payment of BDT 18,000 has been finalized and your shipment is being prepared.', CURRENT_TIMESTAMP - INTERVAL '2 days', TRUE),
(1, 'item_sold',        'Your item "Sussex Chair, Late 19th Century" was sold for BDT 18,000. Funds have been credited to your wallet.', CURRENT_TIMESTAMP - INTERVAL '2 days', TRUE),
(5, 'auction_won',      'Congratulations! You won the auction for Antique European Landscape Oil Painting. Payment of BDT 50,000 has been finalized and your shipment is in transit.', CURRENT_TIMESTAMP - INTERVAL '1 day', TRUE),
(2, 'item_sold',        'Your item "Antique European Landscape Oil Painting" was sold for BDT 50,000. Funds have been credited to your wallet.', CURRENT_TIMESTAMP - INTERVAL '1 day', TRUE),
(2, 'outbid_alert',     'You have been outbid on "19th Century Antique Gold & Emerald Necklace". Your bid of BDT 31,500 has been refunded to your wallet.', CURRENT_TIMESTAMP - INTERVAL '12 hours', FALSE),
(1, 'wallet_deposit',   'Successfully deposited BDT 200,000 into your AntiqueX wallet via VISA.', CURRENT_TIMESTAMP - INTERVAL '8 days', TRUE),
(2, 'wallet_deposit',   'Successfully deposited BDT 200,000 into your AntiqueX wallet via BKASH.', CURRENT_TIMESTAMP - INTERVAL '8 days', TRUE);

-- 18. WATCHLIST (User tracks Items in Watchlist)
INSERT INTO watchlist (user_id, item_id, date) VALUES
(1, 4, CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 1, CURRENT_TIMESTAMP - INTERVAL '6 days'),
(3, 1, CURRENT_TIMESTAMP - INTERVAL '5 days'),
(4, 2, CURRENT_TIMESTAMP - INTERVAL '4 days'),
(5, 3, CURRENT_TIMESTAMP - INTERVAL '2 days');
