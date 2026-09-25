const fs = require('fs');
let content = fs.readFileSync('backend/routes/shipmentRoutes.js', 'utf8');
content = content.replace('requireRole(["Seller", "Admin"])', 'requireRole("Seller", "Admin")');
content = content.replace('requireRole(["Customer"])', 'requireRole("Customer")');
content = content.replace('requireRole(["Customer"])', 'requireRole("Customer")');
fs.writeFileSync('backend/routes/shipmentRoutes.js', content);
console.log('patched shipmentRoutes');
