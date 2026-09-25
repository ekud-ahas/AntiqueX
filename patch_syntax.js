const fs = require('fs');
let content = fs.readFileSync('backend/models/shipmentModel.js', 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync('backend/models/shipmentModel.js', content);
console.log('patched');
