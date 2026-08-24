import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../App.css";
import "./SellItem.css";

function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function EditItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  const [form, setForm] = useState({
    category_id: "",
    title: "",
    description: "",
    year_of_origin: "",
    condition: "",
    starting_price: "",
    min_increment: "",
    auction_duration: "",
  });

  const [auctionInfo, setAuctionInfo] = useState({
    auction_id: null,
    start_time: null,
    end_time: null,
    status: "active",
    total_bids: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);

  const loadItem = async () => {
    try {
      const [itemRes, categoriesRes] = await Promise.all([
        fetch(`http://localhost:5000/items/${id}`),
        fetch("http://localhost:5000/api/categories"),
      ]);

      const itemData = await itemRes.json();
      const categoriesData = await categoriesRes.json();

      if (!itemRes.ok) {
        throw new Error(itemData.error || "Item not found");
      }

      if (!user || itemData.seller_id !== user.user_id) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setForm({
        category_id: itemData.category_id,
        title: itemData.title,
        description: itemData.description || "",
        year_of_origin: itemData.year_of_origin || "",
        condition: itemData.condition || "Good",
        starting_price: itemData.starting_price,
        min_increment: itemData.min_increment ? String(itemData.min_increment) : "",
        auction_duration: "",
      });

      setAuctionInfo({
        auction_id: itemData.auction_id,
        start_time: itemData.start_time,
        end_time: itemData.end_time,
        status: itemData.auction_status || "active",
        total_bids: Number(itemData.total_bids || 0),
      });

      setImages(itemData.images || []);
      setCategories(categoriesData);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setIsError(true);
      setMessage(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    try {
      const payload = {
        seller_id: user.user_id,
        category_id: Number(form.category_id),
        title: form.title,
        description: form.description,
        year_of_origin: form.year_of_origin
          ? Number(form.year_of_origin)
          : null,
        condition: form.condition,
        starting_price: Number(form.starting_price),
      };

      if (form.min_increment && Number(form.min_increment) > 0) {
        payload.min_increment = Number(form.min_increment);
      }

      if (form.auction_duration && Number(form.auction_duration) > 0) {
        payload.auction_duration = Number(form.auction_duration);
      }

      const response = await fetch(`http://localhost:5000/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.error || "Failed to update item.");
        return;
      }

      setIsError(false);
      setMessage("Item and auction settings updated successfully!");
      setTimeout(() => navigate("/my-items"), 1200);
    } catch {
      setIsError(true);
      setMessage("Could not connect to the server.");
    }
  };

  const handleDeleteImage = async (img_id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/items/${id}/images/${img_id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seller_id: user.user_id }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      setImages(images.filter((img) => img.img_id !== img_id));
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage("Failed to delete image.");
    }
  };

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:5000/items/${id}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seller_id: user.user_id,
            img_url: newImageUrl.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add image");
      }

      setImages([...images, data]);
      setNewImageUrl("");
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage("Failed to add image.");
    }
  };

  if (notAllowed) {
    return (
      <div className="sell-page">
        <div className="empty-state">
          <h1>Not Authorized</h1>
          <p>You can only edit items that you have listed yourself.</p>
          <Link to="/my-items" className="btn btn-primary" style={{ marginTop: "14px" }}>
            Return to My Items
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="items-message">Loading item details…</div>;
  }

  const hasBids = auctionInfo.total_bids > 0;

  return (
    <div className="sell-page">
      <div className="sell-container">
        <Link to="/my-items" className="back-link" style={{ display: "inline-block", marginBottom: "16px", color: "var(--muted)", textDecoration: "none" }}>
          &larr; Back to My Items
        </Link>

        <h1>Edit Item Listing</h1>
        <p className="sell-description">Update the details, pricing, auction rules, and photos for this antique.</p>

        <form onSubmit={handleSubmit} className="sell-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category_id">Category *</label>
              <select
                id="category_id"
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                name="condition"
                value={form.condition}
                onChange={handleChange}
              >
                <option value="Pristine">Pristine / Mint</option>
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Restoration">Needs Restoration</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="year_of_origin">Year of Origin</label>
              <input
                id="year_of_origin"
                type="number"
                name="year_of_origin"
                value={form.year_of_origin}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="starting_price">Starting Price (৳) *</label>
              <input
                id="starting_price"
                type="number"
                name="starting_price"
                value={form.starting_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                disabled={hasBids}
                required
              />
              {hasBids && (
                <span className="field-hint" style={{ color: "var(--accent)" }}>
                  🔒 Locked: {auctionInfo.total_bids} bid(s) already placed.
                </span>
              )}
            </div>
          </div>

          {/* Auction Settings Section */}
          <div className="auction-settings-section">
            <h3>⏱ Auction Settings & Schedule</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", background: "white", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Auction Status:</span>
                <strong style={{ textTransform: "capitalize" }}>{auctionInfo.status}</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Total Bids:</span>
                <strong>{auctionInfo.total_bids} bids</strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Started:</span>
                <span>{formatDateTime(auctionInfo.start_time)}</span>
              </div>
              <div>
                <span style={{ color: "var(--muted)", display: "block" }}>Ends:</span>
                <span>{formatDateTime(auctionInfo.end_time)}</span>
              </div>
            </div>

            <div className="form-row" style={{ marginTop: "8px" }}>
              <div className="form-group">
                <label htmlFor="min_increment">Min Bid Increment (৳)</label>
                <input
                  id="min_increment"
                  type="number"
                  name="min_increment"
                  value={form.min_increment}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  min="100"
                  step="100"
                />
                <span className="field-hint">
                  Minimum amount each new bid must increase.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="auction_duration">Extend Duration (Optional)</label>
                <select
                  id="auction_duration"
                  name="auction_duration"
                  value={form.auction_duration}
                  onChange={handleChange}
                >
                  <option value="">Keep current end time</option>
                  <option value="1">Extend +1 Day from now</option>
                  <option value="3">Extend +3 Days from now</option>
                  <option value="7">Extend +7 Days from now</option>
                  <option value="14">Extend +14 Days from now</option>
                  <option value="30">Extend +30 Days from now</option>
                </select>
                <span className="field-hint">
                  Optionally reset/extend the auction ending deadline.
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className="sell-submit-btn">
            Save Changes
          </button>
        </form>

        <div className="image-section" style={{ marginTop: "30px" }}>
          <h3>Item Gallery Images</h3>

          {images.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0, fontSize: "14px" }}>No images attached yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "14px" }}>
              {images.map((img) => (
                <div key={img.img_id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden", padding: "8px", textAlign: "center" }}>
                  <img
                    src={
                      img.img_url?.startsWith("/uploads/")
                        ? `http://localhost:5000${img.img_url}`
                        : img.img_url
                    }
                    alt=""
                    style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "4px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: "4px 8px", fontSize: "11px", marginTop: "6px", width: "100%" }}
                    onClick={() => handleDeleteImage(img.img_id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Paste new image URL (e.g. https://…)"
              style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--border-dark)", borderRadius: "var(--radius-sm)", fontSize: "14px" }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddImage}
            >
              Add Image
            </button>
          </div>
        </div>

        {message && (
          <div className="sell-result">
            <p className={`msg ${isError ? "msg-error" : "msg-success"}`}>
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditItem;
