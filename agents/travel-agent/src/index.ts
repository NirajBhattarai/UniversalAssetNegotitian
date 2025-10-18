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

// Simple store for contexts and negotiations
const contexts: Map<string, Message[]> = new Map();
const activeNegotiations: Map<string, any> = new Map();

/**
 * TravelAgentExecutor implements the travel agent's core logic for booking negotiations
 * with Hedera Agent Kit integration for blockchain operations.
 */
class TravelAgentExecutor implements AgentExecutor {
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
      `[TravelAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
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
          parts: [{ kind: 'text', text: '🌍 Analyzing your travel request and coordinating with Hedera-powered agents...' }],
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

      // Mock negotiation process for testing
      await this.processTravelBookingWithMockData(userText, taskId, contextId, eventBus);

    } catch (error) {
      console.error('[TravelAgentExecutor] Error:', error);
      
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

  private async processTravelBookingWithMockData(
    userText: string,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    // Mock negotiation process (Hedera integration removed for testing)
    const steps = [
      {
        delay: 1000,
        message: "🔍 Searching for available flights with airline agents...",
        data: { step: "flight_search", status: "in_progress" }
      },
      {
        delay: 1500,
        message: "✈️ Found 3 flight options. Negotiating with airline agent using A2A protocol...",
        data: { step: "flight_negotiation", status: "negotiating", options: 3, protocol: "A2A" }
      },
      {
        delay: 2000,
        message: "🏨 Searching for hotels in your destination...",
        data: { step: "hotel_search", status: "in_progress" }
      },
      {
        delay: 1800,
        message: "🛏️ Found 5 hotel options. Negotiating with hotel agent via A2A...",
        data: { step: "hotel_negotiation", status: "negotiating", options: 5, protocol: "A2A" }
      },
      {
        delay: 1200,
        message: "💳 Processing payment with mock settlement...",
        data: { step: "payment_processing", status: "processing", method: "mock_payment" }
      },
      {
        delay: 1000,
        message: "✅ All negotiations completed successfully!",
        data: { step: "completed", status: "success" }
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
          name: `Hedera-Powered Negotiation: ${step.data.step}`,
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

    // Final booking summary with mock data
    const finalBookingData = {
      bookingId: uuidv4(),
      totalCost: 1250.00,
      currency: "USD",
      mockTransaction: {
        network: "Mock Network",
        token: "Mock Token",
        amount: 25000,
        transactionId: uuidv4(),
        status: "confirmed"
      },
      services: {
        flight: {
          airline: "SkyHigh Airlines",
          flightNumber: "SH123",
          price: 450.00,
          status: "confirmed",
          agent: "Flight Agent (A2A)"
        },
        hotel: {
          name: "Grand Plaza Hotel",
          roomType: "Deluxe Suite",
          price: 650.00,
          status: "confirmed",
          agent: "Hotel Agent (A2A)"
        },
        payment: {
          method: "Mock Payment",
          amount: 1250.00,
          status: "settled",
          agent: "Payment Agent (Mock)"
        }
      },
      timestamp: new Date().toISOString()
    };

    // Publish final booking artifact
    const finalArtifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "Complete Travel Booking with Hedera Settlement",
        parts: [
          {
            kind: 'data',
            data: finalBookingData
          }
        ]
      }
    };
    eventBus.publish(finalArtifact);

    // Final success message with mock data
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
            text: `🎉 Travel booking completed successfully!\n\n💰 Total cost: $${finalBookingData.totalCost} USD\n🔗 Mock Transaction: ${finalBookingData.mockTransaction.transactionId}\n🌐 Network: ${finalBookingData.mockTransaction.network}\n\n📋 Booking Summary:\n✈️ Flight: ${finalBookingData.services.flight.airline} ${finalBookingData.services.flight.flightNumber} - $${finalBookingData.services.flight.price}\n🏨 Hotel: ${finalBookingData.services.hotel.name} - $${finalBookingData.services.hotel.price}\n💳 Payment: ${finalBookingData.services.payment.method} - $${finalBookingData.services.payment.amount}\n\nBooking ID: ${finalBookingData.bookingId}\n\n🤖 All negotiations completed using A2A protocol!` 
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
}

// --- Server Setup ---

const travelAgentCard: AgentCard = {
  name: 'Travel Agent',
  description: 'An AI travel agent that negotiates bookings with other agents using A2A protocol and mock payment settlement.',
  url: 'http://localhost:41243/',
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
      id: 'travel_booking',
      name: 'Travel Booking & A2A Negotiation',
      description: 'Books flights, hotels, and other travel services by negotiating with specialized agents using A2A protocol.',
      tags: ['travel', 'booking', 'negotiation', 'payment', 'a2a', 'mock'],
      examples: [
        'Book a trip to Paris for 2 people from March 15-20',
        'Find flights and hotels for a business trip to Tokyo using A2A negotiation',
        'Plan a vacation to Hawaii with hotel and flight packages',
        'Book a last-minute trip to New York'
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
  const agentExecutor: AgentExecutor = new TravelAgentExecutor();

  // 3. Create DefaultRequestHandler
  const requestHandler = new DefaultRequestHandler(
    travelAgentCard,
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
  const PORT = process.env.TRAVEL_AGENT_PORT || 41243;
  expressApp.listen(PORT, () => {
    console.log(`[Travel Agent] Server started on http://localhost:${PORT}`);
    console.log(`[Travel Agent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[Travel Agent] Press Ctrl+C to stop the server');
    console.log('[Travel Agent] Using mock data for testing');
  });
}

main().catch(console.error);
