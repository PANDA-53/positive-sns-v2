"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // 画面の一番上にいる時だけ検知を開始
      if (window.scrollY === 0) {
        startY = e.touches[0].pageY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].pageY;
      const distance = endY - startY;

      // 70px以上下にスワイプしたら更新
      if (window.scrollY === 0 && distance > 70 && !isRefreshing) {
        setIsRefreshing(true);
        router.refresh(); // Next.jsのデータを再取得
        
        // 少し時間を置いてからローディング表示を消す
        setTimeout(() => setIsRefreshing(false), 1000);
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [router, isRefreshing]);

  return (
    <>
      {isRefreshing && (
        <div className="fixed top-20 left-0 right-0 flex justify-center z-50 pointer-events-none animate-bounce">
          <div className="bg-white shadow-md rounded-full p-2 border border-gray-100">
            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      )}
      {children}
    </>
  );
}