const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const importStr = 'const notificationRoutes = require("./routes/notificationRoutes");\nconst shipmentRoutes = require("./routes/shipmentRoutes");';
content = content.replace('const notificationRoutes = require("./routes/notificationRoutes");', importStr);

const mountStr = '// Notification APIs\napp.use("/api/notifications", notificationRoutes);\n\n// Shipment APIs\napp.use("/api/shipments", shipmentRoutes);';
content = content.replace('// Notification APIs\napp.use("/api/notifications", notificationRoutes);', mountStr);

fs.writeFileSync('backend/server.js', content);
console.log('patched');
