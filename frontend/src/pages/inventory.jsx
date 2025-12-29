import { useState, useEffect, useCallback } from "react";
import { useInventory } from "../hooks/useInventory";
import { useSignalR } from "../hooks/useSignalR";
import { useToast } from "../hooks/useToast";
import { Search, Plus, Edit, Trash2, Package, DollarSign, BarChart, Filter, Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";

function Inventory() {
  const { 
    products, 
    loading, 
    error, 
    notification,
    loadProducts, 
    deleteProduct, 
    adjustQty,
    createProduct,
    updateProduct
  } = useInventory();

  const { toasts, pushToast } = useToast();
  
  // Use SignalR for real-time notifications
  const handleNotification = useCallback((message) => {
    pushToast(message);
  }, [pushToast]);

  const handleInventoryUpdate = useCallback((action, product) => {
    pushToast(`${action}: ${product.name}`);
  }, [pushToast]);

  // Connect to both SignalR hubs
  useSignalR("http://localhost:5145/hubs/inventory", {
    "InventoryUpdated": handleInventoryUpdate
  });

  useSignalR("http://localhost:5145/hubs/notifications", {
    "ReceiveNotification": handleNotification
  });

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [form, setForm] = useState({
    id: null,
    name: "",
    price: "",
    qty: "",
    status: true,
    image: null,
  });

  // Show notification from inventory hook
  useEffect(() => {
    if (notification) {
      pushToast(notification);
    }
  }, [notification, pushToast]);

  const stats = {
    totalProducts: products.length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.qty), 0),
    availableProducts: products.filter(p => p.status).length,
    lowStock: products.filter(p => p.qty < 5).length,
  };

  const filteredProducts = products.filter(product => {
    if (activeFilter === "available") return product.status;
    if (activeFilter === "unavailable") return !product.status;
    if (activeFilter === "lowstock") return product.qty < 5;
    return true;
  }).filter(product => 
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  // Get appropriate empty state message based on filter
  const getEmptyStateMessage = () => {
    if (search) {
      return {
        title: "No products found",
        message: `No products match "${search}"`,
        showButton: false
      };
    }
    
    switch (activeFilter) {
      case "available":
        return {
          title: "No available products",
          message: "All products are currently out of stock",
          showButton: true
        };
      case "unavailable":
        return {
          title: "No unavailable products",
          message: "All products are currently in stock",
          showButton: false
        };
      case "lowstock":
        return {
          title: "No low stock products",
          message: "All products have sufficient stock levels",
          showButton: false
        };
      default:
        return {
          title: "No products yet",
          message: "Add your first product to get started",
          showButton: true
        };
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Real-time filtering is handled by the filteredProducts function
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("Name", form.name);
    formData.append("Price", parseFloat(form.price));
    formData.append("Qty", parseInt(form.qty, 10));
    formData.append("status", form.status);
    if (form.image) formData.append("Image", form.image);

    try {
      if (form.id) {
        await updateProduct(form.id, formData);
        pushToast("Product updated");
      } else {
        await createProduct(formData);
        pushToast("Product added");
      }

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
      // No need to call loadProducts() - SignalR will handle real-time updates
    } catch (err) {
      pushToast("Save failed");
      console.error(err);
    }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      pushToast("Product removed");
    } catch (err) {
      pushToast("Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Inventory Dashboard
              </h1>
              <p className="text-gray-600">Manage your products and track stock levels</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus size={20} />
              Add Product
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Package className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Value</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">₱{stats.totalValue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Available</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.availableProducts}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Eye className="text-purple-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Low Stock</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStock}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <BarChart className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <form onSubmit={handleSearch} className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>

            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-500" />
              <div className="flex flex-wrap gap-2">
                {["all", "available", "unavailable", "lowstock"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg capitalize transition-all ${activeFilter === filter 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    {filter === "lowstock" ? "Low Stock" : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                    p.status ? "border-green-100" : "border-red-100"
                  }`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={p.uri} 
                      alt={p.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                      }}
                    />
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        p.status
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}>
                        {p.status ? "Available" : "Out of Stock"}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{p.name}</h3>
                        <p className="text-2xl font-bold text-blue-600">₱{p.price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p className={`text-2xl font-bold ${
                          p.qty < 5 ? "text-red-600" : "text-green-600"
                        }`}>
                          {p.qty} <span className="text-sm">units</span>
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>Stock Level</span>
                        <span>{Math.round(Math.min(100, (p.qty / 20) * 100))}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            p.qty < 5 ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.round(Math.min(100, (p.qty / 20) * 100))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => adjustQty(p.id, 1)}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors"
                      >
                        <TrendingUp size={16} />
                        +1
                      </button>
                      <button
                        onClick={() => adjustQty(p.id, -1)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                      >
                        <TrendingDown size={16} />
                        -1
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <Package className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-2xl font-bold text-gray-700 mb-2">
                  {getEmptyStateMessage().title}
                </h3>
                <p className="text-gray-500 mb-6">
                  {getEmptyStateMessage().message}
                </p>
                {getEmptyStateMessage().showButton && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                  >
                    <Plus size={20} />
                    Add Product
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md relative animate-slide-up">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {form.id ? "✏️ Edit Product" : "Add New Product"}
              </h2>
              <p className="text-gray-500 mt-1">Fill in the product details below</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <input
                  name="name"
                  placeholder="Enter product name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                <input
                  type="number"
                  name="price"
                  placeholder="0.00"
                  value={form.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  name="qty"
                  placeholder="0"
                  value={form.qty}
                  onChange={handleChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors">
                  <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                  />
                  <label htmlFor="imageInput" className="cursor-pointer">
                    <Package className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-sm text-gray-600">
                      {form.image ? form.image.name : "Click to upload product image"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mt-6"
              >
                {form.id ? "Update Product" : "Add Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="fixed top-6 right-6 space-y-3 z-[9999]">
        {toasts.map((msg, i) => (
          <div
            key={i}
            className="animate-slide-in-left bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl min-w-[300px] border-l-4 border-blue-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>{msg}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;