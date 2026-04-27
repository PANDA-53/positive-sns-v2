"use client"; // これが必須です

import { useFormStatus } from "react-dom";

export function PostButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`px-6 py-2 rounded-full font-bold transition-all ${
        pending 
          ? "bg-gray-300 cursor-not-allowed scale-95" 
          : "bg-green-600 text-white active:scale-95 hover:bg-green-700"
      }`}
    >
      {/* OpenAIのチェック時間を考慮してメッセージを変える */}
      {pending ? "AIチェック中..." : "投稿する"}
    </button>
  );
}