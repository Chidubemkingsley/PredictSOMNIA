/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    // Only fail on errors, not warnings during production builds
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Only fail on errors, not warnings
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable compression
  compress: true,

  // Optimize for production
  poweredByHeader: false,

  // Enable experimental features
  swcMinify: true,

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack config to handle MetaMask SDK
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
      };
    }

    // Ignore optional dependencies and pino-pretty + missing @x402 (transitive via @coinbase/cdp-sdk → @base-org/account → wagmi baseAccount)
    config.externals.push({
      '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
      'pino-pretty': 'commonjs pino-pretty',
      'lokijs': 'commonjs lokijs',
      'encoding': 'commonjs encoding',
      '@x402/core': 'commonjs @x402/core',
      '@x402/core/client': 'commonjs @x402/core/client',
      '@x402/evm': 'commonjs @x402/evm',
      '@x402/evm/exact/client': 'commonjs @x402/evm/exact/client',
      '@x402/evm/upto/client': 'commonjs @x402/evm/upto/client',
      '@x402/svm': 'commonjs @x402/svm',
      '@x402/svm/exact/client': 'commonjs @x402/svm/exact/client',
    });

    return config;
  },
};

module.exports = nextConfig;
