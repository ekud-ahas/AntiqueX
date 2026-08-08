import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
                setError("Unable to load auctions.");
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="items-message">Loading auctions...</div>;
    }

    if (error) {
        return <div className="items-message error">{error}</div>;
    }

    return (
        <div className="items-page">

            <div className="items-header">
                <h1>Auctions</h1>

                <p>
                    Explore antiques currently available on AntiqueX.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="items-message">
                    No items available.
                </div>
            ) : (
                <div className="items-grid">

                    {items.map((item) => (
                        <div className="item-card" key={item.item_id}>

                            <div className="item-image-container">
                                {item.thumbnail_url ? (
                                    <img
                                        src={
                                            item.thumbnail_url?.startsWith("/uploads/")
                                                ? `http://localhost:5000${item.thumbnail_url}`
                                                : item.thumbnail_url
                                        }
                                        alt={item.title}
                                        style={{
                                            width: "400px",
                                            height: "230px",
                                            objectFit: "cover",
                                            borderRadius: "6px"
                                        }}
                                    />
                                ) : (
                                    <div className="no-image">
                                        No Image
                                    </div>
                                )}
                            </div>

                            <div className="item-content">

                                <h2>{item.title}</h2>

                                <p className="item-description">
                                    {item.description
                                        ? item.description.length > 100
                                            ? item.description.substring(0, 100) + "..."
                                            : item.description
                                        : "No description available."}
                                </p>

                                <p className="item-price">
                                    Starting Price: ৳{item.starting_price}
                                </p>

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