"use client";

import { useState, useEffect } from "react";
// 修正ポイント：より安定した読み込み方に変更しました
import { createClient } from "@supabase/supabase-js";

// ユーザーの定義
const USERS = [
  { id: 1, name: "パンダ", avatar: "🐼" },
  { id: 2, name: "ネコ", avatar: "🐱" },
  { id: 3, name: "イヌ", avatar: "🐶" },
];

// Supabaseとの接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState(USERS[0]);

  // 1. データを読み込む処理
  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
  };

  useEffect(() => {
    fetchPosts();

    // リアルタイム更新の設定
    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          setPosts((current) => [payload.new, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. 投稿する処理
  const handlePost = async () => {
    if (!inputText.trim()) return;

    const { error } = await supabase.from("posts").insert([
      {
        content: inputText,
        user_name: selectedUser.name,
        avatar_url: selectedUser.avatar,
      },
    ]);

    if (error) {
      alert("投稿に失敗しました。テーブルが作成されているか確認してください。");
      console.error(error);
    } else {
      setInputText("");
      // 念のため再取得
      fetchPosts();
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-4 bg-orange-50 min-h-screen">
      <h1 className="text-2xl font-bold text-orange-600 mb-6 text-center">🌻 ポジティブSNS 🌻</h1>
      
      {/* ユーザー選択 */}
      <div className="flex gap-2 mb-4 justify-center">
        {USERS.map((user) => (
          <button
            key={user.id}
            onClick={() => setSelectedUser(user)}
            className={`p-2 rounded-full border-2 transition ${
              selectedUser.id === user.id ? "border-orange-500 bg-orange-100" : "border-transparent bg-white shadow-sm"
            }`}
          >
            {user.avatar} {user.name}
          </button>
        ))}
      </div>

      {/* 投稿フォーム */}
      <div className="bg-white p-4 rounded-xl shadow-md mb-8">
        <textarea
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 text-black"
          placeholder="今のポジティブな気持ちは？"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          onClick={handlePost}
          className="mt-2 w-full bg-orange-500 text-white py-2 rounded-lg font-bold hover:bg-orange-600 transition shadow-md"
        >
          投稿する
        </button>
      </div>

      {/* 投稿一覧 */}
      <div className="space-y-4">
        {posts.length === 0 && (
          <p className="text-center text-gray-500">まだ投稿がありません。最初のポジティブを届けよう！</p>
        )}
        {posts.map((post) => (
          <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-400 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{post.avatar_url}</span>
              <span className="font-bold text-gray-700">{post.user_name}</span>
              <span className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleString("ja-JP")}
              </span>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
          </div>
        ))}
      </div>
    </main>
  );
}