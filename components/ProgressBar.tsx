"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css"; // 標準の青いバーのスタイル

// NProgressのカスタマイズ（色や速度など）
NProgress.configure({ 
  showSpinner: false, // 右上のくるくるを消す
  speed: 400, 
  minimum: 0.3 
});

export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ページ遷移が完了したときにバーを消す
    NProgress.done();
  }, [pathname, searchParams]);

  return null; // 画面には何も表示せず、裏でバーを制御するだけ
}