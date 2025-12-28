import { useEffect, useState } from "react";

const API_URL = "http://localhost:5145/api/Inventory";

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch products");
      setProducts(await res.json());
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const adjustQty = async (id, delta) => {
    await fetch(`${API_URL}/${id}/adjust-qty?delta=${delta}`, {
      method: "PATCH",
    });
    loadProducts();
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    error,
    loadProducts,
    deleteProduct,
    adjustQty,
  };
}


