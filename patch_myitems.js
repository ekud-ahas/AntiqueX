const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/MyItems.jsx', 'utf8');

if (!content.includes('useNavigate')) {
    content = content.replace(
        'import { Link } from "react-router-dom";',
        'import { Link, useNavigate } from "react-router-dom";'
    );
}

if (!content.includes('const navigate = useNavigate();')) {
    content = content.replace(
        'const user = JSON.parse(sessionStorage.getItem("user"));',
        'const user = JSON.parse(sessionStorage.getItem("user"));\n  const navigate = useNavigate();'
    );
}

content = content.replace(
    '<div className="my-item-card" key={item.item_id}>',
    '<div className="my-item-card" key={item.item_id} onClick={() => navigate(`/items/${item.item_id}`)} style={{ cursor: "pointer" }}>'
);

content = content.replace(
    '<Link to={`/my-items/${item.item_id}/edit`} className="btn btn-outline">',
    '<Link to={`/my-items/${item.item_id}/edit`} className="btn btn-outline" onClick={(e) => e.stopPropagation()}>'
);

content = content.replace(
    'onClick={() => handleDelete(item.item_id)}',
    'onClick={(e) => { e.stopPropagation(); handleDelete(item.item_id); }}'
);

fs.writeFileSync('frontend/src/pages/MyItems.jsx', content);
console.log("patched MyItems");
