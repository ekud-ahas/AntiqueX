import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

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
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
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
        condition: itemData.condition || "",
        starting_price: itemData.starting_price,
      });

      setImages(itemData.images);
      setCategories(categoriesData);
      setLoading(false);
    } catch (error) {
      console.error(error);
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

    try {
      const response = await fetch(`http://localhost:5000/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_id: user.user_id,
          category_id: Number(form.category_id),
          title: form.title,
          description: form.description,
          year_of_origin: form.year_of_origin
            ? Number(form.year_of_origin)
            : null,
          condition: form.condition,
          starting_price: Number(form.starting_price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to update item.");
        return;
      }

      setMessage("Item updated successfully.");

      setTimeout(() => {
        navigate("/my-items");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
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
          body: JSON.stringify({ img_url: newImageUrl.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Failed to add image.");
        return;
      }

      setImages([...images, data.image]);
      setNewImageUrl("");
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleDeleteImage = async (imgId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/items/${id}/images/${imgId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      setImages(images.filter((img) => img.img_id !== imgId));
    } catch (error) {
      console.error(error);
      setMessage("Could not remove that image.");
    }
  };

  if (loading) {
    return <h2>Loading...</h2>;
  }

  if (notAllowed) {
    return (
      <main>
        <h1>Edit Item</h1>
        <p>You do not have permission to edit this item.</p>
        <Link to="/my-items">Back to My Items</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Item</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Category</label>
          <br />
          <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            required
          >
            {categories.map((category) => (
              <option
                key={category.category_id}
                value={category.category_id}
              >
                {category.category_name}
              </option>
            ))}
          </select>
        </div>

        <br />

        <div>
          <label>Title</label>
          <br />
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <label>Description</label>
          <br />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="4"
          />
        </div>

        <br />

        <div>
          <label>Year of Origin</label>
          <br />
          <input
            type="number"
            name="year_of_origin"
            value={form.year_of_origin}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <label>Condition</label>
          <br />
          <input
            type="text"
            name="condition"
            value={form.condition}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <label>Starting Price (৳)</label>
          <br />
          <input
            type="number"
            name="starting_price"
            value={form.starting_price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <br />

        <button type="submit">Save Changes</button>
      </form>

      <hr />

      <h2>Images</h2>

      {images.length === 0 ? (
        <p>No images yet.</p>
      ) : (
        <div>
          {images.map((img) => (
            <div key={img.img_id}>
              <img src={img.img_url} alt="" width="150" />
              <br />
              <button onClick={() => handleDeleteImage(img.img_id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          type="url"
          value={newImageUrl}
          onChange={(event) => setNewImageUrl(event.target.value)}
          placeholder="https://example.com/image.jpg"
        />
        <button type="button" onClick={handleAddImage}>
          Add Image
        </button>
      </div>

      {message && <p>{message}</p>}
    </main>
  );
}

export default EditItem;
