with open('backend/models/auctionModel.js', 'r') as f:
    content = f.read()

old = """        const newBidRes = await client.query(
            `INSERT INTO bids (auction_id, bidder_id, bid_amount)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [auction.auction_id, bidderId, Number(bidAmount)]
        );"""

new = """        const newBidRes = await client.query(
            `INSERT INTO bids (auction_id, bidder_id, bid_amount, address_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [auction.auction_id, bidderId, Number(bidAmount), addressId]
        );"""

content = content.replace(old, new)

with open('backend/models/auctionModel.js', 'w') as f:
    f.write(content)
print("Done inserting address_id")
