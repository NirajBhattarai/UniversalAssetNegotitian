import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { classifyTransaction } from './transaction-classifier';

/**
 * Custom tool for intelligent agent routing based on user requests
 * This tool analyzes the user's request and routes it to the appropriate specialized agent
 */
export const createAgentRoutingTool = () => {
  return tool(
    async ({ userRequest }: { userRequest: string }): Promise<string> => {
      /**
       * Route user requests to the appropriate specialized agent based on content analysis.
       *
       * This tool analyzes the user's request and determines which agent is best suited
       * to handle the specific type of operation requested.
       *
       * Available agents:
       * - carbon-credit-negotiation: For finding and negotiating carbon credit deals
       * - carbon-credit-payment: For processing payments for carbon credits
       * - wallet-balance: For checking balances across multiple networks
       * - hedera-direct: For direct Hedera blockchain operations
       */

      try {
        // Classify the transaction to understand what the user wants
        const classification = classifyTransaction(userRequest);

        console.log('Agent Routing Classification:', classification);

        // Route based on classification
        if (classification.transactionType !== 'UNKNOWN') {
          // Handle carbon credit operations
          if (classification.a2aAgentId === 'carbon-credit-negotiation') {
            return `🌱 **Carbon Credit Negotiation Request Detected**\n\n**Request:** ${userRequest}\n**Classification:** ${classification.description}\n**Confidence:** ${Math.round(classification.confidence * 100)}%\n\nThis request will be handled by the Carbon Credit Negotiation tool. Please use the carbon_credit_negotiation_tool for finding and negotiating carbon credit projects.`;
          }

          // Handle payment operations
          if (classification.a2aAgentId === 'carbon-credit-payment') {
            return `💳 **Payment Request Detected**\n\n**Request:** ${userRequest}\n**Classification:** ${classification.description}\n**Confidence:** ${Math.round(classification.confidence * 100)}%\n\nThis request will be handled by the Payment Processor tool. Please use the payment_processor tool for processing payments for carbon credits and other transactions.`;
          }

          // Handle wallet balance operations
          if (classification.transactionType === 'WALLET_BALANCE_CHECK') {
            // Extract wallet address from the request
            const walletMatch = userRequest.match(
              /(0x[a-fA-F0-9]{40}|0\.0\.\d+)/
            );
            const walletAddress = walletMatch ? walletMatch[0] : null;

            if (walletAddress) {
              try {
                const response = await fetch(
                  'http://localhost:41252/api/balance',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      walletAddress: walletAddress,
                      network: 'all',
                    }),
                  }
                );

                const data = await response.json();

                if (response.ok) {
                  return `💰 **Multi-Network Wallet Balance Agent Response:**\n\nWallet: ${walletAddress}\nTotal Value: $${data.totalUsdValue.toFixed(2)}\n\nNetworks: ${Object.keys(data.networks).length}\n\nDetailed balance information has been retrieved from multiple networks.`;
                } else {
                  return `⚠️ **Wallet Balance Agent Unavailable**\n\n${data.error || 'Failed to fetch balance. Please try again later.'}`;
                }
              } catch (error) {
                return `⚠️ **Wallet Balance Agent Unavailable**\n\nFailed to connect to wallet balance agent. Please try again later.`;
              }
            }
          }

          // Handle Hedera-specific operations
          if (
            classification.transactionType === 'BALANCE_QUERY' ||
            classification.transactionType === 'ACCOUNT_INFO_QUERY' ||
            classification.transactionType === 'TOKEN_INFO_QUERY'
          ) {
            return `🔗 **Hedera Blockchain Operation Detected**\n\n**Operation:** ${classification.description}\n**Type:** ${classification.transactionType}\n**Confidence:** ${Math.round(classification.confidence * 100)}%\n\nThis appears to be a Hedera blockchain operation. I'll use the Hedera tools to process this request directly.`;
          }

          // Handle transaction operations that require signing
          if (classification.requiresSigning) {
            return `🔐 **Transaction Signing Required**\n\n**Operation:** ${classification.description}\n**Type:** ${classification.transactionType}\n**Confidence:** ${Math.round(classification.confidence * 100)}%\n\nThis operation requires transaction signing via A2A (Account-to-Account) protocol.\n\n**Transaction Details:**\n${
              classification.extractedParams
                ? Object.entries(classification.extractedParams)
                    .map(([key, value]) => `- ${key}: ${value}`)
                    .join('\n')
                : '- Details will be shown during signing'
            }`;
          }
        }

        // Default response for unrecognized requests
        return `🤖 **General Assistant Response**\n\nI've analyzed your request: "${userRequest}"\n\nThis appears to be a general inquiry that doesn't require specialized agent routing. I'll provide assistance using my general knowledge and available Hedera blockchain tools.`;
      } catch (error) {
        console.error('Agent routing error:', error);
        return `❌ **Agent Routing Error**\n\nFailed to route your request to the appropriate agent. Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try rephrasing your request or contact support if the issue persists.`;
      }
    },
    {
      name: 'agent_router',
      description: `Intelligent routing tool that analyzes user requests and routes them to the most appropriate specialized tool.

Available tools:
- Carbon Credit Negotiation Tool: For finding and negotiating carbon credit deals
- Payment Processor Tool: For processing payments for carbon credits  
- Wallet Balance Checker Tool: For checking balances across multiple blockchain networks
- Hedera Blockchain Tools: For direct Hedera blockchain operations
- Agent Communication Tool: For multi-agent workflow coordination

This tool automatically determines which tool is best suited for the user's specific request based on content analysis and transaction classification.`,
      schema: z.object({
        userRequest: z
          .string()
          .describe(
            "The user's request that needs to be analyzed and routed to the appropriate tool"
          ),
      }),
    }
  );
};

/**
 * Create a simplified agent routing tool for basic routing decisions
 */
export const createSimpleAgentRoutingTool = () => {
  return tool(
    async ({ request }: { request: string }): Promise<string> => {
      /**
       * Simple agent routing based on keyword detection
       */

      const lowerRequest = request.toLowerCase();

      // Carbon credit operations
      if (
        lowerRequest.includes('carbon') &&
        (lowerRequest.includes('find') || lowerRequest.includes('search'))
      ) {
        return 'ROUTE_TO_CARBON_CREDIT_NEGOTIATION';
      }

      if (
        lowerRequest.includes('carbon') &&
        (lowerRequest.includes('pay') || lowerRequest.includes('buy'))
      ) {
        return 'ROUTE_TO_CARBON_CREDIT_PAYMENT';
      }

      // Wallet balance operations
      if (
        lowerRequest.includes('balance') ||
        lowerRequest.includes('wallet') ||
        lowerRequest.includes('0x') ||
        lowerRequest.includes('0.0.')
      ) {
        return 'ROUTE_TO_WALLET_BALANCE';
      }

      // Hedera operations
      if (
        lowerRequest.includes('hedera') ||
        lowerRequest.includes('hbar') ||
        lowerRequest.includes('account') ||
        lowerRequest.includes('token')
      ) {
        return 'ROUTE_TO_HEDERA_TOOLS';
      }

      // Default to general assistant
      return 'ROUTE_TO_GENERAL_ASSISTANT';
    },
    {
      name: 'simple_agent_router',
      description: 'Simple keyword-based agent routing tool',
      schema: z.object({
        request: z.string().describe('The user request to analyze for routing'),
      }),
    }
  );
};
