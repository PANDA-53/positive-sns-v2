// @ts-nocheck
import withPWAInit from "@ducanh2912/next-pwa";

/**
 * PWAの設定
 * これにより「ホーム画面に追加」が可能になり、将来的にプッシュ通知が送れるようになります。
 */
const withPWA = withPWAInit({
  dest: "public", // Service Workerなどの書き出し先
  cacheOnFrontEndNav: true, // フロントエンド移動時のキャッシュを有効化
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // 開発中はオフにしてビルドを速くする
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpackを強制するための設定
  // NEXT_TURBOPACK=0 と組み合わせることで、PWAライブラリとの衝突を防ぎます
  webpack: (config) => {
    return config;
  },
};

// PWA設定でラップしてエクスポート
export default withPWA(nextConfig);