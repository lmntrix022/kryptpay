import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    // Désactiver ESLint pendant le build pour éviter les erreurs Prettier
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ne pas arrêter le build sur les erreurs TypeScript (mais on les corrige quand même)
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@boohpay/sdk': path.resolve(__dirname, '../../packages/boohpay-sdk/src'),
    };
    return config;
  },
};

export default nextConfig;






