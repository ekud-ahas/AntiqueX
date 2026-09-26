const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Purchases.jsx', 'utf8');

content = content.replace(
    'authFetch("/api/transactions"),',
    'authFetch(`/api/transactions/user/${user.user_id}`),'
);

fs.writeFileSync('frontend/src/pages/Purchases.jsx', content);
console.log('patched Purchases.jsx');
