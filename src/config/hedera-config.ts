import { Client, PrivateKey, AccountId } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface HederaConfig {
  accountId: string;
  privateKey: string;
  network: 'testnet' | 'mainnet';
  client: Client;
}

export interface TokenConfig {
  hbar: {
    symbol: 'HBAR';
    decimals: 8;
    tokenId?: string;
  };
  usdc: {
    symbol: 'USDC';
    decimals: 6;
    tokenId: string;
  };
  usdt: {
    symbol: 'USDT';
    decimals: 6;
    tokenId: string;
  };
}

export class HederaConfiguration {
  private static instance: HederaConfiguration;
  private config: HederaConfig;
  private tokenConfig: TokenConfig;

  private constructor() {
    this.config = this.initializeHederaConfig();
    this.tokenConfig = this.initializeTokenConfig();
  }

  public static getInstance(): HederaConfiguration {
    if (!HederaConfiguration.instance) {
      HederaConfiguration.instance = new HederaConfiguration();
    }
    return HederaConfiguration.instance;
  }

  private initializeHederaConfig(): HederaConfig {
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    const network = (process.env.HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet';

    if (!accountId || !privateKey) {
      throw new Error('Hedera credentials not found in environment variables');
    }

    const client = network === 'testnet' 
      ? Client.forTestnet() 
      : Client.forMainnet();

    client.setOperator(AccountId.fromString(accountId), PrivateKey.fromStringECDSA(privateKey));

    return {
      accountId,
      privateKey,
      network,
      client
    };
  }

  private initializeTokenConfig(): TokenConfig {
    return {
      hbar: {
        symbol: 'HBAR',
        decimals: 8
      },
      usdc: {
        symbol: 'USDC',
        decimals: 6,
        tokenId: process.env.HEDERA_USDC_TOKEN_ID || '0.0.123456' // Testnet USDC token ID
      },
      usdt: {
        symbol: 'USDT',
        decimals: 6,
        tokenId: process.env.HEDERA_USDT_TOKEN_ID || '0.0.123457' // Testnet USDT token ID
      }
    };
  }

  public getConfig(): HederaConfig {
    return this.config;
  }

  public getTokenConfig(): TokenConfig {
    return this.tokenConfig;
  }

  public getClient(): Client {
    return this.config.client;
  }

  public getAccountId(): string {
    return this.config.accountId;
  }

  public getPrivateKey(): string {
    return this.config.privateKey;
  }

  public getNetwork(): 'testnet' | 'mainnet' {
    return this.config.network;
  }
}

export const hederaConfig = HederaConfiguration.getInstance();
