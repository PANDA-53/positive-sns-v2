"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { createBrowserClient } from "@supabase/ssr"; // 新しい道具
import { useEffect, useState } from "react";

export default function LoginPage() {
  // ブラウザ用のクライアントを作成
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center text-orange-600">ログイン / 新規登録</h1>
      {origin && (
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["github"]}
          redirectTo={`${origin}/auth/callback`}
        />
      )}
    </div>
  );
}