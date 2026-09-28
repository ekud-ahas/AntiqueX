import re

with open('backend/controllers/auctionController.js', 'r') as f:
    content = f.read()

old_address_check = """        const addressCheck = await require('../config/db').query(
            "SELECT address_id FROM addresses WHERE user_id = $1 LIMIT 1",
            [bidder_id]
        );
        if (addressCheck.rows.length === 0) {
            return res.status(400).json({
                error: "You must add a delivery address to your profile before placing a bid.",
                code: "NO_ADDRESS"
            });
        }"""

new_address_check = """        const addressCheck = await require('../config/db').query(
            "SELECT address_id FROM addresses WHERE address_id = $1 AND user_id = $2 LIMIT 1",
            [addressId, bidder_id]
        );
        if (addressCheck.rows.length === 0) {
            return res.status(400).json({
                error: "The selected delivery address is invalid or does not belong to you.",
                code: "NO_ADDRESS"
            });
        }"""

content = content.replace(old_address_check, new_address_check)

with open('backend/controllers/auctionController.js', 'w') as f:
    f.write(content)

print("auctionController address ownership validation patched")
