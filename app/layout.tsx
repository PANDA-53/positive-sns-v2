import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import ProgressBar from "@/components/ProgressBar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// メタデータを「POSITIVES」に変更
export const metadata: Metadata = {
  title: "POSITIVES",
  description: "A sanctuary for your soul - Tree stability monitoring social app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POSITIVES",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, 
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ overscrollBehaviorY: 'auto' }}
    >
      <body className="min-h-full flex flex-col bg-[#F2F2F2] overscroll-y-auto">
        {/* ページ遷移時のプログレスバー */}
        <Suspense fallback={null}>
          <ProgressBar />
        </Suspense>

        {/* Toaster: アプリ全体の通知管理
          position="top-center": 視認性の良い画面中央上に表示
          richColors: 警告(オレンジ)や成功(緑)の色を有効化
          closeButton: 手動で閉じられるボタンを表示
        */}
        <Toaster position="top-center" richColors closeButton />

        {children}
      </body>
    </html>
  );
}