/** @type {import('next').NextConfig} */

// wagmi's `wagmi/connectors` barrel statically re-exports every connector
// (baseAccount, coinbaseWallet, metaMask, walletConnect, safe). Each pulls an
// OPTIONAL peer dep we don't install. SCOPE only uses the `injected` connector
// (window.ethereum / MetaMask), which needs none of them — so we alias the unused
// optional deps to `false`. This is wagmi's documented fix for the resulting
// "Module not found" errors, and it also shrinks the client bundle + compile memory.
const UNUSED_WALLET_DEPS = [
  "@base-org/account",
  "@coinbase/wallet-sdk",
  "@metamask/sdk",
  "@walletconnect/ethereum-provider",
  "@walletconnect/modal",
  "@safe-global/safe-apps-sdk",
  "@safe-global/safe-apps-provider",
  "pino-pretty",
];

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    for (const dep of UNUSED_WALLET_DEPS) {
      config.resolve.alias[dep] = false;
    }
    // Silence the optional-dep resolver so a missing one is a no-op, not a fatal.
    config.resolve.fallback = { ...(config.resolve.fallback || {}), "pino-pretty": false };
    return config;
  },
};

export default nextConfig;
