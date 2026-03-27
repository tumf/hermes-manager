import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // launchctl などサーバー側 child_process を使うため Node.js ランタイム固定
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
