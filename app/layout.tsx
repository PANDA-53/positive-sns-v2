import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "POSITIVES",
  description: "心の平穏を守るSNS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-black">
        {/* シンプルに top-center 指定のみにします */}
        <Toaster position="top-center" />
        <main className="min-h-screen pb-20">
          {children}
        </main>
      </body>
    </html>
  );
}