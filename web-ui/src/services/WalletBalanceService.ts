import { TOKEN_CONFIGS } from '@/constants/tokens';

export interface TokenBalance {
  tokenId: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  address: string;
  formattedBalance: string;
}

export interface WalletBalanceResponse {
  success: boolean;
  balances: TokenBalance[];
  walletAddress?: string;
  error?: string;
}

export class WalletBalanceService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/wallet';
  }

  /**
   * Get balances for all supported tokens from the connected wallet
   */
  async getBalances(walletAddress?: string): Promise<WalletBalanceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      return {
        success: false,
        balances: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get balance for a specific token
   */
  async getTokenBalance(
    tokenId: string,
    walletAddress?: string
  ): Promise<TokenBalance | null> {
    try {
      const response = await fetch(`${this.baseUrl}/balance/${tokenId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.balance : null;
    } catch (error) {
      console.error(`Error fetching ${tokenId} balance:`, error);
      return null;
    }
  }

  /**
   * Format balance for display
   */
  formatBalance(balance: string, decimals: number): string {
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) return '0';

    // Convert from smallest unit to main unit
    const formattedBalance = numBalance / Math.pow(10, decimals);

    // Format with appropriate decimal places
    if (formattedBalance >= 1000) {
      return formattedBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (formattedBalance >= 1) {
      return formattedBalance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    } else {
      return formattedBalance.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
      });
    }
  }

  /**
   * Get supported tokens list
   */
  getSupportedTokens() {
    return Object.values(TOKEN_CONFIGS);
  }
}
