"use client";

import { useState, Suspense } from 'react';
import { login, signup } from '../actions';
import { useSearchParams } from 'next/navigation';

// ① パラメータを扱う中身を別コンポーネントに分ける
function LoginFormInner() {
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  return (
    <div className="space-y-6">
      {/* 切り替えタブ */}
      <div className="flex bg-gray-100 rounded-2xl p-1">
        <button 
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
        >
          ログイン
        </button>
        <button 
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500'}`}
        >
          新規登録
        </button>
      </div>

      {error && <p className="text-red-500 text-xs text-center bg-red-50 py-3 rounded-xl">認証に失敗しました</p>}
      {message === 'success' && <p className="text-gray-600 text-xs text-center bg-gray-50 py-3 rounded-xl">登録完了！ログインしてください</p>}

      <form action={isLogin ? login : signup} className="space-y-4">
        <input name="email" type="email" placeholder="メールアドレス" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" required />
        <input name="password" type="password" placeholder="パスワード" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" required />
        <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">
          {isLogin ? 'ログインする' : 'アカウントを作成'}
        </button>
      </form>
    </div>
  );
}

// ② ページ全体を Suspense で囲む（これがビルドエラーの解決策です）
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2] p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-bold text-center mb-8 italic">Timeline.</h1>
        <Suspense fallback={<div className="text-center text-gray-400">Loading...</div>}>
          <LoginFormInner />
        </Suspense>
      </div>
    </div>
  );
}