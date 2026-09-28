import re

with open('backend/models/transactionModel.js', 'r') as f:
    content = f.read()

# Replace the buyerAddrRes logic
old_logic = """            // Create Shipment 
            const buyerAddrRes = await client.query(
                `SELECT address_id FROM addresses WHERE user_id = $1 ORDER BY address_id DESC LIMIT 1`,
                [data.bidder_id]
            );
            let addressId = buyerAddrRes.rows[0]?.address_id;
            if (!addressId) {
                throw new Error("Cannot provision shipment: Buyer has no address on file.");
            }"""

new_logic = """            // Create Shipment using the address selected during the bid
            const bidAddrRes = await client.query(
                `SELECT address_id FROM bids WHERE bid_id = $1`,
                [winnerBidId]
            );
            let addressId = bidAddrRes.rows[0]?.address_id;
            
            // Fallback in case old bids before migration win
            if (!addressId) {
                const buyerAddrRes = await client.query(
                    `SELECT address_id FROM addresses WHERE user_id = $1 ORDER BY address_id DESC LIMIT 1`,
                    [data.bidder_id]
                );
                addressId = buyerAddrRes.rows[0]?.address_id;
            }
            
            if (!addressId) {
                throw new Error("Cannot provision shipment: Buyer has no address on file.");
            }"""

content = content.replace(old_logic, new_logic)

with open('backend/models/transactionModel.js', 'w') as f:
    f.write(content)

print("transactionModel closeAuctionAndRecordWinner patched")
