import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./SellItem.css";

function SellItem() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        title: "",
        description: "",
        year_of_origin: "",
        condition: "Good",
        starting_price: "",
        category_id: "",
        image_url: "",
        auction_duration: "7",
        min_increment: ""
    });

    const [image, setImage] = useState(null);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("http://localhost:5000/api/categories")
            .then((res) => (res.ok ? res.json() : []))
            .then((data) => {
                setCategories(data);
                if (data.length > 0) {
                    setForm((prev) => ({ ...prev, category_id: String(data[0].category_id) }));
                }
            })
            .catch((err) => console.error("Failed to load categories", err));
    }, []);

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!user) {
            setIsError(true);
            setMessage("Please login before selling an item.");
            return;
        }

        setLoading(true);
        setMessage("");
        setIsError(false);

        try {
            const formData = new FormData();

            formData.append("seller_id", user.user_id);
            formData.append("category_id", form.category_id);
            formData.append("title", form.title);
            formData.append("description", form.description);
            formData.append("year_of_origin", form.year_of_origin);
            formData.append("condition", form.condition);
            formData.append("starting_price", form.starting_price);
            formData.append("auction_duration", form.auction_duration);
            if (form.min_increment.trim() !== "") {
                formData.append("min_increment", form.min_increment);
            }

            // Image URL
            if (form.image_url.trim() !== "") {
                formData.append(
                    "image_urls",
                    JSON.stringify([form.image_url.trim()])
                );
            }

            // Local image
            if (image) {
                formData.append("image", image);
            }

            const response = await fetch(
                "http://localhost:5000/items",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to create item"
                );
            }

            setIsError(false);
            setMessage("Item listed successfully for auction!");

            setForm({
                title: "",
                description: "",
                year_of_origin: "",
                condition: "Good",
                starting_price: "",
                category_id: categories.length > 0 ? String(categories[0].category_id) : "",
                image_url: "",
                auction_duration: "7",
                min_increment: ""
            });

            setImage(null);
            const fileInput = document.getElementById("image");
            if (fileInput) fileInput.value = "";

        } catch (error) {
            console.error(error);
            setIsError(true);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="sell-page">
                <div className="empty-state">
                    <h1>Sell an Antique</h1>
                    <p>You need an active account to list items for auction.</p>
                    <p>
                        Please <Link to="/login">sign in</Link> or <Link to="/register">create an account</Link> to proceed.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="sell-page">
            <div className="sell-container">
                <h1>List an Antique for Auction</h1>
                <p className="sell-description">
                    Provide accurate details, origin information, and photos to attract buyers.
                </p>

                <form onSubmit={handleSubmit} className="sell-form">
                    <div className="form-group">
                        <label htmlFor="title">Item Title *</label>
                        <input
                            id="title"
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            placeholder="e.g. Victorian Mahogany Armchair, Circa 1890"
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
                            placeholder="Describe history, provenance, maker marks, materials, and any flaws…"
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
                            <label htmlFor="year_of_origin">Year / Era of Origin</label>
                            <input
                                id="year_of_origin"
                                type="number"
                                name="year_of_origin"
                                value={form.year_of_origin}
                                onChange={handleChange}
                                placeholder="e.g. 1890"
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
                                placeholder="e.g. 15000"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div className="auction-settings-section">
                        <h3>⏱ Auction Settings</h3>
                        <p className="auction-settings-hint">
                            Configure how long the auction will run and the minimum bid increment.
                        </p>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="auction_duration">Auction Duration *</label>
                                <select
                                    id="auction_duration"
                                    name="auction_duration"
                                    value={form.auction_duration}
                                    onChange={handleChange}
                                >
                                    <option value="1">1 Day</option>
                                    <option value="3">3 Days</option>
                                    <option value="5">5 Days</option>
                                    <option value="7">7 Days (Recommended)</option>
                                    <option value="10">10 Days</option>
                                    <option value="14">14 Days</option>
                                    <option value="30">30 Days</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="min_increment">Min Bid Increment (৳)</label>
                                <input
                                    id="min_increment"
                                    type="number"
                                    name="min_increment"
                                    value={form.min_increment}
                                    onChange={handleChange}
                                    placeholder={form.starting_price
                                        ? `Auto: ৳${Math.max(100, Math.round((Number(form.starting_price) * 0.05) / 100) * 100).toLocaleString()}`
                                        : "Auto-calculated (5% of price)"
                                    }
                                    min="100"
                                    step="100"
                                />
                                <span className="field-hint">
                                    Leave blank to auto-set at 5% of starting price (min ৳100)
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="image-section">
                        <h3>Item Photographs</h3>

                        <div className="form-group">
                            <label htmlFor="image_url">Image Web URL</label>
                            <input
                                id="image_url"
                                type="url"
                                name="image_url"
                                value={form.image_url}
                                onChange={handleChange}
                                placeholder="https://example.com/item-photo.jpg"
                            />
                        </div>

                        <div className="or-divider">
                            <span>OR UPLOAD LOCAL FILE</span>
                        </div>

                        <div className="file-input-wrapper">
                            <label htmlFor="image">Choose File from Computer</label>
                            <input
                                id="image"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(event) =>
                                    setImage(event.target.files[0])
                                }
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="sell-submit-btn"
                        disabled={loading}
                    >
                        {loading ? "Listing Item…" : "Publish Listing"}
                    </button>
                </form>

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

export default SellItem;