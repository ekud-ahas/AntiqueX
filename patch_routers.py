import os
import re

routes_dir = 'backend/routes/'
for filename in os.listdir(routes_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(routes_dir, filename)
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Look for any route with :id, :auctionId, etc
        if re.search(r'/:[a-zA-Z]*id', content, re.IGNORECASE):
            # Inject validation middleware to those specific routes? 
            # Or better yet, just inject it into the router!
            
            # `router.use()` at the top of the router handles params? No, only router.param() does reliably.
            # Let's add router.param() for common ID keys
            
            param_patch = """
router.param('id', (req, res, next, id) => {
    const num = Number(id);
    if (!Number.isInteger(num) || num <= 0) return res.status(400).json({ error: 'Invalid ID: must be a positive integer' });
    next();
});
router.param('auctionId', (req, res, next, auctionId) => {
    const num = Number(auctionId);
    if (!Number.isInteger(num) || num <= 0) return res.status(400).json({ error: 'Invalid auctionId: must be a positive integer' });
    next();
});
router.param('categoryId', (req, res, next, categoryId) => {
    const num = Number(categoryId);
    if (!Number.isInteger(num) || num <= 0) return res.status(400).json({ error: 'Invalid categoryId: must be a positive integer' });
    next();
});
router.param('userId', (req, res, next, userId) => {
    const num = Number(userId);
    if (!Number.isInteger(num) || num <= 0) return res.status(400).json({ error: 'Invalid userId: must be a positive integer' });
    next();
});
"""
            # Insert after const router = express.Router();
            if "router.param('id'" not in content:
                content = content.replace('const router = express.Router();', 'const router = express.Router();\n' + param_patch)
                with open(filepath, 'w') as f:
                    f.write(content)

print("Routers patched with router.param")
