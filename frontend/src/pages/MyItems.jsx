import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
    if (!window.confirm("Delete this listing? This cannot be undone.")) {
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
    } catch (error) {
      console.error(error);
      setError("Could not connect to the server.");
    }
  };

  if (!user) {
    return (
      <main>
        <h1>My Items</h1>
        <p>
          Please <Link to="/login">login</Link> to manage your listings.
        </p>
      </main>
    );
  }

  if (loading) {
    return <h2>Loading your items...</h2>;
  }

  return (
    <main>
      <h1>My Items</h1>

      <p>
        <Link to="/sell">+ List a new item</Link>
      </p>

      {error && <p>{error}</p>}

      {items.length === 0 ? (
        <p>You haven't listed any items yet.</p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.item_id}>
              {item.thumbnail_url && (
                <img
                  src={
                    item.thumbnail_url?.startsWith("/uploads/")
                      ? `http://localhost:5000${item.thumbnail_url}`
                      : item.thumbnail_url
                  }
                  alt={item.title}
                  width="150"
                />
              )}

              <h2>{item.title}</h2>

              <p>
                <strong>Category:</strong> {item.category_name}
              </p>

              <p>
                <strong>Starting Price:</strong> ৳{item.starting_price}
              </p>

              <Link to={`/my-items/${item.item_id}/edit`}>
                <button>Edit</button>
              </Link>{" "}

              <button onClick={() => handleDelete(item.item_id)}>
                Delete
              </button>

              <hr />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default MyItems;
