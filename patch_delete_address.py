import re

with open('backend/controllers/profileController.js', 'r') as f:
    content = f.read()

old_delete = """const deleteAddress = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { userId } = req.user;
        const { id } = req.params;
        if (isNaN(Number(id)) || Number(id) <= 0) return res.status(400).json({ error: "Invalid ID parameter" });"""

new_delete = """const deleteAddress = async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    if (isNaN(Number(id)) || Number(id) <= 0) return res.status(400).json({ error: "Invalid ID parameter" });

    const client = await pool.connect();
    try {
        await client.query("BEGIN");"""

content = content.replace(old_delete, new_delete)

with open('backend/controllers/profileController.js', 'w') as f:
    f.write(content)

print("Patched deleteAddress to validate before BEGIN")
