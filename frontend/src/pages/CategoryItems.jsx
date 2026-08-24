import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../App.css";
import "./CategoryItems.css";

function CategoryItems() {
  const { id } = useParams();

  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`http://localhost:5000/api/categories/${id}`).then((res) => {
        if (!res.ok) throw new Error("Category not found");
        return res.json();
      }),
      fetch(`http://localhost:5000/api/categories/${id}/items`).then(
        (res) => {
          if (!res.ok) throw new Error("Failed to fetch items");
          return res.json();
        }
      ),
    ])
      .then(([categoryData, itemsData]) => {
        setCategory(categoryData);
        setItems(itemsData);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError("Could not load this category.");
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="category-message">Loading category items…</div>;
  }

  if (error || !category) {
    return <div className="category-message error">{error || "Category not found"}</div>;
  }

  return (
    <div className="category-items-page">
      <Link to="/categories" className="back-link">
        &larr; Back to Categories
      </Link>

      <div className="category-banner">
        <h1>{category.category_name}</h1>
        <p>{category.description || "Browse all antique items available in this category."}</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No items listed under <strong>{category.category_name}</strong> yet.</p>
          <p>
            <Link to="/sell">Be the first to list an item in this category</Link>
          </p>
        </div>
      ) : (
        <div className="category-items-grid">
          {items.map((item) => (
            <div className="category-item-card" key={item.item_id}>
              <div className="category-item-img-container">
                {item.thumbnail_url ? (
                  <img
                    className="category-item-img"
                    src={
                      item.thumbnail_url?.startsWith("/uploads/")
                        ? `http://localhost:5000${item.thumbnail_url}`
                        : item.thumbnail_url
                    }
                    alt={item.title}
                  />
                ) : (
                  <div className="no-image" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-light)" }}>
                    No Image Available
                  </div>
                )}
              </div>

              <div className="category-item-content">
                <h2>
                  <Link to={`/items/${item.item_id}`}>{item.title}</Link>
                </h2>

                <p className="category-item-desc">
                  {item.description
                    ? item.description.length > 90
                      ? item.description.substring(0, 90) + "…"
                      : item.description
                    : "No description available."}
                </p>

                <div className="category-item-footer">
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>Price</span>
                    <p className="category-item-price">৳{Number(item.starting_price).toLocaleString()}</p>
                  </div>
                  <span className="category-item-seller">By {item.seller}</span>
                </div>

                <Link
                  to={`/items/${item.item_id}`}
                  className="btn btn-primary"
                  style={{ marginTop: "14px", width: "100%" }}
                >
                  View Auction
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryItems;

