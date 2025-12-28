import { useState } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const pushToast = (message) => {
    setToasts((prev) => [...prev, message]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
  };

  return { toasts, pushToast };
}
