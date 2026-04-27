import type { Metadata, Viewport } from "next"; // Viewportを追加
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// PWA用のメタデータ設定
export const metadata: Metadata = {
  title: "Timeline", // アプリ名に合わせて変更してください
  description: "Tree stability monitoring social app",
  manifest: "/manifest.json", // manifest.jsonとの紐付け
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Timeline",
  },
};

// アプリのような挙動にするためのViewport設定
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // 勝手にズームされないようにしてアプリ感を出す
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja" // 日本語に設定
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F2F2F2]">
        {children}
      </body>
    </html>
  );
}