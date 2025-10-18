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

// Simple store for contexts and hotel inventory
const contexts: Map<string, Message[]> = new Map();
const hotelInventory = new Map([
  ['paris', [
    { name: 'Grand Plaza Hotel', price: 650, rooms: 5, rating: 4.8, amenities: ['WiFi', 'Pool', 'Spa'] },
    { name: 'Champs Elysees Suites', price: 450, rooms: 3, rating: 4.5, amenities: ['WiFi', 'Gym'] },
    { name: 'Louvre Palace', price: 750, rooms: 2, rating: 4.9, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'] }
  ]],
  ['tokyo', [
    { name: 'Tokyo Grand Hotel', price: 380, rooms: 8, rating: 4.7, amenities: ['WiFi', 'Pool'] },
    { name: 'Shibuya Business Center', price: 320, rooms: 6, rating: 4.4, amenities: ['WiFi', 'Gym', 'Business Center'] },
    { name: 'Imperial Tokyo Resort', price: 520, rooms: 4, rating: 4.8, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'] }
  ]],
  ['hawaii', [
    { name: 'Waikiki Beach Resort', price: 420, rooms: 7, rating: 4.6, amenities: ['WiFi', 'Pool', 'Beach Access'] },
    { name: 'Maui Paradise Hotel', price: 380, rooms: 5, rating: 4.5, amenities: ['WiFi', 'Pool', 'Spa'] },
    { name: 'Big Island Luxury Suites', price: 580, rooms: 3, rating: 4.9, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Beach Access'] }
  ]]
]);

/**
 * HotelAgentExecutor implements the hotel agent's core logic for accommodation negotiations
 * with A2A protocol integration.
 */
class HotelAgentExecutor implements AgentExecutor {
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
      `[HotelAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
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
          parts: [{ kind: 'text', text: '🏨 Searching hotels and negotiating rates via A2A protocol...' }],
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

      // Process hotel booking with A2A negotiation
      await this.processHotelBooking(userText, taskId, contextId, eventBus);

    } catch (error) {
      console.error('[HotelAgentExecutor] Error:', error);
      
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
            parts: [{ kind: 'text', text: `❌ Error processing hotel booking: ${error}` }],
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

  private async processHotelBooking(
    userText: string,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const destination = this.extractDestination(userText);
    const hotels = hotelInventory.get(destination.toLowerCase()) || [];

    // Simulate A2A negotiation process
    const steps = [
      {
        delay: 1000,
        message: `🔍 Searching hotels in ${destination} using A2A protocol...`,
        data: { step: "search", destination, protocol: "A2A" }
      },
      {
        delay: 1200,
        message: `🏨 Found ${hotels.length} hotel options. Negotiating rates via A2A...`,
        data: { step: "negotiation", options: hotels.length, protocol: "A2A" }
      },
      {
        delay: 1500,
        message: "💰 Negotiating competitive rates with hotel partners...",
        data: { step: "rate_negotiation", status: "negotiating" }
      },
      {
        delay: 1000,
        message: "✅ Hotel booking confirmed via A2A protocol!",
        data: { step: "confirmation", status: "confirmed" }
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
          name: `A2A Hotel Negotiation: ${step.data.step}`,
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

    // Select best hotel option
    const selectedHotel = hotels[0] || { name: 'Grand Plaza Hotel', price: 650, rooms: 5, rating: 4.8, amenities: ['WiFi', 'Pool', 'Spa'] };
    
    // Generate hotel booking confirmation
    const hotelBookingData = {
      bookingId: uuidv4(),
      hotel: {
        name: selectedHotel.name,
        destination: destination,
        price: selectedHotel.price,
        rating: selectedHotel.rating,
        amenities: selectedHotel.amenities,
        rooms: selectedHotel.rooms
      },
      negotiation: {
        protocol: "A2A",
        method: "agent-to-agent",
        status: "completed"
      },
      confirmation: {
        status: "confirmed",
        timestamp: new Date().toISOString()
      }
    };

    // Publish final hotel booking artifact
    const finalArtifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "Hotel Booking Confirmation",
        parts: [
          {
            kind: 'data',
            data: hotelBookingData
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
            text: `🏨 Hotel booking completed via A2A protocol!\n\n📋 Hotel Details:\n🏨 Name: ${hotelBookingData.hotel.name}\n📍 Destination: ${hotelBookingData.hotel.destination}\n💰 Price: $${hotelBookingData.hotel.price}/night\n⭐ Rating: ${hotelBookingData.hotel.rating}/5\n🏠 Available Rooms: ${hotelBookingData.hotel.rooms}\n🎯 Amenities: ${hotelBookingData.hotel.amenities.join(', ')}\n\n🤖 Negotiation Details:\n📡 Protocol: ${hotelBookingData.negotiation.protocol}\n✅ Status: ${hotelBookingData.confirmation.status}\n\nBooking ID: ${hotelBookingData.bookingId}` 
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

  private extractDestination(text: string): string {
    const destinations = ['paris', 'tokyo', 'hawaii', 'new york', 'london'];
    const lowerText = text.toLowerCase();
    
    for (const dest of destinations) {
      if (lowerText.includes(dest)) {
        return dest.charAt(0).toUpperCase() + dest.slice(1);
      }
    }
    
    return 'Paris'; // Default destination
  }
}

// --- Server Setup ---

const hotelAgentCard: AgentCard = {
  name: 'Hotel Agent',
  description: 'An AI hotel agent that negotiates accommodation bookings using A2A protocol.',
  url: 'http://localhost:41244/',
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
      id: 'hotel_booking',
      name: 'Hotel Booking & A2A Negotiation',
      description: 'Finds and books hotels with negotiated rates using A2A protocol.',
      tags: ['hotel', 'accommodation', 'booking', 'negotiation', 'a2a'],
      examples: [
        'Find hotels in Paris for March 15-20',
        'Book accommodation in Tokyo for business trip',
        'Reserve hotel rooms in Hawaii for vacation',
        'Get best rates for hotels in New York'
      ],
      inputModes: ['text'],
      outputModes: ['text', 'data'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

async function main() {
  const taskStore: TaskStore = new InMemoryTaskStore();
  const agentExecutor: AgentExecutor = new HotelAgentExecutor();
  const requestHandler = new DefaultRequestHandler(
    hotelAgentCard,
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

  const PORT = process.env.HOTEL_AGENT_PORT || 41244;
  expressApp.listen(PORT, () => {
    console.log(`[Hotel Agent] Server started on http://localhost:${PORT}`);
    console.log(`[Hotel Agent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[Hotel Agent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);
