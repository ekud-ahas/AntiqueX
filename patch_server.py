import re

with open('backend/server.js', 'r') as f:
    content = f.read()

error_handler = """
// Global Error Handler for Multer and other middleware
app.use((err, req, res, next) => {
    if (err instanceof require('multer').MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

const PORT = process.env.PORT || 5000;
"""

content = content.replace('const PORT = process.env.PORT || 5000;', error_handler)

with open('backend/server.js', 'w') as f:
    f.write(content)

print("Server patched with global error handler")
