import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./Categories.css";

const CATEGORY_ICONS = {
    "Antique Furniture": "🪑",
    "Fine Art & Paintings": "🎨",
    "Vintage Jewelry": "💎",
    "Rare Coins & Currency": "🪙",
    "Ancient Sculptures": "🏺",
};

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000/api/categories")
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
    }, []);

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
                    Explore curated antique collections curated by category.
                </p>
            </div>

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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Categories;

