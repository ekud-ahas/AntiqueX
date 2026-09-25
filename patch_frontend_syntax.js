const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Deliveries.jsx', 'utf8');
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
fs.writeFileSync('frontend/src/pages/Deliveries.jsx', content);
console.log('patched frontend Deliveries.jsx');
