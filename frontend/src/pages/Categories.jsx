import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/api";
import "../App.css";
import "./Categories.css";

const CATEGORY_ICONS = {
    "Antique Furniture": "🪑",
    "Fine Art & Paintings": "🎨",
    "Vintage Jewelry": "💎",
    "Rare Coins & Currency": "👛",
    "Ancient Sculptures": "🏺",
};

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Admin category creation state
    const user = JSON.parse(localStorage.getItem("user"));
    const isAdmin = user && (user.role === "admin" || user.role === "super_admin" || user.role === "moderator");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryDesc, setNewCategoryDesc] = useState("");
    const [adminMsg, setAdminMsg] = useState("");
    const [adminError, setAdminError] = useState("");
    const [adminLoading, setAdminLoading] = useState(false);

    function fetchCategories() {
        fetch("/api/categories")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch categories");
                }
                return response.json();
            })
            .then((data) => {
                setCategories(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error(error);
                setError("Could not load categories. Please make sure the backend is running.");
                setLoading(false);
            });
    }

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        setAdminMsg("");
        setAdminError("");

        if (!newCategoryName.trim()) {
            setAdminError("Category name is required");
            return;
        }

        setAdminLoading(true);
        try {
            const res = await authFetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category_name: newCategoryName.trim(),
                    description: newCategoryDesc.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setAdminError(data.error || "Failed to create category");
                return;
            }

            setAdminMsg(`✅ Category "${data.category.category_name}" created successfully!`);
            setNewCategoryName("");
            setNewCategoryDesc("");
            fetchCategories();
        } catch {
            setAdminError("Failed to connect to backend server.");
        } finally {
            setAdminLoading(false);
        }
    };

    const handleDeleteCategory = async (cat) => {
        if (!window.confirm(`Are you sure you want to delete category "${cat.category_name}"?`)) return;
        setAdminMsg("");
        setAdminError("");
        try {
            const res = await authFetch(`/api/categories/${cat.category_id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) {
                setAdminError(data.error || "Failed to delete category");
                return;
            }
            setAdminMsg(`✅ Category "${cat.category_name}" deleted successfully!`);
            fetchCategories();
        } catch {
            setAdminError("Failed to connect to backend server.");
        }
    };

    if (loading) {
        return (
            <div className="category-message">
                Loading antique categories…
            </div>
        );
    }

    if (error) {
        return (
            <div className="category-message error">
                {error}
            </div>
        );
    }

    return (
        <div className="categories-page">
            <div className="categories-header">
                <h1>Browse by Category</h1>
                <p>
                    Explore curated antique collections categorized by historical era and craft.
                </p>
            </div>

            {/* Admin-Only Category Creation Card (Demonstrates Role-Based Access) */}
            {isAdmin && (
                <div style={{
                    maxWidth: "700px",
                    margin: "0 auto 2.5rem auto",
                    padding: "1.5rem",
                    background: "rgba(230, 126, 34, 0.08)",
                    border: "1.5px solid #e67e22",
                    borderRadius: "12px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.8rem" }}>
                        <span style={{ fontSize: "1.3rem" }}>🛡️</span>
                        <h3 style={{ margin: 0, color: "#d35400" }}>Admin Control: Add New Category</h3>
                        <span style={{ fontSize: "0.75rem", background: "#d35400", color: "#fff", padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", fontWeight: "bold" }}>
                            {user.role}
                        </span>
                    </div>
                    <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#666" }}>
                        Only authenticated administrators can manage categories. Server rejects unauthorized users with 403 Forbidden.
                    </p>

                    <form onSubmit={handleCreateCategory} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                        <input
                            type="text"
                            placeholder="Category Name (e.g. Victorian Clocks)"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem" }}
                            required
                        />
                        <textarea
                            placeholder="Category Description"
                            value={newCategoryDesc}
                            onChange={(e) => setNewCategoryDesc(e.target.value)}
                            rows={2}
                            style={{ padding: "0.6rem 0.8rem", borderRadius: "6px", border: "1px solid #ccc", fontSize: "0.95rem", resize: "vertical" }}
                        />
                        <button
                            type="submit"
                            disabled={adminLoading}
                            style={{
                                alignSelf: "flex-start",
                                padding: "0.6rem 1.4rem",
                                background: "#d35400",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "bold"
                            }}
                        >
                            {adminLoading ? "Creating…" : "Create Category"}
                        </button>
                    </form>

                    {adminMsg && <p style={{ margin: "0.8rem 0 0 0", color: "#27ae60", fontWeight: "bold" }}>{adminMsg}</p>}
                    {adminError && <p style={{ margin: "0.8rem 0 0 0", color: "#c0392b", fontWeight: "bold" }}>{adminError}</p>}
                </div>
            )}

            {categories.length === 0 ? (
                <div className="category-message">
                    No categories available.
                </div>
            ) : (
                <div className="categories-grid">
                    {categories.map((category) => (
                        <div
                            className="category-card"
                            key={category.category_id}
                        >
                            <div className="category-icon">
                                {CATEGORY_ICONS[category.category_name] || "⚜"}
                            </div>

                            <h2>{category.category_name}</h2>

                            <p>
                                {category.description ||
                                    "Explore historical items in this category."}
                            </p>

                            <Link
                                to={`/categories/${category.category_id}`}
                                className="category-button"
                            >
                                Browse Items
                            </Link>

                            {isAdmin && (
                                <button
                                    onClick={() => handleDeleteCategory(category)}
                                    style={{
                                        marginTop: "8px",
                                        padding: "7px 12px",
                                        background: "#fdedec",
                                        color: "#c0392b",
                                        border: "1px solid #f5b7b1",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontWeight: "600",
                                        fontSize: "12px",
                                        width: "100%",
                                        transition: "background 0.2s"
                                    }}
                                >
                                    🗑️ Delete Category
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Categories;
