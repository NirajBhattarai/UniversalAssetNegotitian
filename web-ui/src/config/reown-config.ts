import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createConfig } from 'wagmi';

// Hedera Testnet configuration
const hederaTestnet = {
  id: 296,
  name: 'Hedera Testnet',
  nativeCurrency: {
    name: 'HBAR',
    symbol: 'HBAR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.hashio.io/api'],
    },
    public: {
      http: ['https://testnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io/testnet',
    },
  },
  testnet: true,
};

// Hedera Mainnet configuration
const hederaMainnet = {
  id: 295,
  name: 'Hedera Mainnet',
  nativeCurrency: {
    name: 'HBAR',
    symbol: 'HBAR',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.hashio.io/api'],
    },
    public: {
      http: ['https://mainnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hashscan',
      url: 'https://hashscan.io',
    },
  },
  testnet: false,
};

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error(
    'Project ID is not defined. Please set NEXT_PUBLIC_PROJECT_ID in your environment variables.'
  );
}

// Export networks for use in AppKit
export const networks = [hederaTestnet, hederaMainnet];
export const defaultNetwork = hederaTestnet;

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: [hederaTestnet, hederaMainnet],
  transports: {
    [hederaTestnet.id]: http(),
    [hederaMainnet.id]: http(),
  },
  storage: createStorage({
    storage: cookieStorage,
  }),
});

// Create wagmi adapter for Reown AppKit
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
});
