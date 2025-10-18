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

// Load environment variables
dotenv.config();

// Asset types supported by the broker
enum AssetType {
  CARBON_CREDIT = 'carbon_credit',
  NFT = 'nft',
  COMMODITY = 'commodity',
  REAL_ESTATE = 'real_estate',
  RENEWABLE_ENERGY = 'renewable_energy',
  CUSTOM = 'custom'
}

// Payment methods supported
enum PaymentMethod {
  BITCOIN = 'bitcoin',
  ETHEREUM = 'ethereum',
  USDC = 'usdc',
  USDT = 'usdt',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  ESCROW = 'escrow'
}

// Asset negotiation request
interface AssetNegotiationRequest {
  assetType: AssetType;
  quantity: number;
  maxPrice?: number;
  paymentMethod: PaymentMethod;
  requirements: {
    verificationLevel: 'basic' | 'standard' | 'premium';
    complianceChecks: string[];
    settlementMethod: 'immediate' | 'escrow' | 'conditional';
  };
}

// Asset negotiation result
interface AssetNegotiationResult {
  negotiationId: string;
  assetType: AssetType;
  finalPrice: number;
  currency: string;
  paymentMethod: PaymentMethod;
  verificationStatus: 'verified' | 'pending' | 'failed';
  complianceStatus: 'compliant' | 'pending' | 'non_compliant';
  settlementStatus: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
}

/**
 * AssetBrokerExecutor implements the asset broker's core logic for asset negotiations.
 */
class AssetBrokerExecutor implements AgentExecutor {
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
      `[AssetBrokerExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
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
          parts: [{ kind: 'text', text: '🔄 Analyzing your asset negotiation request and coordinating with specialized agents...' }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(workingStatusUpdate);

    try {
      // Extract user request
      const userText = userMessage.parts
        .filter((p): p is TextPart => p.kind === 'text')
        .map(p => p.text)
        .join(' ');

      // Parse negotiation request
      const negotiationRequest = this.parseNegotiationRequest(userText);

      // Simulate negotiation process
      await this.simulateAssetNegotiation(negotiationRequest, taskId, contextId, eventBus);

    } catch (error) {
      console.error('[AssetBrokerExecutor] Error:', error);
      
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
            parts: [{ kind: 'text', text: `❌ Error processing request: ${error}` }],
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

  private parseNegotiationRequest(userText: string): AssetNegotiationRequest {
    // Simple parsing logic - in production, this would be more sophisticated
    const assetType = this.extractAssetType(userText);
    const quantity = this.extractQuantity(userText);
    const paymentMethod = this.extractPaymentMethod(userText);

    return {
      assetType,
      quantity,
      maxPrice: undefined,
      paymentMethod,
      requirements: {
        verificationLevel: 'standard',
        complianceChecks: ['basic_verification', 'ownership_check'],
        settlementMethod: 'immediate'
      }
    };
  }

  private extractAssetType(text: string): AssetType {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('carbon credit') || lowerText.includes('carbon')) return AssetType.CARBON_CREDIT;
    if (lowerText.includes('nft') || lowerText.includes('non-fungible')) return AssetType.NFT;
    if (lowerText.includes('commodity') || lowerText.includes('gold') || lowerText.includes('silver')) return AssetType.COMMODITY;
    if (lowerText.includes('real estate') || lowerText.includes('property')) return AssetType.REAL_ESTATE;
    if (lowerText.includes('renewable energy') || lowerText.includes('rec')) return AssetType.RENEWABLE_ENERGY;
    return AssetType.CUSTOM;
  }

  private extractQuantity(text: string): number {
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  private extractPaymentMethod(text: string): PaymentMethod {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('bitcoin') || lowerText.includes('btc')) return PaymentMethod.BITCOIN;
    if (lowerText.includes('ethereum') || lowerText.includes('eth')) return PaymentMethod.ETHEREUM;
    if (lowerText.includes('usdc')) return PaymentMethod.USDC;
    if (lowerText.includes('usdt')) return PaymentMethod.USDT;
    if (lowerText.includes('bank') || lowerText.includes('transfer')) return PaymentMethod.BANK_TRANSFER;
    if (lowerText.includes('credit card') || lowerText.includes('card')) return PaymentMethod.CREDIT_CARD;
    if (lowerText.includes('escrow')) return PaymentMethod.ESCROW;
    return PaymentMethod.USDC; // Default
  }

  private async simulateAssetNegotiation(
    request: AssetNegotiationRequest,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    // Simulate step-by-step negotiation
    const steps = [
      {
        delay: 1000,
        message: `🔍 Analyzing ${request.assetType} market and searching for available assets...`,
        data: { step: "market_analysis", status: "in_progress", assetType: request.assetType }
      },
      {
        delay: 1500,
        message: `📊 Found ${request.quantity} ${request.assetType} options. Checking verification requirements...`,
        data: { step: "asset_discovery", status: "completed", quantity: request.quantity }
      },
      {
        delay: 2000,
        message: `🔐 Verifying asset authenticity and ownership through specialized verification agent...`,
        data: { step: "verification", status: "in_progress" }
      },
      {
        delay: 1800,
        message: `✅ Asset verification completed. Checking compliance requirements...`,
        data: { step: "verification", status: "completed" }
      },
      {
        delay: 1200,
        message: `⚖️ Compliance check passed. Processing payment with ${request.paymentMethod}...`,
        data: { step: "compliance", status: "completed" }
      },
      {
        delay: 1000,
        message: `💰 Payment processed successfully. Settlement completed!`,
        data: { step: "settlement", status: "completed" }
      }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));

      // Publish status update
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

      // Publish data artifact for negotiation details
      const artifactUpdate: TaskArtifactUpdateEvent = {
        kind: 'artifact-update',
        taskId: taskId,
        contextId: contextId,
        artifact: {
          artifactId: uuidv4(),
          name: `Negotiation Step: ${step.data.step}`,
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

    // Final negotiation result
    const finalResult: AssetNegotiationResult = {
      negotiationId: uuidv4(),
      assetType: request.assetType,
      finalPrice: this.calculatePrice(request.assetType, request.quantity),
      currency: 'USD',
      paymentMethod: request.paymentMethod,
      verificationStatus: 'verified',
      complianceStatus: 'compliant',
      settlementStatus: 'completed',
      timestamp: new Date().toISOString()
    };

    // Publish final negotiation artifact
    const finalArtifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "Asset Negotiation Complete",
        parts: [
          {
            kind: 'data',
            data: finalResult
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
            text: `🎉 Asset negotiation completed successfully!\n\n📋 Negotiation Summary:\n🏷️ Asset Type: ${finalResult.assetType}\n📦 Quantity: ${request.quantity}\n💰 Final Price: $${finalResult.finalPrice} ${finalResult.currency}\n💳 Payment Method: ${finalResult.paymentMethod}\n✅ Verification: ${finalResult.verificationStatus}\n⚖️ Compliance: ${finalResult.complianceStatus}\n💸 Settlement: ${finalResult.settlementStatus}\n\n🆔 Negotiation ID: ${finalResult.negotiationId}` 
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

  private calculatePrice(assetType: AssetType, quantity: number): number {
    const basePrices = {
      [AssetType.CARBON_CREDIT]: 15.50,
      [AssetType.NFT]: 250.00,
      [AssetType.COMMODITY]: 1800.00,
      [AssetType.REAL_ESTATE]: 500000.00,
      [AssetType.RENEWABLE_ENERGY]: 25.75,
      [AssetType.CUSTOM]: 100.00
    };
    
    return basePrices[assetType] * quantity;
  }
}

// --- Server Setup ---

const assetBrokerCard: AgentCard = {
  name: 'Asset Broker Agent',
  description: 'A universal AI agent that negotiates asset purchases across multiple asset types and payment methods.',
  url: 'http://localhost:41250/',
  provider: {
    organization: 'Universal Asset Negotiation',
    url: 'https://example.com/universal-asset-negotiation'
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
      id: 'asset_negotiation',
      name: 'Universal Asset Negotiation',
      description: 'Negotiates purchases of various asset types including carbon credits, NFTs, commodities, and real estate.',
      tags: ['assets', 'negotiation', 'trading', 'verification', 'settlement'],
      examples: [
        'Buy 100 carbon credits using USDC',
        'Purchase 5 NFTs with Ethereum',
        'Acquire 10 ounces of gold using Bitcoin',
        'Buy renewable energy certificates with bank transfer',
        'Negotiate real estate purchase with escrow'
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

  // 2. Create AgentExecutor
  const agentExecutor: AgentExecutor = new AssetBrokerExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    assetBrokerCard,
    taskStore,
    agentExecutor
  );

  // 4. Create Express app with CORS middleware
  const expressApp = express();
  
  // Add CORS middleware for web UI access
  expressApp.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control']
  }));

  // 5. Setup A2A routes
  const appBuilder = new A2AExpressApp(requestHandler);
  appBuilder.setupRoutes(expressApp, '');

  // 6. Start the server
  const PORT = process.env.ASSET_BROKER_PORT || 41250;
  expressApp.listen(PORT, () => {
    console.log(`[AssetBrokerAgent] Server started on http://localhost:${PORT}`);
    console.log(`[AssetBrokerAgent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[AssetBrokerAgent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);
