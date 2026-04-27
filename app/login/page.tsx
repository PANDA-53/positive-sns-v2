"use client";

import { useState, Suspense } from 'react';
import { login, signup } from '../actions';
import { useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import Image from 'next/image';

// 送信ボタン専用のコンポーネント
function SubmitButton({ isLogin }: { isLogin: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending}
      className={`w-full py-4 rounded-2xl font-bold transition-all ${
        pending 
          ? 'bg-gray-400 cursor-not-allowed scale-95' 
          : 'bg-black text-white hover:bg-gray-800 active:scale-95'
      }`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="animate-ping h-2 w-2 rounded-full bg-white"></span>
          処理中...
        </span>
      ) : (
        isLogin ? 'ログインする' : 'アカウントを作成'
      )}
    </button>
  );
}

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

      {error && <p className="text-red-500 text-xs text-center bg-red-50 py-3 rounded-xl animate-bounce">認証に失敗しました</p>}
      {message === 'success' && <p className="text-gray-600 text-xs text-center bg-gray-50 py-3 rounded-xl">登録完了！ログインしてください</p>}

      <form action={isLogin ? login : signup} className="space-y-4">
        <input 
          name="email" 
          type="email" 
          placeholder="メールアドレス" 
          inputMode="email" 
          autoComplete="email"
          className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all" 
          required 
        />
        <input 
          name="password" 
          type="password" 
          placeholder="パスワード" 
          autoComplete={isLogin ? "current-password" : "new-password"}
          className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all" 
          required 
        />
        <SubmitButton isLogin={isLogin} />
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    // min-screen を min-h-screen に修正（画面中央に配置するため）
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F2] p-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl w-full max-w-md border border-gray-100">
        
        <div className="flex flex-col items-center mb-8 text-center">
          {/* メインロゴ：ポジティブす */}
          <h1 className="text-2xl font-black tracking-tighter text-green-700">
            POSITIVES
          </h1>
          
          {/* サブキャッチコピー */}
          <p className="text-2xl
         font-bold tracking-tight text-slate-900">
            A sanctuary for your soul.
          </p>
        </div>

        <div>
          <Suspense fallback={<div className="text-center text-gray-400 py-10">読み込み中...</div>}>
            <LoginFormInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}