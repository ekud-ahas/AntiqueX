import re

with open('backend/controllers/itemController.js', 'r') as f:
    content = f.read()

duration_check = """
        if (auction_duration !== undefined && auction_duration !== null && auction_duration !== "") {
            if (isNaN(Number(auction_duration)) || !isFinite(Number(auction_duration)) || Number(auction_duration) <= 0) {
                return res.status(400).json({ error: "Auction duration must be a valid positive number" });
            }
        }
"""

# Insert before "let parsedImageUrls = [];"
content = content.replace('let parsedImageUrls = [];', duration_check + '\n        let parsedImageUrls = [];')

with open('backend/controllers/itemController.js', 'w') as f:
    f.write(content)

print("Duration patched")
