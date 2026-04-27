// @ts-nocheck
import withPWAInit from "@ducanh2912/next-pwa";

// 1. PWAの設定を定義
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
});

// 2. Next.jsの設定（余計なものをすべて排除）
const nextConfig = {
  // Webpackを強制するための設定（これがないと環境変数が無視されることがあります）
  webpack: (config) => {
    return config;
  },
};

// 3. PWA設定でラップしてエクスポート
export default withPWA(nextConfig);