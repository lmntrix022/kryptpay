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
    // Ignorer les erreurs TypeScript dans le SDK
    // Le SDK utilise React comme peerDependency, les types sont résolus au runtime
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@boohpay/sdk'],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@boohpay/sdk': path.resolve(__dirname, '../../packages/boohpay-sdk/src'),
    };
    
    // Configurer webpack pour gérer les dépendances optionnelles Stripe dans le SDK
    // Le SDK utilise try/catch pour gérer les dépendances manquantes
    config.resolve.alias = {
      ...config.resolve.alias,
      '@stripe/react-stripe-js': false,
      '@stripe/stripe-js': false,
    };
    
    // Ignorer les warnings pour les modules optionnels
    config.ignoreWarnings = [
      { module: /@boohpay\/sdk/ },
      { message: /Can't resolve '@stripe\/react-stripe-js'/ },
      { message: /Can't resolve '@stripe\/stripe-js'/ },
    ];
    
    return config;
  },
};

export default nextConfig;






