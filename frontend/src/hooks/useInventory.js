// In your useInventory.js
import { useEffect, useState, useRef } from "react";
import { useSignalR } from "./useSignalR";

const API_URL = "http://localhost:5145/api/Inventory";

export function useInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Track processed SignalR updates to prevent duplicates
  const processedUpdatesRef = useRef(new Set());

  const loadProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
      
      // Clear processed updates when we load fresh data
      processedUpdatesRef.current.clear();
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle SignalR updates
  const handleInventoryUpdate = (action, product) => {
    const updateKey = `${action}-${product.id}-${Date.now()}`;
    
    // Skip if we've already processed this update
    if (processedUpdatesRef.current.has(updateKey)) {
      return;
    }
    
    processedUpdatesRef.current.add(updateKey);
    
    setProducts(prevProducts => {
      switch(action) {
        case "Product added":
          const alreadyExists = prevProducts.some(p => p.id === product.id);
          if (alreadyExists) {
            return prevProducts; 
          }
          return [...prevProducts, product];
          
        case "Product updated":
          return prevProducts.map(p => 
            p.id === product.id ? product : p
          );
          
        case "Product deleted":
          return prevProducts.filter(p => p.id !== product.id);
          
        case "Product quantity adjusted":
          return prevProducts.map(p => 
            p.id === product.id 
              ? { ...p, qty: product.qty, status: product.status }
              : p
          );
          
        default:
          return prevProducts;
      }
    });
    
    setTimeout(() => {
      processedUpdatesRef.current.delete(updateKey);
    }, 5000);
  };

  useSignalR("http://localhost:5145/hubs/inventory", {
    "InventoryUpdated": handleInventoryUpdate
  });

  const deleteProduct = async (id) => {
    await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  };

  const adjustQty = async (id, delta) => {
    await fetch(`${API_URL}/${id}/adjust-qty?delta=${delta}`, {
      method: "PATCH",
    });
  };

  const createProduct = async (formData) => {
    const res = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error("Failed to create product");
    }
    
    return await res.json();
  };

  const updateProduct = async (id, formData) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      body: formData,
    });
    
    if (!res.ok) {
      throw new Error("Failed to update product");
    }
    
    return res.ok;
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
    createProduct,
    updateProduct,
  };
}