"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // 厳密に 0 ではなく、5px 程度の遊びを持たせる
      if (window.scrollY <= 5) {
        startY = e.touches[0].pageY;
      } else {
        startY = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY === 0) return;

      const currentY = e.touches[0].pageY;
      const progress = currentY - startY;

      // 下方向に引っ張っている時
      if (progress > 0 && window.scrollY <= 5) {
        // { passive: false } で登録しないと preventDefault は効きません
        if (e.cancelable) e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startY === 0) return;

      const endY = e.changedTouches[0].pageY;
      const distance = endY - startY;

      if (window.scrollY <= 5 && distance > 80 && !isRefreshing) {
        setIsRefreshing(true);
        
        // ページ全体を再読み込み（より確実な方法）
        router.refresh();
        
        // サーバーコンポーネントの再取得時間を考慮して少し長めに表示
        setTimeout(() => {
          setIsRefreshing(false);
          startY = 0;
        }, 1500);
      }
    };

    // 重要: { passive: false } を指定しないとブラウザのスクロール制御を上書きできません
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [router, isRefreshing]);

  return (
    <div className="relative">
      {isRefreshing && (
        <div className="fixed top-20 left-0 right-0 flex justify-center z-[100] pointer-events-none">
          <div className="bg-white shadow-xl rounded-full p-3 border border-gray-100 animate-bounce">
            <svg className="animate-spin h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}