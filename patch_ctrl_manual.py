import re

with open('backend/controllers/auctionController.js', 'r') as f:
    content = f.read()

# Replace specifically using a regex that handles whitespace
pattern = r'const newBid = await auctionModel\.placeBidWithLock\(\{\s*id,\s*bidderId:\s*bidder_id,\s*bidAmount:\s*bid_amount\s*\}\);'
replacement = 'const newBid = await auctionModel.placeBidWithLock({ id, bidderId: bidder_id, bidAmount: bid_amount, addressId });'
new_content = re.sub(pattern, replacement, content)

if new_content == content:
    print("WARNING: Regex did not match!")
else:
    with open('backend/controllers/auctionController.js', 'w') as f:
        f.write(new_content)
    print("SUCCESS: Controller patched!")
