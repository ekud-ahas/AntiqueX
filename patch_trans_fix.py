import re

with open('backend/models/transactionModel.js', 'r') as f:
    content = f.read()

old_logic = """            // Automatically provision shipment linked to buyer address
            const buyerAddrRes = await client.query(
                `SELECT address_id FROM addresses WHERE user_id = $1 ORDER BY address_id DESC LIMIT 1`,
                [data.bidder_id]
            );
            let addressId = buyerAddrRes.rows[0]?.address_id;
            if (!addressId) {
                throw new Error("Cannot provision shipment: Buyer has no address on file.");
            }"""

new_logic = """            // Automatically provision shipment using the exact address the buyer selected when placing the bid
            const bidAddrRes = await client.query(
                `SELECT address_id FROM bids WHERE bid_id = $1`,
                [data.bid_id]
            );
            let addressId = bidAddrRes.rows[0]?.address_id;
            
            // Fallback (for bids placed before the explicit address selection feature was added)
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

print("Fixed transactionModel.js")
