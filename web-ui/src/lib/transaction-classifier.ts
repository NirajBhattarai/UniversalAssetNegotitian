import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';

/**
 * Input schema for the transaction classifier tool
 */
const TransactionClassifierInputSchema = z.object({
  userPrompt: z
    .string()
    .describe('The user prompt to analyze for transaction classification'),
});

/**
 * Transaction classification schema
 */
const TransactionClassificationSchema = z.object({
  transactionType: z.enum([
    'HBAR_TRANSFER',
    'TOKEN_CREATE',
    'TOKEN_TRANSFER',
    'TOKEN_MINT',
    'TOKEN_BURN',
    'TOKEN_FREEZE',
    'TOKEN_UNFREEZE',
    'TOKEN_GRANT_KYC',
    'TOKEN_REVOKE_KYC',
    'ACCOUNT_CREATE',
    'BALANCE_QUERY',
    'TOKEN_INFO_QUERY',
    'ACCOUNT_INFO_QUERY',
    'CARBON_CREDIT_NEGOTIATION',
    'CARBON_CREDIT_PAYMENT',
    'WALLET_BALANCE_CHECK',
    'UNKNOWN',
  ]),
  requiresSigning: z.boolean(),
  a2aAgentId: z.string().optional(),
  extractedParams: z.record(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  description: z.string(),
});

export type TransactionClassification = z.infer<
  typeof TransactionClassificationSchema
>;

/**
 * A2A Agent mapping for different transaction types
 */
const A2A_AGENT_MAPPING: Record<string, string> = {
  CARBON_CREDIT_NEGOTIATION: 'carbon-credit-negotiation',
  CARBON_CREDIT_PAYMENT: 'carbon-credit-payment',
  WALLET_BALANCE_CHECK: 'wallet-balance',
  HBAR_TRANSFER: 'wallet-balance', // Can use wallet balance agent for transfers
  TOKEN_TRANSFER: 'wallet-balance',
  TOKEN_CREATE: 'wallet-balance',
  TOKEN_MINT: 'wallet-balance',
  TOKEN_BURN: 'wallet-balance',
  TOKEN_FREEZE: 'wallet-balance',
  TOKEN_UNFREEZE: 'wallet-balance',
  TOKEN_GRANT_KYC: 'wallet-balance',
  TOKEN_REVOKE_KYC: 'wallet-balance',
  ACCOUNT_CREATE: 'wallet-balance',
  BALANCE_QUERY: 'wallet-balance',
  TOKEN_INFO_QUERY: 'wallet-balance',
  ACCOUNT_INFO_QUERY: 'wallet-balance',
};

/**
 * Transaction classification function that analyzes user prompts and determines:
 * 1. Transaction type
 * 2. Whether signing is required
 * 3. Which A2A agent to use
 * 4. Extracted parameters
 */
export function classifyTransaction(
  userPrompt: string
): TransactionClassification {
  const prompt = userPrompt.toLowerCase();

  // Carbon credit operations
  if (
    prompt.includes('carbon credit') ||
    prompt.includes('carbon') ||
    prompt.includes('offset')
  ) {
    if (
      prompt.includes('find') ||
      prompt.includes('search') ||
      prompt.includes('offer') ||
      prompt.includes('price')
    ) {
      return {
        transactionType: 'CARBON_CREDIT_NEGOTIATION',
        requiresSigning: false,
        a2aAgentId: 'carbon-credit-negotiation',
        confidence: 0.9,
        description: 'Find carbon credit offers from marketplace',
      };
    }
    if (
      prompt.includes('pay') ||
      prompt.includes('buy') ||
      prompt.includes('purchase') ||
      prompt.includes('process')
    ) {
      return {
        transactionType: 'CARBON_CREDIT_PAYMENT',
        requiresSigning: true,
        a2aAgentId: 'carbon-credit-payment',
        confidence: 0.9,
        description: 'Process carbon credit payment',
      };
    }
  }

  // Wallet balance operations
  if (
    prompt.includes('balance') ||
    prompt.includes('check') ||
    prompt.includes('show')
  ) {
    if (
      prompt.includes('wallet') ||
      prompt.includes('0x') ||
      prompt.includes('0.0.')
    ) {
      return {
        transactionType: 'WALLET_BALANCE_CHECK',
        requiresSigning: false,
        a2aAgentId: 'wallet-balance',
        confidence: 0.95,
        description: 'Check wallet balance across networks',
      };
    }
    return {
      transactionType: 'BALANCE_QUERY',
      requiresSigning: false,
      a2aAgentId: 'wallet-balance',
      confidence: 0.8,
      description: 'Query account balance',
    };
  }

  // HBAR transfer operations
  if (prompt.includes('transfer') || prompt.includes('send')) {
    if (prompt.includes('hbar') || prompt.includes('0.0.')) {
      const amountMatch = prompt.match(/(\d+(?:\.\d+)?)\s*hbar/i);
      const recipientMatch = prompt.match(/0\.0\.\d+/);

      return {
        transactionType: 'HBAR_TRANSFER',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        extractedParams: {
          amount: amountMatch?.[1] || '',
          recipient: recipientMatch?.[0] || '',
        },
        confidence: 0.9,
        description: 'Transfer HBAR between accounts',
      };
    }
  }

  // Token operations
  if (prompt.includes('token')) {
    if (prompt.includes('create') || prompt.includes('new')) {
      return {
        transactionType: 'TOKEN_CREATE',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Create new HTS token',
      };
    }
    if (prompt.includes('mint')) {
      return {
        transactionType: 'TOKEN_MINT',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Mint new token supply',
      };
    }
    if (prompt.includes('burn')) {
      return {
        transactionType: 'TOKEN_BURN',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Burn token supply',
      };
    }
    if (prompt.includes('freeze')) {
      return {
        transactionType: 'TOKEN_FREEZE',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Freeze token account',
      };
    }
    if (prompt.includes('unfreeze')) {
      return {
        transactionType: 'TOKEN_UNFREEZE',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Unfreeze token account',
      };
    }
    if (prompt.includes('kyc') && prompt.includes('grant')) {
      return {
        transactionType: 'TOKEN_GRANT_KYC',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Grant KYC to token account',
      };
    }
    if (prompt.includes('kyc') && prompt.includes('revoke')) {
      return {
        transactionType: 'TOKEN_REVOKE_KYC',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.85,
        description: 'Revoke KYC from token account',
      };
    }
  }

  // Account operations
  if (prompt.includes('account')) {
    if (prompt.includes('create') || prompt.includes('new')) {
      return {
        transactionType: 'ACCOUNT_CREATE',
        requiresSigning: true,
        a2aAgentId: 'wallet-balance',
        confidence: 0.8,
        description: 'Create new Hedera account',
      };
    }
    if (prompt.includes('info') || prompt.includes('details')) {
      return {
        transactionType: 'ACCOUNT_INFO_QUERY',
        requiresSigning: false,
        a2aAgentId: 'wallet-balance',
        confidence: 0.8,
        description: 'Query account information',
      };
    }
  }

  // Query operations
  if (
    prompt.includes('query') ||
    prompt.includes('get') ||
    prompt.includes('show')
  ) {
    if (prompt.includes('token')) {
      return {
        transactionType: 'TOKEN_INFO_QUERY',
        requiresSigning: false,
        a2aAgentId: 'wallet-balance',
        confidence: 0.8,
        description: 'Query token information',
      };
    }
  }

  // Default fallback
  return {
    transactionType: 'UNKNOWN',
    requiresSigning: false,
    confidence: 0.1,
    description: 'Unable to determine transaction type',
  };
}

/**
 * Get the appropriate A2A agent ID for a transaction type
 */
export function getA2AAgentForTransaction(
  transactionType: string
): string | undefined {
  return A2A_AGENT_MAPPING[transactionType];
}

/**
 * Check if a transaction type requires signing
 */
export function requiresSigning(transactionType: string): boolean {
  const signingRequiredTypes = [
    'HBAR_TRANSFER',
    'TOKEN_CREATE',
    'TOKEN_TRANSFER',
    'TOKEN_MINT',
    'TOKEN_BURN',
    'TOKEN_FREEZE',
    'TOKEN_UNFREEZE',
    'TOKEN_GRANT_KYC',
    'TOKEN_REVOKE_KYC',
    'ACCOUNT_CREATE',
    'CARBON_CREDIT_PAYMENT',
  ];

  return signingRequiredTypes.includes(transactionType);
}
