import { Link } from "react-router-dom";

function ItemCard({ item }) {
  return (
    <div>
      {item.thumbnail_url && (
        <img src={item.thumbnail_url} alt={item.title} width="150" />
      )}

      <h2>{item.title}</h2>

      <p>{item.description}</p>

      <p>
        <strong>Category:</strong> {item.category_name}
      </p>

      <p>
        <strong>Condition:</strong> {item.condition}
      </p>

      <p>
        <strong>Year:</strong> {item.year_of_origin}
      </p>

      <p>
        <strong>Starting Price:</strong> ৳{item.starting_price}
      </p>

      <p>
        <strong>Seller:</strong> {item.seller}
      </p>

      <Link to={`/items/${item.item_id}`}>
        <button>View Auction</button>
      </Link>
    </div>
  );
}

export default ItemCard;
