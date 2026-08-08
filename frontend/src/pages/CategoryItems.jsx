import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
    return <h2>Loading...</h2>;
  }

  if (error) {
    return <h2>{error}</h2>;
  }

  return (
    <main>
      <p>
        <Link to="/categories">&larr; All Categories</Link>
      </p>

      <h1>{category.category_name}</h1>
      <p>{category.description}</p>

      <hr />

      {items.length === 0 ? (
        <p>No items in this category yet.</p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.item_id}>
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  width="150"
                />
              )}

              <h2>
                <Link to={`/items/${item.item_id}`}>{item.title}</Link>
              </h2>

              <p>{item.description}</p>

              <p>
                <strong>Starting Price:</strong> ৳{item.starting_price}
              </p>

              <p>
                <strong>Seller:</strong> {item.seller}
              </p>

              <p>
                <strong>Auction Status:</strong>{" "}
                {item.auction_status || "Not yet listed for auction"}
              </p>

              <hr />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default CategoryItems;
