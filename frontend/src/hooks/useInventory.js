import { useEffect, useState, useCallback } from "react";
import { useSignalR } from "./useSignalR"; // Import the hook

const API_URL = "http://localhost:5145/api/Inventory";

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");

  // Handle inventory updates from SignalR
  const handleInventoryUpdate = useCallback((action, product) => {
    console.log("Inventory update:", action, product);
    
    setProducts(prevProducts => {
      switch(action) {
        case "Product added":
          // Add new product
          return [...prevProducts, product];
          
        case "Product updated":
          // Update existing product
          return prevProducts.map(p => 
            p.id === product.id ? product : p
          );
          
        case "Product deleted":
          // Remove deleted product
          return prevProducts.filter(p => p.id !== product.id);
          
        case "Product quantity adjusted":
          // Update quantity only
          return prevProducts.map(p => 
            p.id === product.id 
              ? { ...p, qty: product.qty, status: product.status }
              : p
          );
          
        default:
          return prevProducts;
      }
    });
    
    // Show notification
    setNotification(`${action}: ${product.name}`);
    setTimeout(() => setNotification(""), 3000);
  }, []);

  // Handle general notifications
  const handleNotification = useCallback((message) => {
    console.log("Notification:", message);
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  }, []);

  // Use SignalR hook
  useSignalR("http://localhost:5145/hubs/inventory", {
    "InventoryUpdated": handleInventoryUpdate,
    "ReceiveNotification": handleNotification
  });

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
    // State will update automatically via SignalR
  };

  const adjustQty = async (id, delta) => {
    await fetch(`${API_URL}/${id}/adjust-qty?delta=${delta}`, {
      method: "PATCH",
    });
    // State will update automatically via SignalR
  };

  const createProduct = async (formData) => {
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });
    return await res.json();
  };

  const updateProduct = async (id, formData) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      body: formData,
    });
    return res.ok;
  };

  // Initial load
  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    error,
    notification,
    loadProducts,
    deleteProduct,
    adjustQty,
    createProduct,
    updateProduct,
  };
}