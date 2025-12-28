import { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import { useSignalR } from "../hooks/useSignalR";
import { useToast } from "../hooks/useToast";

function Inventory() {
  const API_URL = "http://localhost:5145/api/Inventory";

  const { products, loading, error, loadProducts, deleteProduct, adjustQty } =
    useInventory();

  const { toasts, pushToast } = useToast();
  useSignalR(pushToast);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    price: "",
    qty: "",
    status: true,
    image: null,
  });

  // ---------------------------
  // SEARCH
  // ---------------------------
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search) return loadProducts();

    try {
      const res = await fetch(`${API_URL}/byname/${search}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      // assuming API returns single item
      pushToast("Search completed");
    } catch {
      pushToast("Search failed");
    }
  };

  // ---------------------------
  // FORM CHANGE
  // ---------------------------
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      setForm({ ...form, image: files[0] });
      return;
    }

    let updatedForm = { ...form, [name]: value };

    if (name === "qty") {
      const qtyVal = parseInt(value, 10) || 0;
      updatedForm.qty = qtyVal;
      updatedForm.status = qtyVal > 0;
    }

    setForm(updatedForm);
  };

  // ---------------------------
  // SUBMIT (ADD / EDIT) ✅ USED
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
      await fetch(form.id ? `${API_URL}/${form.id}` : API_URL, {
        method: form.id ? "PUT" : "POST",
        body: formData,
      });

      pushToast(form.id ? "Product updated" : "Product added");

      setForm({
        id: null,
        name: "",
        price: "",
        qty: "",
        status: true,
        image: null,
      });

      document.getElementById("imageInput").value = "";
      setShowModal(false);
      loadProducts();
    } catch {
      pushToast("Save failed");
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
    await deleteProduct(id);
    pushToast("Product removed");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-8 text-center bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
        📦 Inventory Management
      </h1>

      {/* Search + Add */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="border rounded-lg p-2 flex-1"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg">
            Search
          </button>
        </form>

        <button
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg"
        >
          ➕ Add Product
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-gray-500 mb-4">Loading...</p>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border rounded-lg shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">Name</th>
              <th className="p-3">Price</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-blue-50 transition">
                <td className="p-3">
                  <img src={p.uri} className="w-16 h-16 rounded object-cover" />
                </td>
                <td className="p-3">{p.name}</td>
                <td className="p-3">₱{p.price}</td>
                <td className="p-3">{p.qty}</td>
                <td className="p-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      p.status
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {p.status ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => handleEdit(p)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => adjustQty(p.id, 1)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => adjustQty(p.id, -1)}
                    className="bg-gray-600 text-white px-3 py-1 rounded"
                  >
                    -1
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL FORM ✅ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500"
            >
              ✖
            </button>

            <h2 className="text-2xl font-semibold mb-4">
              {form.id ? "✏️ Edit Product" : "➕ Add Product"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                name="name"
                placeholder="Product Name"
                value={form.name}
                onChange={handleChange}
                className="border p-2 w-full rounded"
                required
              />

              <input
                type="number"
                name="price"
                placeholder="Price"
                value={form.price}
                onChange={handleChange}
                className="border p-2 w-full rounded"
                required
              />

              <input
                type="number"
                name="qty"
                placeholder="Quantity"
                value={form.qty}
                onChange={handleChange}
                className="border p-2 w-full rounded"
                required
              />

              <input
                id="imageInput"
                type="file"
                accept="image/*"
                onChange={handleChange}
              />

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
              >
                {form.id ? "Update Product" : "Add Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toasts */}
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
