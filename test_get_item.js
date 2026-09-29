const fs = require('fs');
let content = fs.readFileSync('backend/controllers/itemController.js', 'utf8');

content = content.replace(
    /if \(!\(typeof id === "string" && id.length > 10 && id.includes\("-"\)\) && \(isNaN\(Number\(id\)\) \|\| Number\(id\) <= 0\)\) \{[\s\S]*?error: "Invalid ID parameter"[\s\S]*?\}/,
    `console.log("INSIDE getItemById:", id);
        const isUUID = typeof id === "string" && id.length > 10 && id.includes("-");
        const isBadNum = isNaN(Number(id)) || Number(id) <= 0;
        console.log("isUUID:", isUUID, "isBadNum:", isBadNum);
        if (!isUUID && isBadNum) {
            return res.status(400).json({ error: "Invalid ID parameter" });
        }`
);
fs.writeFileSync('backend/controllers/itemController.js', content);
console.log("Patched test logs");
