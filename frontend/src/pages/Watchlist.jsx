import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
      <main>
        <h1>Your Watchlist</h1>
        <p>
          Please <Link to="/login">login</Link> to see your watchlist.
        </p>
      </main>
    );
  }

  if (loading) {
    return <h2>Loading your watchlist...</h2>;
  }

  return (
    <main>
      <h1>Your Watchlist</h1>

      {error && <p>{error}</p>}

      {watchlist.length === 0 ? (
        <p>
          You are not watching any items yet. Browse{" "}
          <Link to="/items">auctions</Link> and add some!
        </p>
      ) : (
        <div>
          {watchlist.map((entry) => (
            <div key={entry.watchlist_id}>
              {entry.thumbnail_url && (
                <img
                  src={entry.thumbnail_url}
                  alt={entry.title}
                  width="150"
                />
              )}

              <h2>
                <Link to={`/items/${entry.item_id}`}>{entry.title}</Link>
              </h2>

              <p>
                <strong>Starting Price:</strong> ৳{entry.starting_price}
              </p>

              <p>
                <strong>Highest Bid:</strong> ৳{entry.highest_bid}
              </p>

              <p>
                <strong>Auction Status:</strong>{" "}
                {entry.auction_status || "Not yet listed for auction"}
              </p>

              <button onClick={() => handleRemove(entry.item_id)}>
                Remove from Watchlist
              </button>

              <hr />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default Watchlist;
