import { useEffect } from "react";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timeout = setTimeout(onClose, 4000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="bg-gray-900 text-white px-4 py-3 mb-3 rounded-lg shadow-lg animate-slide-in">
      {message}
    </div>
  );
}
