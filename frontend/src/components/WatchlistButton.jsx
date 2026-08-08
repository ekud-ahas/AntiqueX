import { useEffect, useState } from "react";

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
        const watching = data.some(
          (entry) => entry.item_id === Number(itemId)
        );
        setIsWatching(watching);
        setChecking(false);
      })
      .catch((error) => {
        console.error(error);
        setChecking(false);
      });
  }, [itemId, user]);

  const handleToggle = async () => {
    if (!user) {
      setMessage("Please login to use your watchlist.");
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
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (checking) {
    return null;
  }

  return (
    <div>
      <button onClick={handleToggle}>
        {isWatching ? "Remove from Watchlist" : "Add to Watchlist"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default WatchlistButton;
