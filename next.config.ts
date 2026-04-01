import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // launchctl などサーバー側 child_process を使うため Node.js ランタイム固定
  typescript: {
    // Page file のexport 型チェックを disable
    // テストが AgentEnvTab を export として依存するため
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
