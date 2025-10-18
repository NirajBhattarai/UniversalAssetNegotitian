import { 
  Client, 
  PrivateKey, 
  AccountId, 
  TokenId, 
  TransferTransaction, 
  Hbar, 
  TokenTransfer,
  TransactionResponse,
  AccountBalanceQuery,
  TokenBalance
} from '@hashgraph/sdk';
import { hederaConfig, TokenConfig } from '../config/hedera-config.js';

export interface PaymentRequest {
  amount: number;
  currency: 'USD' | 'HBAR' | 'USDC' | 'USDT';
  recipientAccountId: string;
  memo?: string;
}

export interface PaymentResult {
  transactionId: string;
  transactionHash: string;
  status: 'success' | 'failed';
  amount: number;
  currency: string;
  recipientAccountId: string;
  timestamp: string;
  gasUsed?: number;
  error?: string;
}

export interface AccountBalance {
  accountId: string;
  hbarBalance: number;
  tokenBalances: Array<{
    tokenId: string;
    symbol: string;
    balance: number;
    decimals: number;
  }>;
}

export class HederaService {
  private client: Client;
  private tokenConfig: TokenConfig;

  constructor() {
    const config = hederaConfig.getConfig();
    this.client = config.client;
    this.tokenConfig = hederaConfig.getTokenConfig();
  }

  /**
   * Get account balance including HBAR and token balances
   */
  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    try {
      const query = new AccountBalanceQuery()
        .setAccountId(AccountId.fromString(accountId));
      
      const balance = await query.execute(this.client);
      
      const tokenBalances = balance.tokens?.map((tokenBalance: TokenBalance) => ({
        tokenId: tokenBalance.tokenId?.toString() || '',
        symbol: this.getTokenSymbol(tokenBalance.tokenId?.toString() || ''),
        balance: Number(tokenBalance.balance),
        decimals: this.getTokenDecimals(tokenBalance.tokenId?.toString() || '')
      })) || [];

      return {
        accountId,
        hbarBalance: Number(balance.hbars.toTinybars()) / 100_000_000, // Convert to HBAR
        tokenBalances
      };
    } catch (error) {
      throw new Error(`Failed to get account balance: ${error}`);
    }
  }

  /**
   * Process payment using Hedera tokens
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const recipientId = AccountId.fromString(request.recipientAccountId);
      const senderId = AccountId.fromString(hederaConfig.getAccountId());

      let transaction: TransferTransaction;
      let amount: number;

      switch (request.currency) {
        case 'HBAR':
          amount = request.amount;
          transaction = new TransferTransaction()
            .addHbarTransfer(senderId, Hbar.fromTinybars(-amount * 100_000_000)) // Convert to tinybars
            .addHbarTransfer(recipientId, Hbar.fromTinybars(amount * 100_000_000));
          break;

        case 'USDC':
          amount = request.amount * Math.pow(10, this.tokenConfig.usdc.decimals);
          transaction = new TransferTransaction()
            .addTokenTransfer(
              TokenId.fromString(this.tokenConfig.usdc.tokenId),
              senderId,
              -amount
            )
            .addTokenTransfer(
              TokenId.fromString(this.tokenConfig.usdc.tokenId),
              recipientId,
              amount
            );
          break;

        case 'USDT':
          amount = request.amount * Math.pow(10, this.tokenConfig.usdt.decimals);
          transaction = new TransferTransaction()
            .addTokenTransfer(
              TokenId.fromString(this.tokenConfig.usdt.tokenId),
              senderId,
              -amount
            )
            .addTokenTransfer(
              TokenId.fromString(this.tokenConfig.usdt.tokenId),
              recipientId,
              amount
            );
          break;

        default:
          throw new Error(`Unsupported currency: ${request.currency}`);
      }

      if (request.memo) {
        transaction.setTransactionMemo(request.memo);
      }

      const response: TransactionResponse = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      return {
        transactionId: response.transactionId.toString(),
        transactionHash: receipt.transactionHash?.toString() || '',
        status: 'success',
        amount: request.amount,
        currency: request.currency,
        recipientAccountId: request.recipientAccountId,
        timestamp: new Date().toISOString(),
        gasUsed: receipt.gasUsed || 0
      };

    } catch (error) {
      return {
        transactionId: '',
        transactionHash: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        recipientAccountId: request.recipientAccountId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert USD to Hedera tokens
   */
  async convertUSDToToken(usdAmount: number, targetToken: 'HBAR' | 'USDC' | 'USDT'): Promise<{
    tokenAmount: number;
    exchangeRate: number;
    tokenSymbol: string;
  }> {
    // In a real implementation, you would fetch live exchange rates
    // For demo purposes, using fixed rates
    const exchangeRates = {
      HBAR: 0.05, // $0.05 per HBAR
      USDC: 1.0,  // $1.00 per USDC
      USDT: 1.0   // $1.00 per USDT
    };

    const rate = exchangeRates[targetToken];
    const tokenAmount = usdAmount / rate;

    return {
      tokenAmount,
      exchangeRate: rate,
      tokenSymbol: targetToken
    };
  }

  /**
   * Get token symbol from token ID
   */
  private getTokenSymbol(tokenId: string): string {
    if (tokenId === this.tokenConfig.usdc.tokenId) return 'USDC';
    if (tokenId === this.tokenConfig.usdt.tokenId) return 'USDT';
    return 'UNKNOWN';
  }

  /**
   * Get token decimals from token ID
   */
  private getTokenDecimals(tokenId: string): number {
    if (tokenId === this.tokenConfig.usdc.tokenId) return this.tokenConfig.usdc.decimals;
    if (tokenId === this.tokenConfig.usdt.tokenId) return this.tokenConfig.usdt.decimals;
    return 0;
  }

  /**
   * Validate account ID format
   */
  isValidAccountId(accountId: string): boolean {
    try {
      AccountId.fromString(accountId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo(): { network: string; accountId: string } {
    return {
      network: hederaConfig.getNetwork(),
      accountId: hederaConfig.getAccountId()
    };
  }
}

export const hederaService = new HederaService();
