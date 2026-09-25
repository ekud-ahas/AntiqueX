const fs = require('fs');

// Patch App.jsx
let appContent = fs.readFileSync('frontend/src/App.jsx', 'utf8');
if (!appContent.includes('Deliveries')) {
    appContent = appContent.replace(
        'import Wallet from "./pages/Wallet";',
        'import Wallet from "./pages/Wallet";\nimport Deliveries from "./pages/Deliveries";'
    );
    appContent = appContent.replace(
        '<Route path="/wallet" element={<Wallet />} />',
        '<Route path="/wallet" element={<Wallet />} />\n              <Route path="/deliveries" element={<Deliveries />} />'
    );
    fs.writeFileSync('frontend/src/App.jsx', appContent);
}

// Patch Navbar.jsx
let navContent = fs.readFileSync('frontend/src/components/Navbar.jsx', 'utf8');
if (!navContent.includes('to="/deliveries"')) {
    navContent = navContent.replace(
        '<Link to="/wallet" className="nav-item">Wallet</Link>',
        '<Link to="/wallet" className="nav-item">Wallet</Link>\n                        <Link to="/deliveries" className="nav-item">Deliveries</Link>'
    );
    fs.writeFileSync('frontend/src/components/Navbar.jsx', navContent);
}

console.log('patched frontend');
