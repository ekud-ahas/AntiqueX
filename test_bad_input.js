const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/items/abc',
    method: 'GET'
}, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data}`);
    });
});

req.on('error', console.error);
req.end();
