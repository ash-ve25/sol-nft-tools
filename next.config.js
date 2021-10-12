const withTM = require('next-transpile-modules')([
  '@solana/wallet-adapter-react',
  '@solana/wallet-adapter-wallets',
  '@solana/wallet-adapter-base',
  '@solana/wallet-adapter-ledger',
  '@solana/wallet-adapter-mathwallet',
  '@solana/wallet-adapter-phantom',
  "@solana/wallet-adapter-solflare",
  "@solana/wallet-adapter-sollet",
  "@solana/wallet-adapter-solong",
  "@solana/wallet-adapter-torus",
  "@project-serum/sol-wallet-adapter",
]); 
// pass the modules you would like to see transpiled
module.exports = withTM({
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/:any*',
        destination: '/',
      },
    ];
  },
})
