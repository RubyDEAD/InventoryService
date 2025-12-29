import { useEffect, useCallback } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";

export function useSignalR(url, events = {}) {
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect()
      .build();

    // Register all event handlers
    Object.entries(events).forEach(([eventName, handler]) => {
      connection.on(eventName, handler);
    });

    connection
      .start()
      .then(() => console.log(`SignalR Connected to ${url}`))
      .catch((err) => console.error("SignalR Error:", err));

    return () => {
      connection.stop();
    };
  }, [url, events]); 
}