import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

import {
  AgentCard,
  Task,
  TaskState,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TextPart,
  Message,
  DataPart
} from "@a2a-js/sdk";
import {
  InMemoryTaskStore,
  TaskStore,
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import { multiNetworkBalanceService, WalletBalanceSummary } from './services/BalanceService.js';
import { getAllNetworks, getNetworkById } from './constants/tokens.js';

// Load environment variables
dotenv.config();

// Balance request interface
interface BalanceRequest {
  walletAddress: string;
  network?: string; // Specific network requested
  timestamp?: string; // When the request was made
}

// Simple store for contexts
const contexts: Map<string, Message[]> = new Map();

/**
 * WalletBalanceAgentExecutor implements the wallet balance agent's core logic
 * for fetching balances across multiple networks (Hedera, Ethereum, Polygon).
 */
class WalletBalanceAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
    console.log(`[Wallet Balance Agent] Cancelling task ${taskId}`);
  };

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    const taskId = existingTask?.id || uuidv4();
    const contextId = userMessage.contextId || existingTask?.contextId || uuidv4();

    console.log(
      `[Wallet Balance Agent] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
    );

    // Check if task was cancelled
    if (this.cancelledTasks.has(taskId)) {
      console.log(`[Wallet Balance Agent] Task ${taskId} was cancelled, skipping execution`);
      return;
    }

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: 'task',
        id: taskId,
        contextId: contextId,
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: [],
      };
      eventBus.publish(initialTask);
    }

    // Extract user text from message
    const userText = userMessage.parts
      .filter(part => part.kind === 'text')
      .map(part => (part as TextPart).text)
      .join(' ');

    console.log(`[Wallet Balance Agent] User request: ${userText}`);

    // Store context
    if (!contexts.has(contextId)) {
      contexts.set(contextId, []);
    }
    contexts.get(contextId)!.push(userMessage);

    try {
      // Parse balance request from user text
      const balanceRequest = this.parseBalanceRequest(userText);
      
      if (!balanceRequest) {
        // No wallet address found, ask user to provide one
        const askForAddressUpdate: TaskStatusUpdateEvent = {
          kind: 'status-update',
          taskId,
          contextId,
          status: {
            state: 'completed',
            message: {
              kind: 'message',
              role: 'agent',
              messageId: uuidv4(),
              parts: [{ 
                kind: 'text', 
                text: `❓ **Wallet Address & Network Required**\n\nI need both a wallet address and network to check balances. Please provide:\n\n**For Hedera accounts:**\n- Format: \`0.0.123456\`\n- Example: \`0.0.123456\`\n- Network: Hedera\n\n**For Ethereum addresses:**\n- Format: \`0x...\` (40 characters)\n- Example: \`0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6\`\n- Network: Ethereum\n\n**For Polygon addresses:**\n- Format: \`0x...\` (40 characters)\n- Example: \`0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6\`\n- Network: Polygon\n\n**Supported networks:**\n- 🌐 Hedera Network (HBAR - native token)\n- 🔷 Ethereum Mainnet (ETH - native, USDC/USDT - ERC20)\n- 🔺 Polygon Network (MATIC - native, USDC/USDT - ERC20)\n\n**Example requests:**\n- "Check balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6 on Ethereum"\n- "Show balance for 0.0.123456 on Hedera"\n- "Get balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6 on Polygon"` 
              }],
              taskId: taskId,
              contextId: contextId,
            },
            timestamp: new Date().toISOString(),
          },
          final: true,
        };
        eventBus.publish(askForAddressUpdate);
        return;
      }

      // Handle unsupported networks
      if (balanceRequest.network === 'unsupported') {
        const unsupportedNetworkUpdate: TaskStatusUpdateEvent = {
          kind: 'status-update',
          taskId,
          contextId,
          status: {
            state: 'completed',
            message: {
              kind: 'message',
              role: 'agent',
              messageId: uuidv4(),
              parts: [{ 
                kind: 'text', 
                text: `🚧 **Network Not Yet Supported**\n\nI detected a request for an unsupported network. We're currently working on onboarding more networks!\n\n**Currently Supported:**\n- 🌐 Hedera Network (HBAR - native token)\n- 🔷 Ethereum Mainnet (ETH - native, USDC/USDT - ERC20)\n- 🔺 Polygon Network (MATIC - native, USDC/USDT - ERC20)\n\n**Coming Soon:**\n- Bitcoin (BTC)\n- Solana (SOL)\n- Binance Smart Chain (BSC)\n- Avalanche (AVAX)\n- Cardano (ADA)\n- Polkadot (DOT)\n\nPlease try again with one of the supported networks, or check back later for updates!` 
              }],
              taskId: taskId,
              contextId: contextId,
            },
            timestamp: new Date().toISOString(),
          },
          final: true,
        };
        eventBus.publish(unsupportedNetworkUpdate);
        return;
      }
      
      // Process wallet balance checking
      await this.processWalletBalanceCheck(
        balanceRequest,
        taskId,
        contextId,
        eventBus
      );

    } catch (error) {
      console.error(`[Wallet Balance Agent] Error processing task ${taskId}:`, error);
      
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `Error checking wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
    }
  }

  private parseBalanceRequest(userText: string): BalanceRequest | null {
    const text = userText.toLowerCase();
    
    // Extract wallet address using regex patterns
    const ethAddressPattern = /0x[a-fA-F0-9]{40}/;
    const hederaAccountPattern = /\d+\.\d+\.\d+/;
    
    const ethMatch = text.match(ethAddressPattern);
    const hederaMatch = text.match(hederaAccountPattern);
    
    let walletAddress = '';
    let network = '';
    
    if (ethMatch) {
      walletAddress = ethMatch[0];
      // Check if user specified network
      if (text.includes('polygon') || text.includes('matic')) {
        network = 'polygon';
      } else if (text.includes('ethereum') || text.includes('eth')) {
        network = 'ethereum';
      } else {
        // Default to ethereum for 0x addresses
        network = 'ethereum';
      }
    } else if (hederaMatch) {
      walletAddress = hederaMatch[0];
      network = 'hedera';
    }
    
    // Check for unsupported networks
    const unsupportedNetworks = ['bitcoin', 'btc', 'solana', 'sol', 'binance', 'bsc', 'avalanche', 'avax', 'cardano', 'ada', 'polkadot', 'dot'];
    const hasUnsupportedNetwork = unsupportedNetworks.some(unsupported => text.includes(unsupported));
    
    if (hasUnsupportedNetwork) {
      return { 
        walletAddress: '', 
        network: 'unsupported', 
        timestamp: new Date().toISOString() 
      };
    }
    
    // If no wallet address found, return null to prompt user
    if (!walletAddress) {
      return null;
    }
    
    return {
      walletAddress,
      network,
      timestamp: new Date().toISOString()
    };
  }

  private async processWalletBalanceCheck(
    request: BalanceRequest,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    
    // Validate wallet address format for the specific network
    const isValidForNetwork = multiNetworkBalanceService.isValidWalletAddress(request.walletAddress, request.network || 'ethereum');
    
    if (!isValidForNetwork) {
      const invalidAddressUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ 
              kind: 'text', 
              text: `❌ **Invalid Wallet Address for ${request.network?.toUpperCase() || 'Network'}**\n\nThe address \`${request.walletAddress}\` is not valid for the ${request.network || 'specified'} network.\n\n**Please provide a valid address:**\n\n**For Hedera accounts:**\n- Format: \`0.0.123456\`\n- Example: \`0.0.123456\`\n- Network: Hedera\n\n**For Ethereum/Polygon addresses:**\n- Format: \`0x...\` (40 characters)\n- Example: \`0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6\`\n- Network: Ethereum or Polygon\n\n**Supported networks:**\n- 🌐 Hedera Network (HBAR - native token)\n- 🔷 Ethereum Mainnet (ETH - native, USDC/USDT - ERC20)\n- 🔺 Polygon Network (MATIC - native, USDC/USDT - ERC20)` 
            }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(invalidAddressUpdate);
      return;
    }
    
    // Update status: Starting balance check
    const startUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId,
      contextId,
      status: {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ 
            kind: 'text', 
            text: `🔍 **Checking Wallet Balance**\n\n**Wallet:** \`${request.walletAddress}\`\n**Network:** ${request.network?.toUpperCase() || 'All Supported'}\n\nFetching balance information...` 
          }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(startUpdate);

    try {
      // Get wallet balance for the specific network or all networks
      const balanceResult = await multiNetworkBalanceService.getWalletBalance(
        request.walletAddress,
        request.network ? [request.network] : undefined
      );

      // Format the response with token type information
      let responseText = `💰 **Wallet Balance Report**\n\n**Wallet:** \`${request.walletAddress}\`\n**Network:** ${request.network?.toUpperCase() || 'All Supported'}\n**Total USD Value:** $${(balanceResult.totalUsdValue || 0).toFixed(2)}\n\n`;
      
      // Process each network's results
      Object.entries(balanceResult.networks).forEach(([networkId, networkData]) => {
        const network = getNetworkById(networkId);
        responseText += `\n## 🌐 ${network?.name || networkId}\n`;
        
        // Native token balance
        if (networkData.nativeBalance) {
          const tokenType = networkData.nativeBalance.token.isNative ? 'Native Token' : 'ERC20 Token';
          responseText += `\n**${networkData.nativeBalance.token.name} (${tokenType})**\n`;
          responseText += `- Balance: ${networkData.nativeBalance.balanceFormatted} ${networkData.nativeBalance.token.symbol}\n`;
          responseText += `- USD Value: $${(networkData.nativeBalance.usdValue || 0).toFixed(2)}\n`;
        }
        
        // ERC20 token balances
        if (networkData.tokenBalances && networkData.tokenBalances.length > 0) {
          responseText += `\n**ERC20 Tokens:**\n`;
          networkData.tokenBalances.forEach(tokenBalance => {
            responseText += `- **${tokenBalance.token.name} (${tokenBalance.token.symbol})**\n`;
            responseText += `  - Balance: ${tokenBalance.balanceFormatted} ${tokenBalance.token.symbol}\n`;
            responseText += `  - USD Value: $${(tokenBalance.usdValue || 0).toFixed(2)}\n`;
            responseText += `  - Contract: \`${tokenBalance.token.address}\`\n`;
          });
        }
        
        responseText += `\n**Network Total:** $${(networkData.totalUsdValue || 0).toFixed(2)}\n`;
      });
      
      // Add token type summary
      responseText += `\n---\n**Token Types Detected:**\n`;
      const tokenTypes = new Set<string>();
      Object.values(balanceResult.networks).forEach(networkData => {
        if (networkData.nativeBalance?.token.isNative) {
          tokenTypes.add('Native Tokens');
        }
        if (networkData.tokenBalances && networkData.tokenBalances.length > 0) {
          tokenTypes.add('ERC20 Tokens');
        }
      });
      tokenTypes.forEach(type => responseText += `- ${type}\n`);
      
      const successUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ 
              kind: 'text', 
              text: responseText 
            }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(successUpdate);

    } catch (error) {
      console.error('[Balance Service] Error:', error);
      
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ 
              kind: 'text', 
              text: `❌ **Error Checking Balance**\n\nFailed to fetch balance for \`${request.walletAddress}\` on ${request.network || 'supported networks'}.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support if the issue persists.` 
            }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
    }
  }
}

// --- Server Setup ---

const walletBalanceAgentCard: AgentCard = {
  name: 'Multi-Network Wallet Balance Agent',
  description: 'An AI agent that fetches wallet balances across multiple networks including Hedera, Ethereum, and Polygon. Supports both native currencies and ERC20 tokens.',
  url: 'http://localhost:41252/',
  provider: {
    organization: 'Universal Asset Negotiation',
    url: 'https://github.com/universal-asset-negotiation'
  },
  version: '1.0.0',
  protocolVersion: '0.1.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  securitySchemes: undefined,
  security: undefined,
  defaultInputModes: ['text'],
  defaultOutputModes: ['text', 'data'],
  skills: [
    {
      id: 'wallet_balance_check',
      name: 'Multi-Network Wallet Balance Check',
      description: 'Fetches wallet balances across Hedera, Ethereum, and Polygon networks. Supports native currencies (HBAR, ETH, MATIC) and popular tokens (USDC, USDT).',
      tags: ['wallet', 'balance', 'hedera', 'ethereum', 'polygon', 'multi-chain', 'tokens'],
      examples: [
        'Check balance for wallet 0.0.123456',
        'Get balance for Ethereum address 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        'Show my wallet balance across all networks',
        'Check Hedera balance for account 0.0.456789',
        'Get Polygon wallet balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      ],
      inputModes: ['text'],
      outputModes: ['text', 'data'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

async function main() {
  // 1. Create TaskStore
  const taskStore: TaskStore = new InMemoryTaskStore();

  // 2. Create Agent Executor
  const executor: AgentExecutor = new WalletBalanceAgentExecutor();

  // 3. Create Request Handler
  const requestHandler = new DefaultRequestHandler(
    walletBalanceAgentCard,
    taskStore,
    executor
  );

  // 4. Create Express App
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 5. Setup A2A routes
  const appBuilder = new A2AExpressApp(requestHandler);
  appBuilder.setupRoutes(app, '');

  // 6. Add health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      agent: 'Multi-Network Wallet Balance Agent',
      supportedNetworks: getAllNetworks().map(n => n.name),
      timestamp: new Date().toISOString()
    });
  });

  // 7. Add balance check endpoint for direct API access
  app.post('/api/balance', async (req, res) => {
    try {
      const { walletAddress, network, networks } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      // Support both 'network' (singular) and 'networks' (plural) for backward compatibility
      const requestedNetworks = network ? [network] : networks;
      
      const balanceSummary = await multiNetworkBalanceService.getWalletBalance(
        walletAddress,
        requestedNetworks
      );

      res.json(balanceSummary);
    } catch (error) {
      console.error('Error in balance API:', error);
      res.status(500).json({ error: 'Failed to fetch wallet balance' });
    }
  });

  // 8. Start server
  const port = 41252;
  app.listen(port, () => {
    console.log(`🚀 Multi-Network Wallet Balance Agent running on port ${port}`);
    console.log(`📊 Agent Card available at: http://localhost:${port}/a2a/card`);
    console.log(`🔍 Health check: http://localhost:${port}/health`);
    console.log(`💰 Balance API: http://localhost:${port}/api/balance`);
    console.log(`🌐 Supported Networks: ${getAllNetworks().map(n => n.name).join(', ')}`);
  });
}

// Start the server
main().catch(console.error);
