import re

with open('backend/models/transactionModel.js', 'r') as f:
    content = f.read()

# Replace the UPDATE block in closeAuctionAndRecordWinner
old_update = """        // 1. Mark auction as ended
        const auctionRes = await client.query(
            `
            UPDATE auctions
            SET status = 'ended'
            WHERE auction_id = $1
            RETURNING auction_id, item_id, status
            `,
            [auctionId]
        );"""

new_update = """        // 1. Mark auction as ended (Idempotent check)
        const auctionRes = await client.query(
            `
            UPDATE auctions
            SET status = 'ended'
            WHERE auction_id = $1 AND status = 'active'
            RETURNING auction_id, item_id, status
            `,
            [auctionId]
        );"""

if old_update in content:
    content = content.replace(old_update, new_update)
    with open('backend/models/transactionModel.js', 'w') as f:
        f.write(content)
    print("Idempotency patched successfully")
else:
    print("Could not find the update block")

