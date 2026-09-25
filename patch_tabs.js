const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Purchases.jsx', 'utf8');

const target = \`                <div className="wallet-tabs">
                    {(user.role === "Customer" || user.role === "Admin") && (
                        <button 
                            className={\\\`wallet-tab-btn \\\${activeTab === "buyer" ? "active" : ""}\\\`}
                            onClick={() => setActiveTab("buyer")}
                        >
                            📦 My Purchases
                        </button>
                    )}
                    {(user.role === "Seller" || user.role === "Admin") && (
                        <button 
                            className={\\\`wallet-tab-btn \\\${activeTab === "seller" ? "active" : ""}\\\`}
                            onClick={() => setActiveTab("seller")}
                        >
                            🚚 My Sales
                        </button>
                    )}
                </div>\`;

const replacement = \`                <div className="wallet-tabs">
                    <button 
                        className={\\\`wallet-tab-btn \\\${activeTab === "buyer" ? "active" : ""}\\\`}
                        onClick={() => setActiveTab("buyer")}
                    >
                        📦 My Purchases
                    </button>
                    <button 
                        className={\\\`wallet-tab-btn \\\${activeTab === "seller" ? "active" : ""}\\\`}
                        onClick={() => setActiveTab("seller")}
                    >
                        🚚 My Sales
                    </button>
                </div>\`;

content = content.replace(target, replacement);
fs.writeFileSync('frontend/src/pages/Purchases.jsx', content);
console.log('patched tabs');
