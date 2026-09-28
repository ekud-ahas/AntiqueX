import re

with open('backend/models/auctionModel.js', 'r') as f:
    content = f.read()

# Update placeBidWithLock signature
old_sig = """const placeBidWithLock = async (auctionId, bidderId, bidAmount) => {"""
new_sig = """const placeBidWithLock = async (auctionId, bidderId, bidAmount, addressId = null) => {"""
content = content.replace(old_sig, new_sig)

# Update INSERT INTO bids
old_insert = """        const bidInsert = await client.query(
            `INSERT INTO bids (auction_id, bidder_id, bid_amount) 
             VALUES ($1, $2, $3) RETURNING bid_id`,
            [auctionId, bidderId, bidAmount]
        );"""
new_insert = """        const bidInsert = await client.query(
            `INSERT INTO bids (auction_id, bidder_id, bid_amount, address_id) 
             VALUES ($1, $2, $3, $4) RETURNING bid_id`,
            [auctionId, bidderId, bidAmount, addressId]
        );"""
content = content.replace(old_insert, new_insert)

with open('backend/models/auctionModel.js', 'w') as f:
    f.write(content)

print("auctionModel placeBidWithLock patched")
