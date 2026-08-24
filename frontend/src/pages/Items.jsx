import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./Items.css";

function Items() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("http://localhost:5000/items")
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to load items");
                }
                return res.json();
            })
            .then((data) => {
                setItems(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError("Unable to load auctions. Make sure backend is running.");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="items-message">Loading live auctions…</div>;
    }

    if (error) {
        return <div className="items-message error">{error}</div>;
    }

    return (
        <div className="items-page">
            <div className="items-header">
                <h1>Live Auctions</h1>
                <p>
                    Explore unique and authentic historical items ready for bidding.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="items-message">
                    No items available at the moment.
                </div>
            ) : (
                <div className="items-grid">
                    {items.map((item) => (
                        <div className="item-card" key={item.item_id}>
                            <div className="item-image-container">
                                {item.category_name && (
                                    <span className="item-category-tag">
                                        {item.category_name}
                                    </span>
                                )}
                                {item.condition && (
                                    <span className="item-condition-tag">
                                        {item.condition}
                                    </span>
                                )}
                                {item.thumbnail_url ? (
                                    <img
                                        className="item-image"
                                        src={
                                            item.thumbnail_url?.startsWith("/uploads/")
                                                ? `http://localhost:5000${item.thumbnail_url}`
                                                : item.thumbnail_url
                                        }
                                        alt={item.title}
                                    />
                                ) : (
                                    <div className="no-image">
                                        No Image Available
                                    </div>
                                )}
                            </div>

                            <div className="item-content">
                                <h2>{item.title}</h2>

                                <p className="item-description">
                                    {item.description
                                        ? item.description.length > 95
                                            ? item.description.substring(0, 95) + "…"
                                            : item.description
                                        : "No description available."}
                                </p>

                                <div className="item-meta-row">
                                    <div>
                                        <p className="item-price-label">Starting Price</p>
                                        <p className="item-price-val">৳{Number(item.starting_price).toLocaleString()}</p>
                                    </div>
                                    {item.year_of_origin && (
                                        <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                                            Circa {item.year_of_origin}
                                        </span>
                                    )}
                                </div>

                                <Link
                                    to={`/items/${item.item_id}`}
                                    className="view-button"
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

export default Items;