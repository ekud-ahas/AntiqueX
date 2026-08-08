import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Categories.css";

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
                setError("Could not load categories.");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="category-message">
                Loading categories...
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
                    Explore antique items by category.
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
                                ◆
                            </div>

                            <h2>
                                {category.category_name}
                            </h2>

                            <p>
                                {category.description ||
                                    "Explore items in this category."}
                            </p>

                            <Link
                                to={`/categories/${category.category_id}`}
                                className="category-button"
                            >
                                View Items
                            </Link>
                        </div>
                    ))}

                </div>
            )}

        </div>
    );
}

export default Categories;
