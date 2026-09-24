const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Wallet.jsx', 'utf8');

content = content.replace(
    'const ref = data.gateway_reference ? ` (Ref: ${data.gateway_reference})` : "";\n            setSuccessMsg(`Successfully deposited ৳${amount.toLocaleString()}!${ref}`);',
    'setSuccessMsg(`Successfully deposited ৳${amount.toLocaleString()}!`);'
);

fs.writeFileSync('frontend/src/pages/Wallet.jsx', content);
console.log('patched');
