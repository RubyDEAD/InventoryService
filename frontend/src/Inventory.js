import { useEffect, useState } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";

function Inventory() {
  const API_URL = "http://localhost:5145/api/Inventory";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    price: "",
    qty: "",
    status: true,
    image: null,
  });

  const [toasts, setToasts] = useState([]);

  // ---------------------------
  // LOAD PRODUCTS
  // ---------------------------
  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ---------------------------
  // SEARCH
  // ---------------------------
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search) return loadProducts();

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/byname/${search}`);
      if (res.ok) {
        const data = await res.json();
        setProducts([data]);
      } else {
        setProducts([]);
      }
    } catch {
      setError("Search failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // FORM CHANGE
  // ---------------------------
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "file") {
      setForm({ ...form, image: files[0] });
    } else if (type === "checkbox") {
      if (form.qty > 0) {
        setForm({ ...form, [name]: checked });
      }
    } else {
      let updatedForm = { ...form, [name]: value };
      if (name === "qty") {
        const qtyVal = parseInt(value, 10) || 0;
        updatedForm.qty = qtyVal;
        updatedForm.status = qtyVal > 0;
      }
      setForm(updatedForm);
    }
  };

  // ---------------------------
  // SUBMIT (ADD/EDIT)
  // ---------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("Name", form.name);
    formData.append("Price", form.price);
    formData.append("Qty", form.qty);
    formData.append("status", form.status);
    if (form.image) formData.append("Image", form.image);

    try {
      if (form.id) {
        await fetch(`${API_URL}/${form.id}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        await fetch(API_URL, {
          method: "POST",
          body: formData,
        });
      }

      setForm({ id: null, name: "", price: "", qty: "", status: true, image: null });
      document.getElementById("imageInput").value = "";
      setShowModal(false);
      loadProducts();
    } catch {
      setError("Save failed");
    }
  };

  // ---------------------------
  // EDIT
  // ---------------------------
  const handleEdit = (p) => {
    setForm({
      id: p.id,
      name: p.name,
      price: p.price,
      qty: p.qty,
      status: p.status,
      image: null,
    });
    setShowModal(true);
  };

  // ---------------------------
  // DELETE
  // ---------------------------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      setProducts(products.filter((p) => p.id !== id));
    } catch {
      setError("Delete failed");
    }
  };

  // ---------------------------
  // QTY ADJUST
  // ---------------------------
  const handleAdjustQty = async (id, delta) => {
    try {
      const res = await fetch(`${API_URL}/${id}/adjust-qty?delta=${delta}`, {
        method: "PATCH",
      });
      if (res.ok) loadProducts();
    } catch {
      setError("Adjust qty failed");
    }
  };

  // ---------------------------
  // TOAST
  // ---------------------------
  const pushToast = (message) => {
    setToasts((prev) => [...prev, message]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
  };

  // ---------------------------
  // SIGNALR CONNECTION
  // ---------------------------
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5145/hubs/notifications")
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (message) => {
      console.log("Notification:", message);
      // window.toast?.(message) || alert(message);
      pushToast(message);
    });

    connection.start()
      .then(() => console.log("(Websocket) SignalR Connected"))
      .catch((err) => console.error("SignalR Error:", err));

    return () => connection.stop();
  }, []);


  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">📦 Inventory Management</h1>

      {/* Search + Add Button */}
      <div className="flex justify-between items-center mb-6">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="border rounded p-2 flex-1"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Search
          </button>
        </form>
        <button
          onClick={() => setShowModal(true)}
          className="ml-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded"
        >
          ➕ Add Product
        </button>
      </div>

      {/* Error / Loading */}
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Loading...</p>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 rounded-lg overflow-hidden shadow">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-3">Image</th>
              <th className="border p-3">Name</th>
              <th className="border p-3">Price</th>
              <th className="border p-3">Qty</th>
              <th className="border p-3">Status</th>
              <th className="border p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="odd:bg-white even:bg-gray-50">
              <td className="border p-3">
                <img
                  src={p.uri}
                  alt={p.name}
                  className="w-16 h-16 object-cover rounded"
                />
              </td>

              <td className="border p-3">{p.name}</td>
              <td className="border p-3">₱{p.price}</td>
              <td className="border p-3">{p.qty}</td>

              {/* FIXED STATUS CELL */}
              <td className="border p-3">
                {p.status ? (
                  <span className="text-green-600 font-medium">Available</span>
                ) : (
                  <span className="text-red-600 font-medium">Unavailable</span>
                )}
              </td>

              <td className="border p-3 space-x-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                >
                  Remove
                </button>
                <button
                  onClick={() => handleAdjustQty(p.id, 1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                  +1
                </button>
                <button
                  onClick={() => handleAdjustQty(p.id, -1)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                >
                  -1
                </button>
              </td>
            </tr>
            ))}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center p-4 text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-2 text-gray-600 hover:text-black"
            >
              ✖
            </button>
            <h2 className="text-xl font-semibold mb-4">
              {form.id ? "✏️ Edit Product" : "➕ Add Product"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="border p-2 block w-full rounded"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Price</label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  className="border p-2 block w-full rounded"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  name="qty"
                  value={form.qty}
                  onChange={handleChange}
                  className="border p-2 block w-full rounded"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  readOnly
                  disabled
                />
                <label className="font-medium">
                  {form.status ? "Available" : "Unavailable"}
                </label>
              </div>
              <div>
                <label className="block font-medium mb-1">Upload Image</label>
                <input
                  id="imageInput"
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="block"
                />
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded w-full"
              >
                {form.id ? "Update Product" : "Add Product"}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="fixed top-4 right-4 space-y-2 z-[9999]">
  {toasts.map((msg, i) => (
          <div
            key={i}
            className="animate-slide-in bg-gray-800 text-white px-4 py-2 rounded shadow-lg"
          >
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;
