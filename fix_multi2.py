import re

with open('backend/controllers/itemController.js', 'r') as f:
    content = f.read()

old_block = """        if (isNaN(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ error: "Invalid ID parameter" });
        }"""

new_block = """        if (!(typeof id === "string" && id.length > 10 && id.includes("-")) && (isNaN(Number(id)) || Number(id) <= 0)) {
            return res.status(400).json({ error: "Invalid ID parameter" });
        }"""

content = content.replace(old_block, new_block)

with open('backend/controllers/itemController.js', 'w') as f:
    f.write(content)
print("itemController UUID fixed")
