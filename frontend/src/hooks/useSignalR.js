import { useEffect, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";

export function useSignalR(url, events = {}) {
  const connectionRef = useRef(null);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const startConnection = useCallback(async () => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      if (connectionRef.current) {
        await connectionRef.current.stop();
      }

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            console.log(`SignalR retry attempt ${retryContext.previousRetryCount + 1}`);
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      Object.entries(eventsRef.current).forEach(([eventName, handler]) => {
        connection.on(eventName, handler);
      });

      connection.onclose((error) => {
        console.log("SignalR connection closed:", error?.message || "No error");
      });

      connection.onreconnecting((error) => {
        console.log("SignalR reconnecting:", error?.message || "No error");
      });

      connection.onreconnected((connectionId) => {
        console.log("SignalR reconnected. Connection ID:", connectionId);
      });

      await connection.start();
      console.log(`SignalR Connected to ${url}`);
      connectionRef.current = connection;

    } catch (err) {
      console.error("SignalR Connection Error:", err);
    }
  }, [url]);

  useEffect(() => {
    let isMounted = true;

    const initializeConnection = async () => {
      if (isMounted) {
        await startConnection();
      }
    };

    initializeConnection();

    return () => {
      isMounted = false;
      
      if (connectionRef.current) {
        console.log("Cleaning up SignalR connection");
        connectionRef.current.stop().catch(err => {
          console.error("Error stopping SignalR connection:", err);
        });
      }
    };
  }, [startConnection]);

  return {
    connection: connectionRef.current,
    restartConnection: startConnection
  };
}