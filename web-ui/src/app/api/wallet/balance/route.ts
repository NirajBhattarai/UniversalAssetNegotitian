import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_CONFIGS } from '@/constants/tokens';

export interface BalanceRequest {
  walletAddress?: string;
}

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

class MockWalletBalanceService {
  private mockBalances: Record<string, string> = {
    HBAR: '125050000000', // 1,250.50 HBAR (8 decimals)
    MOCK_USDC: '5000000000', // 5,000 USDC (6 decimals)
    MOCK_USDT: '2500000000', // 2,500 USDT (6 decimals)
  };

  /**
   * Get balances for all supported tokens
   */
  async getBalances(walletAddress?: string): Promise<WalletBalanceResponse> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const balances: TokenBalance[] = [];

      for (const [tokenId, tokenConfig] of Object.entries(TOKEN_CONFIGS)) {
        const rawBalance = this.mockBalances[tokenId] || '0';
        const formattedBalance = this.formatBalance(rawBalance, tokenConfig.decimals);

        balances.push({
          tokenId: tokenConfig.id,
          symbol: tokenConfig.symbol,
          name: tokenConfig.name,
          balance: rawBalance,
          decimals: tokenConfig.decimals,
          address: tokenConfig.address,
          formattedBalance
        });
      }

      return {
        success: true,
        balances,
        walletAddress: walletAddress || '0x1234567890123456789012345678901234567890'
      };
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      return {
        success: false,
        balances: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get balance for a specific token
   */
  async getTokenBalance(tokenId: string, walletAddress?: string): Promise<{ success: boolean; balance?: TokenBalance; error?: string }> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const tokenConfig = Object.values(TOKEN_CONFIGS).find(token => token.id === tokenId);
      if (!tokenConfig) {
        return {
          success: false,
          error: `Token ${tokenId} not found`
        };
      }

      const rawBalance = this.mockBalances[tokenConfig.symbol] || '0';
      const formattedBalance = this.formatBalance(rawBalance, tokenConfig.decimals);

      const balance: TokenBalance = {
        tokenId: tokenConfig.id,
        symbol: tokenConfig.symbol,
        name: tokenConfig.name,
        balance: rawBalance,
        decimals: tokenConfig.decimals,
        address: tokenConfig.address,
        formattedBalance
      };

      return {
        success: true,
        balance
      };
    } catch (error) {
      console.error(`Error fetching ${tokenId} balance:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format balance for display
   */
  private formatBalance(balance: string, decimals: number): string {
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) return '0';
    
    // Convert from smallest unit to main unit
    const formattedBalance = numBalance / Math.pow(10, decimals);
    
    // Format with appropriate decimal places
    if (formattedBalance >= 1000) {
      return formattedBalance.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else if (formattedBalance >= 1) {
      return formattedBalance.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6 
      });
    } else {
      return formattedBalance.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 8 
      });
    }
  }
}

// Global instance
let walletBalanceService: MockWalletBalanceService | null = null;

export async function POST(request: NextRequest) {
  try {
    const body: BalanceRequest = await request.json();

    // Initialize service if not already done
    if (!walletBalanceService) {
      walletBalanceService = new MockWalletBalanceService();
    }

    const response = await walletBalanceService.getBalances(body.walletAddress);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        balances: [], 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Initialize service if not already done
    if (!walletBalanceService) {
      walletBalanceService = new MockWalletBalanceService();
    }

    const response = await walletBalanceService.getBalances();
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        balances: [], 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
