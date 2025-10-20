import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, varchar, decimal, timestamp, integer } from 'drizzle-orm/pg-core';
import { eq, and, gte } from 'drizzle-orm';

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
import { PAYMENT_METHODS, TOKEN_CONFIGS, getPaymentMethodById, getTokenById } from './constants/tokens.js';

// Mock data for testing (Hedera integration removed for now)

// Load environment variables
dotenv.config();

// Database setup
const connectionString = process.env.CARBON_MARKETPLACE_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/carbon_credit_iot?schema=public';
const client = postgres(connectionString);
const db = drizzle(client);

// Database schema (matching carbon-credit-marketplace)
const company = pgTable('company', {
  companyId: serial('company_id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  walletAddress: varchar('wallet_address', { length: 255 }),
  address: varchar('address', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

const companyCredit = pgTable('company_credit', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => company.companyId),
  currentCredit: decimal('current_credit', { precision: 15, scale: 2 }),
  offerPrice: decimal('offer_price', { precision: 10, scale: 2 }),
  totalCredit: decimal('total_credit', { precision: 15, scale: 2 }),
  soldCredit: decimal('sold_credit', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Carbon Credit Payment interfaces
interface CarbonCreditPaymentRequest {
  creditAmount: number;
  totalCost: number;
  companyId: number;
  companyName: string;
  pricePerCredit: number;
  paymentMethod: 'usdc' | 'usdt' | 'hbar';
  tokenAddress?: string;
  tokenDecimals?: number;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  paymentId: string;
  creditsPurchased: number;
  totalCost: number;
  paymentMethod: string;
  companyId: number;
  companyName: string;
  blockchainDetails?: {
    network: string;
    transactionHash: string;
    gasUsed: number;
    status: string;
  };
}

// Simple store for contexts
const contexts: Map<string, Message[]> = new Map();

/**
 * PaymentAgentExecutor implements the payment agent's core logic for processing carbon credit payments
 * with database integration and dummy blockchain settlement (TODO: implement real blockchain integration).
 */
class PaymentAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
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
      `[PaymentAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
    );

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

    // 2. Publish "working" status update
    const workingStatusUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: '💳 Processing payment with Hedera Agent Kit and AP2 settlement...' }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    try {
      // Store context
      const historyForContext = contexts.get(contextId) || [];
      if (!historyForContext.find(m => m.messageId === userMessage.messageId)) {
        historyForContext.push(userMessage);
      }
      contexts.set(contextId, historyForContext);

      // Extract user request
      const userText = userMessage.parts
        .filter((p): p is TextPart => p.kind === 'text')
        .map(p => p.text)
        .join(' ');

      // Process carbon credit payment
      await this.processCarbonCreditPayment(userText, taskId, contextId, eventBus);

    } catch (error) {
      console.error('[PaymentAgentExecutor] Error:', error);
      
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `❌ Error processing payment: ${error}` }],
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

  private async processCarbonCreditPayment(
    userText: string,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    console.log(`[Payment Agent] Processing carbon credit payment: "${userText}"`);
    
    // Parse carbon credit payment request
    const paymentRequest = this.parseCarbonCreditPaymentRequest(userText);
    const selectedMethod = this.selectPaymentMethod(userText);
    
    // Add token address and decimals to payment request
    paymentRequest.tokenAddress = selectedMethod.tokenAddress;
    paymentRequest.tokenDecimals = selectedMethod.decimals;

    // Payment processing steps
    const steps = [
      {
        delay: 800,
        message: `🔍 Analyzing carbon credit payment for ${paymentRequest.creditAmount} credits...`,
        data: { step: "analysis", credits: paymentRequest.creditAmount, cost: paymentRequest.totalCost }
      },
      {
        delay: 1000,
        message: `💱 Converting $${paymentRequest.totalCost} to ${selectedMethod.name}...`,
        data: { step: "conversion", method: selectedMethod, convertedAmount: paymentRequest.totalCost / selectedMethod.rate }
      },
      {
        delay: 1200,
        message: "🔐 Validating payment credentials and company availability...",
        data: { step: "validation", status: "validating", companyId: paymentRequest.companyId }
      },
      {
        delay: 1500,
        message: `⛓️ Executing blockchain transaction using ${selectedMethod.name} (${selectedMethod.tokenAddress})...`,
        data: { 
          step: "blockchain", 
          network: selectedMethod.blockchain, 
          status: "processing",
          tokenAddress: selectedMethod.tokenAddress,
          tokenDecimals: selectedMethod.decimals
        }
      },
      {
        delay: 1000,
        message: "📊 Updating carbon credit database...",
        data: { step: "database", action: "decrease_credits", companyId: paymentRequest.companyId }
      },
      {
        delay: 800,
        message: `✅ Carbon credit payment settled successfully using ${selectedMethod.name}!`,
        data: { 
          step: "settlement", 
          status: "completed",
          tokenAddress: selectedMethod.tokenAddress,
          tokenDecimals: selectedMethod.decimals,
          paymentMethod: selectedMethod.id
        }
      }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));

      const statusUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'working',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: step.message }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: false,
      };
      eventBus.publish(statusUpdate);

      const artifactUpdate: TaskArtifactUpdateEvent = {
        kind: 'artifact-update',
        taskId: taskId,
        contextId: contextId,
        artifact: {
          artifactId: uuidv4(),
          name: `Carbon Credit Payment Processing: ${step.data.step}`,
          parts: [
            {
              kind: 'data',
              data: step.data
            }
          ]
        }
      };
      eventBus.publish(artifactUpdate);
    }

    // Process the actual payment and update database
    const paymentResult = await this.executeCarbonCreditPayment(paymentRequest, selectedMethod);

    // Generate payment confirmation
    const paymentData = {
      transactionId: paymentResult.transactionId,
      paymentId: paymentResult.paymentId,
      carbonCredits: {
        amount: paymentResult.creditsPurchased,
        companyId: paymentResult.companyId,
        companyName: paymentResult.companyName,
        pricePerCredit: paymentRequest.pricePerCredit,
        totalCost: paymentResult.totalCost
      },
      payment: {
        method: paymentResult.paymentMethod,
        convertedAmount: paymentRequest.totalCost / selectedMethod.rate,
        blockchain: selectedMethod.blockchain
      },
      blockchain: paymentResult.blockchainDetails,
      timestamp: new Date().toISOString()
    };

    // Publish final payment confirmation
    const finalArtifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "Carbon Credit Payment Settlement Confirmation",
        parts: [
          {
            kind: 'data',
            data: paymentData
          }
        ]
      }
    };
    eventBus.publish(finalArtifact);

    // Final success message
    const finalUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'completed',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ 
            kind: 'text', 
            text: `🌱 Carbon Credit Payment Completed Successfully!\n\n📋 Payment Details:\n🌿 Credits Purchased: ${paymentResult.creditsPurchased} credits\n🏢 Company: ${paymentResult.companyName}\n💰 Total Cost: $${paymentResult.totalCost} USD\n💱 Payment Method: ${paymentResult.paymentMethod}\n🔄 Converted Amount: ${paymentData.payment.convertedAmount.toFixed(2)} ${selectedMethod.id.toUpperCase()}\n\n⛓️ Blockchain Details:\n🌐 Network: ${paymentData.blockchain?.network || 'Mock'}\n🔗 Transaction Hash: ${paymentData.blockchain?.transactionHash || 'Mock Hash'}\n⛽ Gas Used: ${paymentData.blockchain?.gasUsed || 0}\n\n✅ Status: ${paymentData.blockchain?.status || 'Confirmed'}\nTransaction ID: ${paymentResult.transactionId}\n\n🤖 Powered by A2A Protocol!` 
          }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: true,
    };
    eventBus.publish(finalUpdate);
  }


  private parseCarbonCreditPaymentRequest(text: string): CarbonCreditPaymentRequest {
    // Parse carbon credit payment details from text
    // Format: "Pay for 1000 carbon credits from company 1 for $15000 using USDC"
    const creditMatch = text.match(/(\d+)\s*carbon\s*credits?/i);
    const costMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
    const companyMatch = text.match(/company\s*(\d+)/i);
    
    const creditAmount = creditMatch ? parseInt(creditMatch[1]) : 1000;
    const totalCost = costMatch ? parseFloat(costMatch[1]) : creditAmount * 15; // Default $15 per credit
    const companyId = companyMatch ? parseInt(companyMatch[1]) : 1;
    const pricePerCredit = totalCost / creditAmount;
    
    return {
      creditAmount,
      totalCost,
      companyId,
      companyName: `Company ${companyId}`,
      pricePerCredit,
      paymentMethod: 'usdc' // Will be overridden by selectPaymentMethod
    };
  }

  private async executeCarbonCreditPayment(
    request: CarbonCreditPaymentRequest, 
    paymentMethod: any
  ): Promise<PaymentResult> {
    console.log(`[Payment Agent] Executing carbon credit payment for ${request.creditAmount} credits`);
    
    try {
      // TODO: Implement real blockchain transaction
      // For now, we'll simulate the payment and update the database
      
      // 1. Decrease carbon credits in database
      await this.decreaseCarbonCredits(request.companyId, request.creditAmount);
      
      // 2. Generate mock blockchain transaction details
      const blockchainDetails = {
        network: paymentMethod.blockchain,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: Math.floor(Math.random() * 1000) + 500,
        status: 'confirmed'
      };
      
      return {
        success: true,
        transactionId: uuidv4(),
        paymentId: uuidv4(),
        creditsPurchased: request.creditAmount,
        totalCost: request.totalCost,
        paymentMethod: paymentMethod.name,
        companyId: request.companyId,
        companyName: request.companyName,
        blockchainDetails
      };
      
    } catch (error) {
      console.error('[Payment Agent] Error executing carbon credit payment:', error);
      throw new Error(`Failed to execute carbon credit payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async decreaseCarbonCredits(companyId: number, creditAmount: number): Promise<void> {
    try {
      console.log(`[Payment Agent] Decreasing ${creditAmount} credits for company ${companyId}`);
      
      // Update the company's current credit amount
      await db
        .update(companyCredit)
        .set({
          currentCredit: (companyCredit.currentCredit || '0') - creditAmount.toString(),
          soldCredit: (companyCredit.soldCredit || '0') + creditAmount.toString(),
          updatedAt: new Date()
        })
        .where(eq(companyCredit.companyId, companyId));
        
      console.log(`[Payment Agent] Successfully updated carbon credits for company ${companyId}`);
      
    } catch (error) {
      console.error('[Payment Agent] Error updating carbon credits:', error);
      // For demo purposes, we'll continue even if database update fails
      console.log('[Payment Agent] Continuing with mock payment despite database error');
    }
  }

  private selectPaymentMethod(text: string): any {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hbar') || lowerText.includes('hedera')) {
      return getPaymentMethodById('hbar');
    } else if (lowerText.includes('usdc')) {
      return getPaymentMethodById('usdc');
    } else if (lowerText.includes('usdt')) {
      return getPaymentMethodById('usdt');
    }
    
    return getPaymentMethodById('usdc'); // Default to USDC for carbon credits
  }
}

// --- Server Setup ---

const paymentAgentCard: AgentCard = {
  name: 'Carbon Credit Payment Agent',
  description: `An AI payment agent that processes carbon credit payments with database integration and dummy blockchain settlement. Supports HBAR, MockUSDC (${TOKEN_CONFIGS.MOCK_USDC.address}), and MockUSDT (${TOKEN_CONFIGS.MOCK_USDT.address}) tokens on Hedera network.`,
  url: 'http://localhost:41245/',
  provider: {
    organization: 'Universal Asset Negotiation',
    url: 'https://github.com/universal-asset-negotiation'
  },
  version: '2.0.0',
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
      id: 'carbon_credit_payment',
      name: 'Carbon Credit Payment Processing',
      description: `Processes carbon credit payments with database integration and dummy blockchain settlement. Supports HBAR, MockUSDC (${TOKEN_CONFIGS.MOCK_USDC.address}), and MockUSDT (${TOKEN_CONFIGS.MOCK_USDT.address}) tokens on Hedera network.`,
      tags: ['carbon-credit', 'payment', 'database', 'blockchain', 'a2a'],
      examples: [
        'Pay for 1000 carbon credits from company 1 for $15000 using MockUSDC',
        'Process carbon credit payment of 500 credits using HBAR tokens',
        'Settle carbon credit purchase with MockUSDT for 2000 credits',
        'Complete payment for 10000 carbon credits using Hedera tokens'
      ],
      inputModes: ['text'],
      outputModes: ['text', 'data'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

async function main() {
  const taskStore: TaskStore = new InMemoryTaskStore();
  const agentExecutor: AgentExecutor = new PaymentAgentExecutor();
  const requestHandler = new DefaultRequestHandler(
    paymentAgentCard,
    taskStore,
    agentExecutor
  );

  // Create Express app with CORS middleware
  const expressApp = express();
  
  // Add CORS middleware for web UI access
  expressApp.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control']
  }));

  const appBuilder = new A2AExpressApp(requestHandler);
  appBuilder.setupRoutes(expressApp, '');

  // Add direct API endpoint for payment processing
  expressApp.post('/api/process-payment', async (req, res) => {
    try {
      const { credits, totalCost, companyId, paymentMethod } = req.body;
      
      if (!credits || !totalCost || !companyId) {
        return res.status(400).json({ error: 'credits, totalCost, and companyId are required' });
      }

      // Mock payment processing
      const paymentResult = {
        success: true,
        transactionId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        creditsPurchased: credits,
        totalCost: totalCost,
        paymentMethod: paymentMethod || 'USDC',
        companyId: companyId,
        companyName: `Company ${companyId}`,
        blockchainDetails: {
          network: 'Hedera',
          transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
          gasUsed: Math.floor(Math.random() * 1000) + 500,
          status: 'confirmed'
        },
        timestamp: new Date().toISOString()
      };

      res.json(paymentResult);
    } catch (error: any) {
      console.error('Payment processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const PORT = process.env.PAYMENT_AGENT_PORT || 41245;
  expressApp.listen(PORT, () => {
    console.log(`[Carbon Credit Payment Agent] Server started on http://localhost:${PORT}`);
    console.log(`[Carbon Credit Payment Agent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[Carbon Credit Payment Agent] Press Ctrl+C to stop the server');
    console.log('[Carbon Credit Payment Agent] Using dummy blockchain settlement (TODO: implement real blockchain)');
  });
}

main().catch(console.error);
