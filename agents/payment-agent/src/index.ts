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

// Mock data for testing (Hedera integration removed for now)

// Load environment variables
dotenv.config();

// Simple store for contexts and payment methods
const contexts: Map<string, Message[]> = new Map();
const paymentMethods = [
  { id: 'hbar', name: 'Hedera Token (HBAR)', rate: 0.05, minAmount: 10 },
  { id: 'usdc', name: 'USD Coin (USDC)', rate: 1.0, minAmount: 1 },
  { id: 'usdt', name: 'Tether (USDT)', rate: 1.0, minAmount: 1 },
  { id: 'credit', name: 'Credit Card', rate: 1.0, minAmount: 5, fee: 0.03 }
];

/**
 * PaymentAgentExecutor implements the payment agent's core logic for processing payments
 * with real Hedera blockchain integration using Hedera Agent Kit.
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

      // Process payment with mock data
      await this.processMockPayment(userText, taskId, contextId, eventBus);

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

  private async processMockPayment(
    userText: string,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    // Extract amount and payment method from user text
    const amount = this.extractAmount(userText);
    const selectedMethod = this.selectPaymentMethod(userText);

    // Mock payment processing steps
    const steps = [
      {
        delay: 800,
        message: `🔍 Analyzing payment request for $${amount}...`,
        data: { step: "analysis", amount, currency: "USD" }
      },
      {
        delay: 1000,
        message: `💱 Converting to ${selectedMethod.name}...`,
        data: { step: "conversion", method: selectedMethod, convertedAmount: amount / selectedMethod.rate }
      },
      {
        delay: 1200,
        message: "🔐 Validating payment credentials...",
        data: { step: "validation", status: "validating" }
      },
      {
        delay: 1500,
        message: "⛓️ Executing mock transaction...",
        data: { step: "blockchain", network: "Mock", protocol: "Mock", status: "processing" }
      },
      {
        delay: 1000,
        message: "✅ Payment settled successfully!",
        data: { step: "settlement", status: "completed" }
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
          name: `Mock Payment Processing: ${step.data.step}`,
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

    // Generate mock payment confirmation
    const paymentData = {
      transactionId: uuidv4(),
      paymentId: uuidv4(),
      amount: {
        original: amount,
        currency: "USD",
        method: selectedMethod.name,
        convertedAmount: amount / selectedMethod.rate,
        fee: selectedMethod.fee ? amount * selectedMethod.fee : 0
      },
      settlement: {
        network: "Mock Network",
        protocol: "Mock Protocol",
        token: selectedMethod.id,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: Math.floor(Math.random() * 1000) + 500,
        status: "confirmed",
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Publish final payment confirmation
    const finalArtifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "Hedera AP2 Payment Settlement Confirmation",
        parts: [
          {
            kind: 'data',
            data: paymentData
          }
        ]
      }
    };
    eventBus.publish(finalArtifact);

    // Final success message with Hedera details
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
            text: `💳 Payment settled successfully!\n\n📋 Payment Details:\n💰 Amount: $${paymentData.amount.original} USD\n💱 Method: ${paymentData.amount.method}\n🔄 Converted: ${paymentData.amount.convertedAmount.toFixed(2)} ${selectedMethod.id.toUpperCase()}\n💸 Fee: $${paymentData.amount.fee.toFixed(2)}\n\n⛓️ Mock Blockchain Details:\n🌐 Network: ${paymentData.settlement.network}\n🔗 Protocol: ${paymentData.settlement.protocol}\n🔗 Transaction Hash: ${paymentData.settlement.transactionHash}\n⛽ Gas Used: ${paymentData.settlement.gasUsed}\n\n✅ Status: ${paymentData.settlement.status}\nTransaction ID: ${paymentData.transactionId}\n\n🤖 Powered by A2A Protocol!` 
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


  private extractAmount(text: string): number {
    const match = text.match(/\$?(\d+(?:\.\d{2})?)/);
    return match ? parseFloat(match[1]) : 1250.00; // Default amount
  }

  private selectPaymentMethod(text: string): any {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('hbar') || lowerText.includes('hedera')) {
      return paymentMethods[0];
    } else if (lowerText.includes('usdc')) {
      return paymentMethods[1];
    } else if (lowerText.includes('usdt')) {
      return paymentMethods[2];
    } else if (lowerText.includes('credit') || lowerText.includes('card')) {
      return paymentMethods[3];
    }
    
    return paymentMethods[0]; // Default to HBAR
  }
}

// --- Server Setup ---

const paymentAgentCard: AgentCard = {
  name: 'Payment Agent',
  description: 'An AI payment agent that processes payments using mock settlement for testing.',
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
      id: 'payment_processing',
      name: 'Payment Processing & Mock Settlement',
      description: 'Processes payments and settles transactions using mock blockchain for testing.',
      tags: ['payment', 'settlement', 'mock', 'a2a'],
      examples: [
        'Process payment of $1250 using HBAR tokens',
        'Settle transaction with USDC',
        'Pay $500 using credit card',
        'Complete payment of $800 with USDT tokens'
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

  const PORT = process.env.PAYMENT_AGENT_PORT || 41245;
  expressApp.listen(PORT, () => {
    console.log(`[Payment Agent] Server started on http://localhost:${PORT}`);
    console.log(`[Payment Agent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[Payment Agent] Press Ctrl+C to stop the server');
    console.log('[Payment Agent] Using mock data for testing');
  });
}

main().catch(console.error);
