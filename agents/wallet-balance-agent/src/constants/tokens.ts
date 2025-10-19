/**
 * Multi-Network Token Configuration Constants
 * 
 * This file contains token configurations for Hedera, Ethereum, and Polygon networks.
 * Includes native currencies and popular tokens for balance checking.
 */

// ERC20 Standard ABI for token interactions
export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  }
] as const;

// Token interface for type safety
export interface TokenConfig {
  id: string;
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  blockchain: string;
  network: string;
  isNative: boolean;
  abi?: any[];
}

// Network configurations
export const NETWORKS = {
  HEDERA: {
    id: 'hedera',
    name: 'Hedera Network',
    blockchain: 'Hedera',
    rpcUrl: process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api',
    explorerUrl: 'https://hashscan.io/testnet',
    nativeCurrency: {
      symbol: 'HBAR',
      decimals: 8
    }
  },
  ETHEREUM: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    blockchain: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      symbol: 'ETH',
      decimals: 18
    }
  },
  POLYGON: {
    id: 'polygon',
    name: 'Polygon Network',
    blockchain: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      symbol: 'MATIC',
      decimals: 18
    }
  }
} as const;

// Token addresses organized by network
export const TOKEN_ADDRESSES = {
  HEDERA: {
    HBAR: 'HBAR', // Native Hedera token
    MOCK_USDC: '0xf10061594016f19c1b610f8a461072b177a58aed',
    MOCK_USDT: '0x8be10b721486659a80488755fd709138cb6d7101'
  },
  ETHEREUM: {
    ETH: 'ETH', // Native Ethereum token
    USDC: '0xA0b86a33E6441b8c4C8C0d4B0c4B0c4B0c4B0c4B', // USDC on Ethereum - INVALID ADDRESS
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'  // Wrapped ETH
  },
  POLYGON: {
    MATIC: 'MATIC', // Native Polygon token
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' // Wrapped MATIC
  }
} as const;

// Complete token configurations
export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // Hedera Tokens
  HBAR: {
    id: 'hbar',
    name: 'Hedera Token (HBAR)',
    symbol: 'HBAR',
    address: TOKEN_ADDRESSES.HEDERA.HBAR,
    decimals: 8,
    blockchain: NETWORKS.HEDERA.blockchain,
    network: NETWORKS.HEDERA.id,
    isNative: true
  },
  MOCK_USDC_HEDERA: {
    id: 'mock-usdc-hedera',
    name: 'Mock USD Coin (Hedera)',
    symbol: 'MockUSDC',
    address: TOKEN_ADDRESSES.HEDERA.MOCK_USDC,
    decimals: 6,
    blockchain: NETWORKS.HEDERA.blockchain,
    network: NETWORKS.HEDERA.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },
  MOCK_USDT_HEDERA: {
    id: 'mock-usdt-hedera',
    name: 'Mock Tether (Hedera)',
    symbol: 'MockUSDT',
    address: TOKEN_ADDRESSES.HEDERA.MOCK_USDT,
    decimals: 6,
    blockchain: NETWORKS.HEDERA.blockchain,
    network: NETWORKS.HEDERA.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },

  // Ethereum Tokens
  ETH: {
    id: 'eth',
    name: 'Ethereum (ETH)',
    symbol: 'ETH',
    address: TOKEN_ADDRESSES.ETHEREUM.ETH,
    decimals: 18,
    blockchain: NETWORKS.ETHEREUM.blockchain,
    network: NETWORKS.ETHEREUM.id,
    isNative: true
  },
  USDC_ETHEREUM: {
    id: 'usdc-ethereum',
    name: 'USD Coin (Ethereum)',
    symbol: 'USDC',
    address: TOKEN_ADDRESSES.ETHEREUM.USDC,
    decimals: 6,
    blockchain: NETWORKS.ETHEREUM.blockchain,
    network: NETWORKS.ETHEREUM.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },
  USDT_ETHEREUM: {
    id: 'usdt-ethereum',
    name: 'Tether (Ethereum)',
    symbol: 'USDT',
    address: TOKEN_ADDRESSES.ETHEREUM.USDT,
    decimals: 6,
    blockchain: NETWORKS.ETHEREUM.blockchain,
    network: NETWORKS.ETHEREUM.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },
  WETH: {
    id: 'weth',
    name: 'Wrapped Ethereum',
    symbol: 'WETH',
    address: TOKEN_ADDRESSES.ETHEREUM.WETH,
    decimals: 18,
    blockchain: NETWORKS.ETHEREUM.blockchain,
    network: NETWORKS.ETHEREUM.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },

  // Polygon Tokens
  MATIC: {
    id: 'matic',
    name: 'Polygon (MATIC)',
    symbol: 'MATIC',
    address: TOKEN_ADDRESSES.POLYGON.MATIC,
    decimals: 18,
    blockchain: NETWORKS.POLYGON.blockchain,
    network: NETWORKS.POLYGON.id,
    isNative: true
  },
  USDC_POLYGON: {
    id: 'usdc-polygon',
    name: 'USD Coin (Polygon)',
    symbol: 'USDC',
    address: TOKEN_ADDRESSES.POLYGON.USDC,
    decimals: 6,
    blockchain: NETWORKS.POLYGON.blockchain,
    network: NETWORKS.POLYGON.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },
  USDT_POLYGON: {
    id: 'usdt-polygon',
    name: 'Tether (Polygon)',
    symbol: 'USDT',
    address: TOKEN_ADDRESSES.POLYGON.USDT,
    decimals: 6,
    blockchain: NETWORKS.POLYGON.blockchain,
    network: NETWORKS.POLYGON.id,
    isNative: false,
    abi: [...ERC20_ABI]
  },
  WMATIC: {
    id: 'wmatic',
    name: 'Wrapped MATIC',
    symbol: 'WMATIC',
    address: TOKEN_ADDRESSES.POLYGON.WMATIC,
    decimals: 18,
    blockchain: NETWORKS.POLYGON.blockchain,
    network: NETWORKS.POLYGON.id,
    isNative: false,
    abi: [...ERC20_ABI]
  }
} as const;

// Helper functions
export const getTokenByAddress = (address: string, network?: string): TokenConfig | undefined => {
  return Object.values(TOKEN_CONFIGS).find(token => 
    token.address === address && (!network || token.network === network)
  );
};

export const getTokenById = (id: string): TokenConfig | undefined => {
  return TOKEN_CONFIGS[id.toUpperCase()];
};

export const getTokensByNetwork = (network: string): TokenConfig[] => {
  return Object.values(TOKEN_CONFIGS).filter(token => token.network === network);
};

export const getNativeTokenByNetwork = (network: string): TokenConfig | undefined => {
  return Object.values(TOKEN_CONFIGS).find(token => 
    token.network === network && token.isNative
  );
};

export const getAllNetworks = () => {
  return Object.values(NETWORKS);
};

export const getNetworkById = (id: string) => {
  return Object.values(NETWORKS).find(network => network.id === id);
};
