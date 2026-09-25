const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Purchases.jsx', 'utf8');

const target = 'if (loading) {\n        return <div className="loading-spinner">Loading Orders...</div>;\n    }';

const replacement = \`if (!user) {
        return (
            <div className="page-wrapper" style={{ textAlign: "center" }}>
                <h2>Authentication Required</h2>
                <p>Please <Link to="/login">login</Link> to view your orders.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="loading-spinner">Loading Orders...</div>;
    }\`;

content = content.replace(target, replacement);

// Also need to fix the JSX where it says user.role because it evaluates before the return if it's in the main body?
// No, React returns early, so the JSX evaluation won't happen. 

// BUT wait! I also need to fix user.username in the filter!
// Because if user is null, the filter will crash before the return!
// wait, the filter happens AFTER the return if I put the return first!
// Let's check where the filter is.
