"use client";

import { useState, Suspense } from 'react';
import { login, signup } from '../actions';
import { useSearchParams } from 'next/navigation';

// クエリパラメータを安全に読み込むためのコンポーネント
function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  return (
    <div className="bg-white py-8 px-6 shadow-xl rounded-[2.5rem] border border-gray-100">
      {/* 切り替えタブ */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
        <button 
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
        >
          ログイン
        </button>
        <button 
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
        >
          新規登録
        </button>
      </div>

      {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-xl mb-4 border border-red-100 text-center">認証に失敗しました</p>}
      {message === 'check-email' && <p className="text-green-600 text-xs bg-green-50 p-3 rounded-xl mb-4 border border-green-100 text-center">確認メールを送りました！</p>}

      <form action={isLogin ? login : signup} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-gray-400 ml-4 mb-1">メールアドレス</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-black outline-none focus:ring-2 focus:ring-green-100 transition-all"
            placeholder="example@mail.com"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 ml-4 mb-1">パスワード</label>
          <input
            name="password"
            type="password"
            required
            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-black outline-none focus:ring-2 focus:ring-green-100 transition-all"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-bold text-white bg-green-500 hover:bg-green-600 transition-all active:scale-95"
        >
          {isLogin ? 'ログインする' : 'アカウントを作成'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-green-700 mb-8">POSITIVE SNS</h1>
        <Suspense fallback={<div className="text-center text-gray-400">読み込み中...</div>}>
          <LoginForm />
        </Suspense>
        <div className="mt-6 text-center">
          <a href="/" className="text-xs text-gray-400 hover:text-green-600 transition-colors">← トップページに戻る</a>
        </div>
      </div>
    </div>
  );
}