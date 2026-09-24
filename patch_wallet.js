const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Wallet.jsx', 'utf8');

// Re-add the Trx ID header
content = content.replace(
    '<th>Date & Time</th>',
    '<th>Date & Time</th>\n                                                    <th>Trx ID</th>'
);

// Add the cell back with trx_id
content = content.replace(
    '<td>{formatDateTime(tx.transaction_time)}</td>',
    '<td>{formatDateTime(tx.transaction_time)}</td>\n                                                            <td className="id-cell">{tx.trx_id}</td>'
);

fs.writeFileSync('frontend/src/pages/Wallet.jsx', content);
console.log('patched');
