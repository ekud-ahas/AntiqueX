const fs = require('fs');
let content = fs.readFileSync('backend/controllers/itemController.js', 'utf8');

content = content.replace(
    /const getItemById = async \(req, res\) => \{[\s\S]*?\};/g,
    `const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        if (isNaN(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({ error: "Invalid ID parameter" });
        }
        const item = await itemModel.getItemByIdWithDetails(id);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(item);
    } catch (error) {
        console.error("GET ITEM ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve item" });
    }
};`
);

fs.writeFileSync('backend/controllers/itemController.js', content);
console.log("Fixed itemController.js");
