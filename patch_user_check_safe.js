const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Purchases.jsx', 'utf8');

const target1 = 'if (loading) {\n        return <div className="loading-spinner">Loading Orders...</div>;\n    }';
const replacement1 = `if (!user) {
        return (
            <div className="page-wrapper" style={{ textAlign: "center", padding: "50px" }}>
                <h2>Authentication Required</h2>
                <p>Please <Link to="/login">login</Link> to view your orders.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="loading-spinner">Loading Orders...</div>;
    }`;

content = content.replace(target1, replacement1);

// Safely remove the user.role strict checks
content = content.replace(/\{\(user\.role === "Customer" \|\| user\.role === "Admin"\) && \(/g, '');
content = content.replace(/\{\(user\.role === "Seller" \|\| user\.role === "Admin"\) && \(/g, '');

// Clean up the trailing ')}' for those tabs manually by finding the exact string
content = content.replace(`                        </button>\n                    )}\n                    <button`, `                        </button>\n                    <button`);
content = content.replace(`                        </button>\n                    )}\n                </div>`, `                        </button>\n                </div>`);


fs.writeFileSync('frontend/src/pages/Purchases.jsx', content);
console.log('patched successfully');
