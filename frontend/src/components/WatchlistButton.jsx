import { useEffect, useState } from "react";
import "../App.css";

function WatchlistButton({ itemId }) {
  const user = JSON.parse(localStorage.getItem("user"));

  const [isWatching, setIsWatching] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    fetch(`http://localhost:5000/api/watchlist/${user.user_id}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const watching = data.some(
            (entry) => entry.item_id === Number(itemId)
          );
          setIsWatching(watching);
        }
        setChecking(false);
      })
      .catch((error) => {
        console.error(error);
        setChecking(false);
      });
  }, [itemId, user]);

  const handleToggle = async () => {
    if (!user) {
      setMessage("Please login to save items to your watchlist.");
      return;
    }

    setMessage("");

    try {
      if (isWatching) {
        const response = await fetch(
          "http://localhost:5000/api/watchlist",
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.user_id,
              item_id: Number(itemId),
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to remove");

        setIsWatching(false);
      } else {
        const response = await fetch(
          "http://localhost:5000/api/watchlist",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.user_id,
              item_id: Number(itemId),
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to add");

        setIsWatching(true);
      }
    } catch {
      setMessage("Could not update watchlist. Please try again.");
    }
  };

  if (checking) {
    return null;
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <button
        type="button"
        onClick={handleToggle}
        className={isWatching ? "btn btn-danger" : "btn btn-outline"}
        style={{ width: "100%", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        <span>{isWatching ? "❤️" : "🤍"}</span>
        <span>{isWatching ? "Remove from Watchlist" : "Save to Watchlist"}</span>
      </button>
      {message && <p style={{ color: "var(--warning)", fontSize: "13px", margin: "6px 0 0", textAlign: "center" }}>{message}</p>}
    </div>
  );
}

export default WatchlistButton;

