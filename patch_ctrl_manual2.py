with open('backend/controllers/auctionController.js', 'r') as f:
    content = f.read()

old = """        const newBid = await auctionModel.placeBidWithLock({

            id,
            bidderId: bidder_id,
            bidAmount: Number(bid_amount)
        });"""

new = """        const newBid = await auctionModel.placeBidWithLock({
            id,
            bidderId: bidder_id,
            bidAmount: Number(bid_amount),
            addressId
        });"""

content = content.replace(old, new)
with open('backend/controllers/auctionController.js', 'w') as f:
    f.write(content)
print("Done")
