/**
 * Token Configuration Constants for Web UI
 * 
 * This file contains all token-related constants including addresses, ABIs, and network configurations.
 * Organized by network for easy expansion to other networks in the future.
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
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {"name": "_owner", "type": "address"},
      {"name": "_spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_spender", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "_from", "type": "address"},
      {"name": "_to", "type": "address"},
      {"name": "_value", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "owner", "type": "address"},
      {"indexed": true, "name": "spender", "type": "address"},
      {"indexed": false, "name": "value", "type": "uint256"}
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "from", "type": "address"},
      {"indexed": true, "name": "to", "type": "address"},
      {"indexed": false, "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
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
  deploymentTx?: string;
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
  }
} as const;

// Token addresses and configurations organized by network
export const TOKEN_ADDRESSES = {
  HEDERA: {
    HBAR: 'HBAR', // Native Hedera token
    MOCK_USDC: '0xf10061594016f19c1b610f8a461072b177a58aed',
    MOCK_USDT: '0x8be10b721486659a80488755fd709138cb6d7101'
  }
} as const;

// Deployment transaction hashes
export const TOKEN_DEPLOYMENT_TXS = {
  HEDERA: {
    MOCK_USDC: '0x5a2edebf22833e990adf6705591583b00f3d0a35c9765cb1f503d5635553d9d8',
    MOCK_USDT: '0x9b9dfba9d84a407bf15b59ed69a1658cf7382311bda2426f064f0b581f362589'
  }
} as const;

// Complete token configurations
export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  HBAR: {
    id: 'hbar',
    name: 'Hedera Token (HBAR)',
    symbol: 'HBAR',
    address: TOKEN_ADDRESSES.HEDERA.HBAR,
    decimals: 8,
    blockchain: NETWORKS.HEDERA.blockchain,
    network: NETWORKS.HEDERA.id,
    abi: [] // Native token, no ABI needed
  },
  MOCK_USDC: {
    id: 'mock-usdc',
    name: 'Mock USD Coin (MockUSDC)',
    symbol: 'MockUSDC',
    address: TOKEN_ADDRESSES.HEDERA.MOCK_USDC,
    decimals: 6,
    blockchain: NETWORKS.HEDERA.blockchain,
    network: NETWORKS.HEDERA.id,
    deploymentTx: TOKEN_DEPLOYMENT_TXS.HEDERA.MOCK_USDC,
    abi: [...ERC20_ABI]
  },
  MOCK_USDT: {
    id: 'mock-usdt',
    name: 'Mock Tether (MockUSDT)',
    symbol: 'MockUSDT',
    address: TOKEN_ADDRESSES.HEDERA.MOCK_USDT,
    decimals: 6,
    blockchain: NETWORKS.HEDERA.blockchain,
    network: NETWORKS.HEDERA.id,
    deploymentTx: TOKEN_DEPLOYMENT_TXS.HEDERA.MOCK_USDT,
    abi: [...ERC20_ABI]
  }
} as const;

// Helper functions
export const getTokenByAddress = (address: string): TokenConfig | undefined => {
  return Object.values(TOKEN_CONFIGS).find(token => token.address === address);
};

export const getTokenById = (id: string): TokenConfig | undefined => {
  return TOKEN_CONFIGS[id.toUpperCase()];
};

export const getTokensByNetwork = (network: string): TokenConfig[] => {
  return Object.values(TOKEN_CONFIGS).filter(token => token.network === network);
};
