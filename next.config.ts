// @ts-nocheck
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // これが最重要：空のターボ設定を入れることで、Vercelの自動ターボを無効化します
  experimental: {
    turbo: {
      // ターボ設定を空にする
    },
  },
  // webpack設定を明示的に記述して、webpackの使用を強制します
  webpack: (config) => {
    return config;
  },
};

export default withPWA(nextConfig);