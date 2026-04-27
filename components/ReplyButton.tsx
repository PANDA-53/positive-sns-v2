"use client";
import { useFormStatus } from "react-dom";

export function ReplyButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending}
      className={`bg-gray-800 text-white w-8 h-8 rounded-full flex items-center justify-center transition-all ${
        pending ? "opacity-50 scale-90" : "hover:scale-105"
      }`}
    >
      {pending ? (
        <div className="h-3 w-3 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925L10.79 10l-7.097 1.836-1.414 4.925a.75.75 0 00.826.95 44.82 44.82 0 0014.174-7.443.75.75 0 000-1.216 44.82 44.82 0 00-14.174-7.443z" />
        </svg>
      )}
    </button>
  );
}