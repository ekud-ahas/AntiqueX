import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./Watchlist.css";

function Watchlist() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWatchlist = () => {
    setLoading(true);

    fetch(`http://localhost:5000/api/watchlist/${user.user_id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch watchlist");
        }
        return response.json();
      })
      .then((data) => {
        setWatchlist(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setError("Could not load your watchlist.");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (user) {
      fetchWatchlist();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = async (item_id) => {
    try {
      const response = await fetch("http://localhost:5000/api/watchlist", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.user_id,
          item_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove item");
      }

      fetchWatchlist();
    } catch (error) {
      console.error(error);
      setError("Could not remove that item. Please try again.");
    }
  };

  if (!user) {
    return (
      <div className="watchlist-page">
        <div className="empty-state">
          <h1>Your Watchlist</h1>
          <p>Please <Link to="/login">sign in</Link> to view and manage your saved items.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="items-message">Loading your saved items…</div>;
  }

  return (
    <div className="watchlist-page">
      <div className="page-header">
        <h1>My Watchlist</h1>
        <p>Keep track of antique items and auctions you are interested in.</p>
      </div>

      {error && <p className="msg msg-error" style={{ textAlign: "center", marginBottom: "25px" }}>{error}</p>}

      {watchlist.length === 0 ? (
        <div className="empty-state">
          <p>You have not added any items to your watchlist yet.</p>
          <p>
            Explore <Link to="/items">live auctions</Link> and click &ldquo;Add to Watchlist&rdquo; to track them here.
          </p>
        </div>
      ) : (
        <div className="watchlist-grid">
          {watchlist.map((entry) => (
            <div className="watchlist-card" key={entry.watchlist_id}>
              <div className="watchlist-img-container">
                {entry.thumbnail_url ? (
                  <img
                    className="watchlist-img"
                    src={
                      entry.thumbnail_url?.startsWith("/uploads/")
                        ? `http://localhost:5000${entry.thumbnail_url}`
                        : entry.thumbnail_url
                    }
                    alt={entry.title}
                  />
                ) : (
                  <div className="no-image" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-light)" }}>
                    No Image Available
                  </div>
                )}
              </div>

              <div className="watchlist-content">
                <h2>
                  <Link to={`/items/${entry.item_id}`}>{entry.title}</Link>
                </h2>

                <div className="watchlist-info-row">
                  <span className="watchlist-label">Starting Price</span>
                  <span className="watchlist-val">৳{Number(entry.starting_price).toLocaleString()}</span>
                </div>

                <div className="watchlist-info-row">
                  <span className="watchlist-label">Highest Bid</span>
                  <span className="watchlist-val" style={{ color: "var(--accent)" }}>
                    {entry.highest_bid ? `৳${Number(entry.highest_bid).toLocaleString()}` : "No bids yet"}
                  </span>
                </div>

                <div className="watchlist-info-row">
                  <span className="watchlist-label">Status</span>
                  <span className={`badge badge-${entry.auction_status || "scheduled"}`}>
                    {entry.auction_status || "Scheduled"}
                  </span>
                </div>

                <div className="watchlist-actions">
                  <Link to={`/items/${entry.item_id}`} className="btn btn-primary">
                    View Auction
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleRemove(entry.item_id)}
                  >
                    Remove
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

export default Watchlist;

