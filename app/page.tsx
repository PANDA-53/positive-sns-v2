"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Home() {
  const [supabase] = useState(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      // 1. ログインしているユーザーがいるか確認
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 2. profilesテーブルから、そのユーザーの名前（full_name）を取ってくる
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setUserName(data.full_name);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [supabase]);

  if (loading) return <div className="text-center mt-20">読み込み中...</div>;

  return (
    <main className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-2xl mx-auto py-10 text-center">
        <h1 className="text-4xl font-extrabold text-orange-600 mb-6">🌻 ポジティブSNS 🌻</h1>
        
        <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-orange-400">
          {userName ? (
            <div>
              <p className="text-2xl mb-2 text-gray-700">ようこそ、</p>
              <p className="text-4xl font-black text-orange-500 mb-6">{userName} さん！</p>
              <p className="text-gray-500">今日もポジティブな1日にしましょう！</p>
            </div>
          ) : (
            <div>
              <p className="text-xl text-gray-600 mb-6">ログインしてポジティブを共有しよう</p>
              <a href="/login" className="bg-orange-500 text-white px-6 py-3 rounded-full font-bold hover:bg-orange-600 transition">
                ログイン画面へ
              </a>
            </div>
          )}
        </div>

        {/* サンプル投稿表示（後で投稿機能と合体させましょう） */}
        <div className="mt-10 bg-white/50 p-6 rounded-xl italic text-gray-600">
          「エラーを解決して、自分の名前が表示された！最高だ！」 — Gimax
        </div>
      </div>
    </main>
  );
}