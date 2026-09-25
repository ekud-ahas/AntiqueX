const fs = require('fs');

let appContent = fs.readFileSync('frontend/src/App.jsx', 'utf8');
appContent = appContent.replace('import Deliveries from "./pages/Deliveries";\n', '');
appContent = appContent.replace('              <Route path="/deliveries" element={<Deliveries />} />\n', '');
fs.writeFileSync('frontend/src/App.jsx', appContent);

let navContent = fs.readFileSync('frontend/src/components/Navbar.jsx', 'utf8');
navContent = navContent.replace('                            <NavLink to="/deliveries" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Deliveries</NavLink>\n', '');
fs.writeFileSync('frontend/src/components/Navbar.jsx', navContent);

console.log('patched app and navbar');
