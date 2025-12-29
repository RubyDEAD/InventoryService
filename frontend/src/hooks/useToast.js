import { useState, useEffect, useRef } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const connectionRef = useRef(null);
  const messageBufferRef = useRef(new Map());

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5145/hubs/notifications")
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (message) => {
      const currentCount = messageBufferRef.current.get(message) || 0;
      messageBufferRef.current.set(message, currentCount + 1);
      
      setTimeout(() => {
        const messagesToShow = [];
        
        messageBufferRef.current.forEach((count, msg) => {
          if (count > 1 && (msg.includes("Qty") || msg.includes("quantity"))) {
            const productName = msg.match(/Product '(.+)' has/)?.[1] || "";
            messagesToShow.push(`${productName ? `"${productName}" ` : ""}quantity updated (${count} times)`);
          } else {
            messagesToShow.push(msg);
          }
        });
        
        messageBufferRef.current.clear();
        
        messagesToShow.forEach(msg => {
          const id = Date.now() + Math.random();
          setToasts(prev => [...prev, { id, message: msg }]);
          
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
          }, 3000);
        });
      }, 300); 
    });

    connection.start().catch(err => {
      console.error("Failed to connect to notifications hub:", err);
    });

    connectionRef.current = connection;

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  return { toasts: toasts.map(t => t.message), pushToast: () => {} };
}