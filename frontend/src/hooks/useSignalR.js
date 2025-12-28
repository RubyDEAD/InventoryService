import { useEffect } from "react";
import { HubConnectionBuilder } from "@microsoft/signalr";

export function useSignalR(onMessage) {
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl("http://localhost:5145/hubs/notifications")
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (message) => {
      onMessage(message);
    });

    connection
      .start()
      .then(() => console.log("✅ SignalR Connected"))
      .catch((err) => console.error("SignalR Error:", err));

    return () => {
      connection.stop();
    };
  }, [onMessage]);
}
