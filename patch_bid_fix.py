import re

# 1. Patch auctionController.js
with open('backend/controllers/auctionController.js', 'r') as f:
    ctrl_content = f.read()

old_call = """        const newBid = await auctionModel.placeBidWithLock({

            id,
            bidderId: bidder_id,
            bidAmount: bid_amount
        });"""

new_call = """        const newBid = await auctionModel.placeBidWithLock({
            id,
            bidderId: bidder_id,
            bidAmount: bid_amount,
            addressId
        });"""

if old_call in ctrl_content:
    ctrl_content = ctrl_content.replace(old_call, new_call)
    print("auctionController fixed")
else:
    # Try regex if spacing is different
    ctrl_content = re.sub(
        r'const newBid = await auctionModel\.placeBidWithLock\(\{\s*id,\s*bidderId:\s*bidder_id,\s*bidAmount:\s*bid_amount\s*\}\);',
        'const newBid = await auctionModel.placeBidWithLock({ id, bidderId: bidder_id, bidAmount: bid_amount, addressId });',
        ctrl_content
    )
    print("auctionController regex fixed")

with open('backend/controllers/auctionController.js', 'w') as f:
    f.write(ctrl_content)


# 2. Patch auctionModel.js
with open('backend/models/auctionModel.js', 'r') as f:
    model_content = f.read()

old_sig = """const placeBidWithLock = async ({ id, bidderId, bidAmount }) => {"""
new_sig = """const placeBidWithLock = async ({ id, bidderId, bidAmount, addressId = null }) => {"""

if old_sig in model_content:
    model_content = model_content.replace(old_sig, new_sig)
    print("auctionModel signature fixed")

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

if old_insert in model_content:
    model_content = model_content.replace(old_insert, new_insert)
    print("auctionModel insert fixed")
else:
    # Use regex for insert if spacing is off
    pattern = r'const bidInsert = await client\.query\(\s*`INSERT INTO bids \(auction_id, bidder_id, bid_amount\) \s*VALUES \(\$1, \$2, \$3\) RETURNING bid_id`,\s*\[auctionId, bidderId, bidAmount\]\s*\);'
    model_content = re.sub(pattern, new_insert, model_content)
    print("auctionModel insert regex fixed")

with open('backend/models/auctionModel.js', 'w') as f:
    f.write(model_content)

