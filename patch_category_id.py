import re

with open('backend/controllers/itemController.js', 'r') as f:
    content = f.read()

# Replace category_id validation in createItem
old_val = r'if \(!seller_id \|\| !category_id \|\| !title'
new_val = r'if (!seller_id || !category_id || isNaN(Number(category_id)) || !title'
content = re.sub(old_val, new_val, content)

# Replace category_id validation in updateItem
old_val_update = r'if \(!category_id \|\| !title'
new_val_update = r'if (!category_id || isNaN(Number(category_id)) || !title'
content = re.sub(old_val_update, new_val_update, content)

with open('backend/controllers/itemController.js', 'w') as f:
    f.write(content)

print("category_id validated")
