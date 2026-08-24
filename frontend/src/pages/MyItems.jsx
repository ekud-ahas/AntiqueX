import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./MyItems.css";

function MyItems() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMyItems = () => {
    setLoading(true);

    fetch("http://localhost:5000/items")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch items");
        return response.json();
      })
      .then((data) => {
        const mine = data.filter(
          (item) => item.seller === user.username
        );
        setItems(mine);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError("Could not load your items.");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (user) {
      fetchMyItems();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (item_id) => {
    if (!window.confirm("Are you sure you want to delete this listing? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/items/${item_id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller_id: user.user_id }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete item.");
        return;
      }

      fetchMyItems();
    } catch {
      setError("Could not connect to the server.");
    }
  };

  if (!user) {
    return (
      <div className="my-items-page">
        <div className="empty-state">
          <h1>My Items</h1>
          <p>Please <Link to="/login">sign in</Link> to manage your listed items.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="items-message">Loading your listed items…</div>;
  }

  return (
    <div className="my-items-page">
      <div className="my-items-topbar">
        <div>
          <h1>My Listed Items</h1>
          <p>Manage, edit, or delete items you have submitted for auction.</p>
        </div>
        <Link to="/sell" className="btn btn-primary">
          + List New Item
        </Link>
      </div>

      {error && <p className="msg msg-error" style={{ textAlign: "center", marginBottom: "25px" }}>{error}</p>}

      {items.length === 0 ? (
        <div className="empty-state">
          <p>You have not listed any items for auction yet.</p>
          <p>
            Ready to sell? <Link to="/sell">List your first antique</Link>
          </p>
        </div>
      ) : (
        <div className="my-items-grid">
          {items.map((item) => (
            <div className="my-item-card" key={item.item_id}>
              <div className="my-item-img-container">
                {item.thumbnail_url ? (
                  <img
                    className="my-item-img"
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

              <div className="my-item-content">
                <h2>{item.title}</h2>

                <div className="my-item-meta">
                  <div className="my-item-meta-row">
                    <span className="my-item-meta-label">Category</span>
                    <span className="my-item-meta-val">{item.category_name}</span>
                  </div>
                  <div className="my-item-meta-row">
                    <span className="my-item-meta-label">Starting Price</span>
                    <span className="my-item-meta-val" style={{ color: "var(--accent)" }}>৳{Number(item.starting_price).toLocaleString()}</span>
                  </div>
                  {item.condition && (
                    <div className="my-item-meta-row">
                      <span className="my-item-meta-label">Condition</span>
                      <span className="my-item-meta-val">{item.condition}</span>
                    </div>
                  )}
                </div>

                <div className="my-item-actions">
                  <Link to={`/my-items/${item.item_id}/edit`} className="btn btn-outline">
                    Edit Details
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(item.item_id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyItems;

