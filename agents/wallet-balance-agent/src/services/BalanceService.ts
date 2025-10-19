/**
 * Multi-Network Balance Service
 * 
 * This service handles balance fetching across Hedera, Ethereum, and Polygon networks.
 * Supports both native currencies and ERC20 tokens.
 */

import { 
  Client, 
  AccountId, 
  AccountBalanceQuery
} from '@hashgraph/sdk';
import { ethers } from 'ethers';
import axios from 'axios';
import { 
  TOKEN_CONFIGS, 
  NETWORKS, 
  getTokensByNetwork, 
  getNativeTokenByNetwork,
  TokenConfig 
} from '../constants/tokens.js';

export interface BalanceResult {
  token: TokenConfig;
  balance: string;
  balanceFormatted: string;
  usdValue?: number;
  network: string;
  blockchain: string;
}

export interface WalletBalanceSummary {
  walletAddress: string;
  networks: {
    [networkId: string]: {
      networkName: string;
      nativeBalance: BalanceResult;
      tokenBalances: BalanceResult[];
      totalUsdValue?: number;
    };
  };
  totalUsdValue?: number;
  timestamp: string;
}

export class MultiNetworkBalanceService {
  private hederaClient: Client;
  private ethereumProvider: ethers.JsonRpcProvider;
  private polygonProvider: ethers.JsonRpcProvider;

  constructor() {
    // Initialize Hedera client for public queries only (no private key needed)
    this.hederaClient = Client.forTestnet();

    // Initialize Ethereum provider with free public RPC
    this.ethereumProvider = new ethers.JsonRpcProvider(
      'https://ethereum.publicnode.com'
    );

    // Initialize Polygon provider with free public RPC
    this.polygonProvider = new ethers.JsonRpcProvider(
      'https://polygon.publicnode.com'
    );
  }

  /**
   * Get comprehensive balance for a wallet across all supported networks
   */
  async getWalletBalance(walletAddress: string, specificNetworks?: string[]): Promise<WalletBalanceSummary> {
    console.log(`[Balance Service] Fetching balance for wallet: ${walletAddress}`);
    
    // If specific networks are requested, only fetch those
    const networksToCheck = specificNetworks || ['hedera', 'ethereum', 'polygon'];
    console.log(`[Balance Service] Checking networks: ${networksToCheck.join(', ')}`);

    const networkPromises: Promise<NetworkBalanceResult | null>[] = [];
    
    if (networksToCheck.includes('hedera')) {
      networkPromises.push(this.getHederaBalance(walletAddress));
    }
    if (networksToCheck.includes('ethereum')) {
      networkPromises.push(this.getEthereumBalance(walletAddress));
    }
    if (networksToCheck.includes('polygon')) {
      networkPromises.push(this.getPolygonBalance(walletAddress));
    }

    const networks = await Promise.all(networkPromises);

    const summary: WalletBalanceSummary = {
      walletAddress,
      networks: {},
      timestamp: new Date().toISOString()
    };

    // Process each network result
    for (const networkResult of networks) {
      if (networkResult) {
        summary.networks[networkResult.networkId] = networkResult;
      }
    }

    // Calculate total USD value
    summary.totalUsdValue = Object.values(summary.networks)
      .reduce((total, network) => total + (network.totalUsdValue || 0), 0);

    return summary;
  }

  /**
   * Get balance for a specific network
   */
  async getNetworkBalance(walletAddress: string, networkId: string): Promise<{
    networkId: string;
    networkName: string;
    nativeBalance: BalanceResult;
    tokenBalances: BalanceResult[];
    totalUsdValue?: number;
  } | null> {
    switch (networkId) {
      case 'hedera':
        return await this.getHederaBalance(walletAddress);
      case 'ethereum':
        return await this.getEthereumBalance(walletAddress);
      case 'polygon':
        return await this.getPolygonBalance(walletAddress);
      default:
        throw new Error(`Unsupported network: ${networkId}`);
    }
  }

  /**
   * Get Hedera network balance
   */
  private async getHederaBalance(walletAddress: string): Promise<{
    networkId: string;
    networkName: string;
    nativeBalance: BalanceResult;
    tokenBalances: BalanceResult[];
    totalUsdValue?: number;
  } | null> {
    try {
      console.log(`[Balance Service] Fetching Hedera balance for: ${walletAddress}`);

      const accountId = AccountId.fromString(walletAddress);
      const query = new AccountBalanceQuery().setAccountId(accountId);
      
      // Execute query without operator (public query)
      const balance = await query.execute(this.hederaClient);

      const nativeToken = getNativeTokenByNetwork('hedera')!;
      const nativeBalance: BalanceResult = {
        token: nativeToken,
        balance: balance.hbars.toTinybars().toString(),
        balanceFormatted: balance.hbars.toString(),
        usdValue: this.convertHbarToUsd(Number(balance.hbars.toString())),
        network: 'hedera',
        blockchain: 'Hedera'
      };

      const tokenBalances: BalanceResult[] = [];
      let totalUsdValue = nativeBalance.usdValue || 0;

      // Process token balances
      if (balance.tokens) {
        for (const [tokenId, balanceAmount] of balance.tokens) {
          const tokenIdString = tokenId?.toString();
          if (tokenIdString) {
            // Find token config by address (token ID in Hedera)
            const tokenConfig = Object.values(TOKEN_CONFIGS).find(
              token => token.address === tokenIdString && token.network === 'hedera'
            );

            if (tokenConfig) {
              const balanceResult: BalanceResult = {
                token: tokenConfig,
                balance: balanceAmount.toString(),
                balanceFormatted: this.formatTokenBalance(
                  balanceAmount.toString(),
                  tokenConfig.decimals
                ),
                usdValue: this.convertTokenToUsd(tokenConfig.symbol, balanceAmount.toString(), tokenConfig.decimals),
                network: 'hedera',
                blockchain: 'Hedera'
              };
              tokenBalances.push(balanceResult);
              totalUsdValue += balanceResult.usdValue || 0;
            }
          }
        }
      }

      return {
        networkId: 'hedera',
        networkName: 'Hedera Network',
        nativeBalance,
        tokenBalances,
        totalUsdValue
      };

    } catch (error) {
      console.error(`[Balance Service] Error fetching Hedera balance:`, error);
      return null;
    }
  }

  /**
   * Get Ethereum network balance
   */
  private async getEthereumBalance(walletAddress: string): Promise<{
    networkId: string;
    networkName: string;
    nativeBalance: BalanceResult;
    tokenBalances: BalanceResult[];
    totalUsdValue?: number;
  } | null> {
    try {
      console.log(`[Balance Service] Fetching Ethereum balance for: ${walletAddress}`);

      // Normalize the address for proper checksum
      const normalizedAddress = this.normalizeWalletAddress(walletAddress, 'ethereum');
      if (!normalizedAddress) {
        console.error(`[Balance Service] Invalid Ethereum address: ${walletAddress}`);
        return null;
      }

      // Get native ETH balance
      const ethBalance = await this.ethereumProvider.getBalance(normalizedAddress);
      const nativeToken = getNativeTokenByNetwork('ethereum')!;
      
      const nativeBalance: BalanceResult = {
        token: nativeToken,
        balance: ethBalance.toString(),
        balanceFormatted: ethers.formatEther(ethBalance),
        usdValue: this.convertEthToUsd(Number(ethers.formatEther(ethBalance))),
        network: 'ethereum',
        blockchain: 'Ethereum'
      };

      const tokenBalances: BalanceResult[] = [];
      let totalUsdValue = nativeBalance.usdValue || 0;

      // Get ERC20 token balances
      const ethereumTokens = getTokensByNetwork('ethereum').filter(token => !token.isNative);
      
      for (const tokenConfig of ethereumTokens) {
        try {
          const contract = new ethers.Contract(tokenConfig.address, tokenConfig.abi!, this.ethereumProvider);
          const balance = await contract.balanceOf(normalizedAddress);
          
          if (balance > 0) {
            const balanceResult: BalanceResult = {
              token: tokenConfig,
              balance: balance.toString(),
              balanceFormatted: this.formatTokenBalance(balance.toString(), tokenConfig.decimals),
              usdValue: this.convertTokenToUsd(tokenConfig.symbol, balance.toString(), tokenConfig.decimals),
              network: 'ethereum',
              blockchain: 'Ethereum'
            };
            tokenBalances.push(balanceResult);
            totalUsdValue += balanceResult.usdValue || 0;
          }
        } catch (error) {
          console.warn(`[Balance Service] Error fetching ${tokenConfig.symbol} balance:`, error);
        }
      }

      return {
        networkId: 'ethereum',
        networkName: 'Ethereum Mainnet',
        nativeBalance,
        tokenBalances,
        totalUsdValue
      };

    } catch (error) {
      console.error(`[Balance Service] Error fetching Ethereum balance:`, error);
      return null;
    }
  }

  /**
   * Get Polygon network balance
   */
  private async getPolygonBalance(walletAddress: string): Promise<{
    networkId: string;
    networkName: string;
    nativeBalance: BalanceResult;
    tokenBalances: BalanceResult[];
    totalUsdValue?: number;
  } | null> {
    try {
      console.log(`[Balance Service] Fetching Polygon balance for: ${walletAddress}`);

      // Normalize the address for proper checksum
      const normalizedAddress = this.normalizeWalletAddress(walletAddress, 'polygon');
      if (!normalizedAddress) {
        console.error(`[Balance Service] Invalid Polygon address: ${walletAddress}`);
        return null;
      }

      // Get native MATIC balance
      const maticBalance = await this.polygonProvider.getBalance(normalizedAddress);
      const nativeToken = getNativeTokenByNetwork('polygon')!;
      
      const nativeBalance: BalanceResult = {
        token: nativeToken,
        balance: maticBalance.toString(),
        balanceFormatted: ethers.formatEther(maticBalance),
        usdValue: this.convertMaticToUsd(Number(ethers.formatEther(maticBalance))),
        network: 'polygon',
        blockchain: 'Polygon'
      };

      const tokenBalances: BalanceResult[] = [];
      let totalUsdValue = nativeBalance.usdValue || 0;

      // Get ERC20 token balances
      const polygonTokens = getTokensByNetwork('polygon').filter(token => !token.isNative);
      
      for (const tokenConfig of polygonTokens) {
        try {
          const contract = new ethers.Contract(tokenConfig.address, tokenConfig.abi!, this.polygonProvider);
          const balance = await contract.balanceOf(normalizedAddress);
          
          if (balance > 0) {
            const balanceResult: BalanceResult = {
              token: tokenConfig,
              balance: balance.toString(),
              balanceFormatted: this.formatTokenBalance(balance.toString(), tokenConfig.decimals),
              usdValue: this.convertTokenToUsd(tokenConfig.symbol, balance.toString(), tokenConfig.decimals),
              network: 'polygon',
              blockchain: 'Polygon'
            };
            tokenBalances.push(balanceResult);
            totalUsdValue += balanceResult.usdValue || 0;
          }
        } catch (error) {
          console.warn(`[Balance Service] Error fetching ${tokenConfig.symbol} balance:`, error);
        }
      }

      return {
        networkId: 'polygon',
        networkName: 'Polygon Network',
        nativeBalance,
        tokenBalances,
        totalUsdValue
      };

    } catch (error) {
      console.error(`[Balance Service] Error fetching Polygon balance:`, error);
      return null;
    }
  }

  /**
   * Format token balance with proper decimals
   */
  private formatTokenBalance(balance: string, decimals: number): string {
    const divisor = BigInt(10 ** decimals);
    const balanceBigInt = BigInt(balance);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
  }

  /**
   * Convert token amounts to USD (mock implementation)
   * In production, use real price APIs like CoinGecko, CoinMarketCap, etc.
   */
  private convertTokenToUsd(symbol: string, balance: string, decimals: number): number {
    const mockPrices: Record<string, number> = {
      'HBAR': 0.05,
      'ETH': 2000,
      'MATIC': 0.8,
      'USDC': 1.0,
      'USDT': 1.0,
      'WETH': 2000,
      'WMATIC': 0.8,
      'MockUSDC': 1.0,
      'MockUSDT': 1.0
    };

    const price = mockPrices[symbol] || 0;
    const formattedBalance = Number(this.formatTokenBalance(balance, decimals));
    return formattedBalance * price;
  }

  private convertHbarToUsd(hbarAmount: number): number {
    return hbarAmount * 0.05; // Mock price
  }

  private convertEthToUsd(ethAmount: number): number {
    return ethAmount * 2000; // Mock price
  }

  private convertMaticToUsd(maticAmount: number): number {
    return maticAmount * 0.8; // Mock price
  }

  /**
   * Validate wallet address format for different networks
   */
  isValidWalletAddress(address: string, networkId: string): boolean {
    switch (networkId) {
      case 'hedera':
        try {
          AccountId.fromString(address);
          return true;
        } catch {
          return false;
        }
      case 'ethereum':
      case 'polygon':
        try {
          // Use getAddress to validate and normalize the address
          ethers.getAddress(address);
          return true;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Normalize wallet address for different networks
   */
  normalizeWalletAddress(address: string, networkId: string): string | null {
    try {
      switch (networkId) {
        case 'hedera':
          // For Hedera, validate the account ID format
          const accountId = AccountId.fromString(address);
          return accountId.toString();
        case 'ethereum':
        case 'polygon':
          // For Ethereum/Polygon, normalize the address checksum
          return ethers.getAddress(address);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks() {
    return Object.values(NETWORKS);
  }
}

export const multiNetworkBalanceService = new MultiNetworkBalanceService();
