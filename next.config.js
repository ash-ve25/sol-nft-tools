const withTM = require('next-transpile-modules')([
  '@solana/wallet-adapter-react',
  '@solana/wallet-adapter-base',
  '@solana/wallet-adapter-wallets',
  '@solana/wallet-adapter-bitpie',
  '@solana/wallet-adapter-blocto',
  '@blocto/sdk'
]); 
// pass the modules you would like to see transpiled
module.exports = withTM({
  reactStrictMode: true,
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
