import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import {
  coreAccountQueryPlugin,
  coreConsensusQueryPlugin,
  coreTokenQueryPlugin,
  HederaLangchainToolkit,
} from 'hedera-agent-kit';
import { Client, PrivateKey } from '@hashgraph/sdk';
import { createAgentRoutingTool } from './agent-routing-tool';
import { createWalletBalanceTool } from './wallet-balance-tool';
import { createCarbonCreditNegotiationTool } from './carbon-credit-negotiation-tool';
import { createPaymentAgentTool } from './payment-agent-tool';
import { createCommunicationAgentTool } from './communication-agent-tool';
import { createLLM } from './llm';

export interface ChatRequest {
  prompt: string;
}

export interface ChatResponse {
  output: string;
  transactionBytes?: string;
  requiresSigning?: boolean;
  transactionDetails?: {
    type: string;
    amount?: string;
    recipient?: string;
    tokenName?: string;
  };
  error?: string;
}

export const STREAMING_DELAY_MS = 30;

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Cache-Control',
  'Transfer-Encoding': 'chunked',
  'X-Accel-Buffering': 'no',
  'X-Content-Type-Options': 'nosniff',
} as const;

export const FALLBACK_RESPONSE = `I'm a Hedera blockchain assistant with multi-network wallet balance, carbon credit negotiation, payment processing, and multi-agent communication capabilities. I can help you with:

**Core Hedera Operations:**
- Account operations and queries
- Token management (HTS)  
- Balance queries
- Transaction information
- Hedera network concepts

**Multi-Network Wallet Balance:**
- Check balances across Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche, and Hedera
- Portfolio value calculations
- Token holdings analysis
- Network-specific balance breakdowns

**Carbon Credit Negotiation:**
- Find carbon credit projects (Renewable Energy, Reforestation, Energy Efficiency, Carbon Capture, Methane Reduction, Sustainable Agriculture)
- Negotiate deals and pricing
- Project verification and certification details
- Carbon offset potential calculations
- Environmental project investments

**Payment Processing:**
- Process payments for carbon credits and other transactions
- Support multiple payment methods (Bitcoin, Ethereum, Credit Card, Bank Transfer, PayPal)
- Multi-currency transactions (USD, EUR, BTC, ETH, HBAR)
- Secure transaction processing and confirmation
- Payment status tracking and receipts

**Multi-Agent Communication:**
- Coordinate workflows between specialized agents
- Complete carbon credit purchase workflows
- Comprehensive portfolio analysis
- Transaction monitoring and tracking
- Agent health monitoring

Please let me know how I can assist you with Hedera blockchain operations, wallet balance queries, carbon credit negotiations, payment processing, or multi-agent workflows!`;

export const NO_AI_PROVIDER_RESPONSE = `🤖 Hedera AI Chat is ready! 

I'm a helpful Hedera blockchain assistant. I can help you with:
- Account operations and queries
- Token management (HTS)
- Balance queries  
- Transaction information
- Hedera network concepts

Note: To enable AI responses, please set up your AI provider API key in your environment variables. For now, I can provide general information about Hedera blockchain operations.

Would you like me to explain any specific Hedera concepts or operations?`;

export function createHederaClient() {
  return Client.forTestnet().setOperator(
    process.env.HEDERA_ACCOUNT_ID!,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!)
  );
}

export function createHederaToolkit(client: Client) {
  return new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [
        coreAccountQueryPlugin,
        coreTokenQueryPlugin,
        coreConsensusQueryPlugin,
      ],
    },
  });
}

export function createChatPrompt() {
  return ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);
}

export function createAgentExecutor(llm: any, tools: any[]) {
  const prompt = createChatPrompt();
  
  const agent = createToolCallingAgent({
    llm,
    tools,
    prompt,
  });
  
  return new AgentExecutor({
    agent,
    tools,
  });
}

export function setupTools() {
  const client = createHederaClient();
  const toolkit = createHederaToolkit(client);
  const hederaTools = toolkit.getTools();
  const agentRoutingTool = createAgentRoutingTool();
  const walletBalanceTool = createWalletBalanceTool();
  const carbonCreditNegotiationTool = createCarbonCreditNegotiationTool();
  const paymentAgentTool = createPaymentAgentTool();
  const communicationAgentTool = createCommunicationAgentTool();
  
  return {
    client,
    toolkit,
    tools: [...hederaTools, agentRoutingTool, walletBalanceTool, carbonCreditNegotiationTool, paymentAgentTool, communicationAgentTool],
  };
}

export function createSystemPrompt(inputPrompt: string): string {
  return `You are a helpful Hedera blockchain assistant with access to specialized tools. You can help with:

**Core Hedera Operations:**
- Account operations and queries
- Token management (HTS)
- Balance queries  
- Transaction information
- Hedera network concepts

**Multi-Network Wallet Balance:**
- Check balances across multiple blockchain networks (Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche, Hedera)
- Portfolio value calculations
- Token holdings analysis
- Network-specific balance breakdowns

**Carbon Credit Negotiation:**
- Find carbon credit projects (Renewable Energy, Reforestation, Energy Efficiency, Carbon Capture, Methane Reduction, Sustainable Agriculture)
- Negotiate deals and pricing
- Project verification and certification details
- Carbon offset potential calculations
- Environmental project investments

**Payment Processing:**
- Process payments for carbon credits and other transactions
- Support multiple payment methods (Bitcoin, Ethereum, Credit Card, Bank Transfer, PayPal)
- Multi-currency transactions (USD, EUR, BTC, ETH, HBAR)
- Secure transaction processing and confirmation
- Payment status tracking and receipts
- Blockchain transaction monitoring

**Multi-Agent Communication:**
- Coordinate workflows between specialized agents
- Carbon Credit Purchase Workflow (Balance Check → Project Discovery → Payment Processing)
- Portfolio Analysis Workflow (Multi-network balance → Carbon opportunities → Investment recommendations)
- Transaction Monitoring Workflow (Payment tracking → Balance updates → Confirmation notifications)
- Agent Health Monitoring (Status checks across all agent services)

**Available Tools:**
- Hedera blockchain tools for direct Hedera operations
- Wallet balance checker for multi-network balance queries
- Carbon credit negotiation tool for environmental projects
- Payment processor for secure transaction handling
- Agent communication tool for multi-agent workflows
- Agent routing tool for specialized operations

**Instructions:**
- For wallet balance requests, use the wallet_balance_checker tool
- For carbon credit requests, use the carbon_credit_negotiation tool
- For payment processing, use the payment_processor tool
- For complex multi-agent workflows, use the agent_communication tool
- For Hedera-specific operations, use the appropriate Hedera tools
- Always provide clear, formatted responses with relevant details
- Include network information, USD values, project details, and transaction confirmations when available

User question: ${inputPrompt}

Please provide a helpful response about Hedera blockchain operations, multi-network wallet balance queries, carbon credit negotiations, payment processing, or multi-agent workflows.`;
}

export function createFallbackResponse(inputPrompt: string): string {
  return `${FALLBACK_RESPONSE}

Your question: "${inputPrompt}"`;
}
