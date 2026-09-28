import re

with open('backend/controllers/auctionController.js', 'r') as f:
    content = f.read()

# 1. Update placeBid
old_place_bid_vars = """        const { id } = req.params;
        if (!(typeof id === "string" && id.length > 10 && id.includes("-")) && (isNaN(Number(id)) || Number(id) <= 0)) return res.status(400).json({ error: "Invalid ID parameter" });
        const bidder_id = req.user.userId;
        const { bid_amount } = req.body;

        if (!bid_amount || isNaN(Number(bid_amount)) || !isFinite(Number(bid_amount)) || Number(bid_amount) <= 0 || Number(bid_amount) > 999999999) {"""

new_place_bid_vars = """        const { id } = req.params;
        if (!(typeof id === "string" && id.length > 10 && id.includes("-")) && (isNaN(Number(id)) || Number(id) <= 0)) return res.status(400).json({ error: "Invalid ID parameter" });
        const bidder_id = req.user.userId;
        const { bid_amount, addressId } = req.body;

        if (!addressId || isNaN(Number(addressId)) || Number(addressId) <= 0) {
            return res.status(400).json({ error: "A valid shipping address is required to place a bid" });
        }

        if (!bid_amount || isNaN(Number(bid_amount)) || !isFinite(Number(bid_amount)) || Number(bid_amount) <= 0 || Number(bid_amount) > 999999999) {"""

content = content.replace(old_place_bid_vars, new_place_bid_vars)

# 2. Update the call to placeBidWithLock
old_call = """        const result = await auctionModel.placeBidWithLock(auction.auction_id, bidder_id, bid_amount);"""
new_call = """        const result = await auctionModel.placeBidWithLock(auction.auction_id, bidder_id, bid_amount, addressId);"""

content = content.replace(old_call, new_call)

with open('backend/controllers/auctionController.js', 'w') as f:
    f.write(content)

print("auctionController placeBid patched")
