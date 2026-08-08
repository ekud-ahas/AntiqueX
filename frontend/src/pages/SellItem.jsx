import { useState } from "react";
import "./SellItem.css";

function SellItem() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [form, setForm] = useState({
        title: "",
        description: "",
        year_of_origin: "",
        condition: "",
        starting_price: "",
        category_id: "",
        image_url: ""
    });

    const [image, setImage] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!user) {
            setMessage("Please login before selling an item.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const formData = new FormData();

            formData.append("seller_id", user.user_id);
            formData.append("category_id", form.category_id);
            formData.append("title", form.title);
            formData.append("description", form.description);
            formData.append("year_of_origin", form.year_of_origin);
            formData.append("condition", form.condition);
            formData.append("starting_price", form.starting_price);

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

            setMessage("Item listed successfully!");

            setForm({
                title: "",
                description: "",
                year_of_origin: "",
                condition: "",
                starting_price: "",
                category_id: "",
                image_url: ""
            });

            setImage(null);

            document.getElementById("image").value = "";

        } catch (error) {
            console.error(error);
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="sell-message">
                <h2>Please login first</h2>
                <p>You need an account to sell an item.</p>
            </div>
        );
    }

    return (
        <div className="sell-page">

            <div className="sell-container">

                <h1>Sell an Antique</h1>

                <p className="sell-description">
                    List your antique item on AntiqueX.
                </p>

                <form onSubmit={handleSubmit}>

                    <label>Title</label>
                    <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        placeholder="Example: Vintage Camera"
                        required
                    />

                    <label>Description</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Describe your item"
                        rows="4"
                    />

                    <label>Year of Origin</label>
                    <input
                        type="number"
                        name="year_of_origin"
                        value={form.year_of_origin}
                        onChange={handleChange}
                        placeholder="Example: 1975"
                    />

                    <label>Condition</label>
                    <input
                        type="text"
                        name="condition"
                        value={form.condition}
                        onChange={handleChange}
                        placeholder="Example: Excellent"
                    />

                    <label>Category ID</label>
                    <input
                        type="number"
                        name="category_id"
                        value={form.category_id}
                        onChange={handleChange}
                        placeholder="Example: 1"
                        required
                    />

                    <label>Starting Price</label>
                    <input
                        type="number"
                        name="starting_price"
                        value={form.starting_price}
                        onChange={handleChange}
                        placeholder="Example: 15000"
                        min="0"
                        step="0.01"
                        required
                    />

                    <div className="image-section">

                        <h3>Item Image</h3>

                        <label>
                            Image URL
                        </label>

                        <input
                            type="url"
                            name="image_url"
                            value={form.image_url}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                        />

                        <p className="or-text">OR</p>

                        <label>
                            Upload from your computer
                        </label>

                        <input
                            id="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                                setImage(event.target.files[0])
                            }
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Listing..." : "List Item"}
                    </button>

                </form>

                {message && (
                    <p className="sell-result">
                        {message}
                    </p>
                )}

            </div>

        </div>
    );
}

export default SellItem;