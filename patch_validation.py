import re

# 1. Patch auctionController (bid amount)
with open('backend/controllers/auctionController.js', 'r') as f:
    auction_content = f.read()

auction_content = re.sub(
    r'if \(!bid_amount.*?\{',
    'if (!bid_amount || isNaN(Number(bid_amount)) || !isFinite(Number(bid_amount)) || Number(bid_amount) <= 0 || Number(bid_amount) > 999999999) {',
    auction_content,
    flags=re.DOTALL
)
with open('backend/controllers/auctionController.js', 'w') as f:
    f.write(auction_content)

# 2. Patch walletController (deposit amount)
with open('backend/controllers/walletController.js', 'r') as f:
    wallet_content = f.read()

wallet_content = re.sub(
    r'if \(!user_id \|\| isNaN\(depositAmount\).*?\{',
    'if (!user_id || isNaN(depositAmount) || !isFinite(depositAmount) || depositAmount <= 0 || depositAmount > 999999999) {',
    wallet_content,
    flags=re.DOTALL
)

wallet_content = re.sub(
    r'if \(isNaN\(withdrawAmount\).*?\{',
    'if (isNaN(withdrawAmount) || !isFinite(withdrawAmount) || withdrawAmount <= 0 || withdrawAmount > 999999999) {',
    wallet_content,
    flags=re.DOTALL
)

with open('backend/controllers/walletController.js', 'w') as f:
    f.write(wallet_content)

# 3. Patch itemController (item creation, title, NaN values)
with open('backend/controllers/itemController.js', 'r') as f:
    item_content = f.read()

item_validation_old = r'if \(!seller_id \|\| !category_id \|\| !title \|\| starting_price === undefined \|\| starting_price === null \|\| Number\(starting_price\) < 0 \|\| Number\(starting_price\) > 999999999\) \{'
item_validation_new = 'if (!seller_id || !category_id || !title || title.trim() === "" || starting_price === undefined || starting_price === null || isNaN(Number(starting_price)) || !isFinite(Number(starting_price)) || Number(starting_price) < 0 || Number(starting_price) > 999999999) {'
item_content = re.sub(item_validation_old, item_validation_new, item_content)

increment_old = r'if \(Number\(min_increment\) < 1\) \{'
increment_new = 'if (isNaN(Number(min_increment)) || !isFinite(Number(min_increment)) || Number(min_increment) < 1) {'
item_content = re.sub(increment_old, increment_new, item_content)

# For editing items:
edit_item_validation_old = r'if \(!category_id \|\| !title \|\| starting_price === undefined \|\| starting_price === null \|\| Number\(starting_price\) < 0 \|\| Number\(starting_price\) > 999999999\) \{'
edit_item_validation_new = 'if (!category_id || !title || title.trim() === "" || starting_price === undefined || starting_price === null || isNaN(Number(starting_price)) || !isFinite(Number(starting_price)) || Number(starting_price) < 0 || Number(starting_price) > 999999999) {'
item_content = re.sub(edit_item_validation_old, edit_item_validation_new, item_content)

with open('backend/controllers/itemController.js', 'w') as f:
    f.write(item_content)

print("Validation patched successfully")
