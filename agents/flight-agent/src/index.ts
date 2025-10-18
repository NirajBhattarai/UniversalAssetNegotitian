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

// Simple store for contexts and flight inventory
const contexts: Map<string, Message[]> = new Map();
const flightInventory = new Map([
  ['paris', [
    { airline: 'SkyHigh Airlines', flightNumber: 'SH123', price: 450, departure: '08:00', arrival: '14:30', duration: '6h 30m' },
    { airline: 'Global Wings', flightNumber: 'GW456', price: 520, departure: '14:00', arrival: '20:30', duration: '6h 30m' },
    { airline: 'EuroFly', flightNumber: 'EF789', price: 380, departure: '20:00', arrival: '02:30+1', duration: '6h 30m' }
  ]],
  ['tokyo', [
    { airline: 'Pacific Airways', flightNumber: 'PA101', price: 680, departure: '10:00', arrival: '15:00+1', duration: '13h 00m' },
    { airline: 'Asia Connect', flightNumber: 'AC202', price: 750, departure: '16:00', arrival: '21:00+1', duration: '13h 00m' },
    { airline: 'Tokyo Express', flightNumber: 'TE303', price: 620, departure: '22:00', arrival: '03:00+2', duration: '13h 00m' }
  ]],
  ['hawaii', [
    { airline: 'Island Hopper', flightNumber: 'IH404', price: 420, departure: '09:00', arrival: '14:00', duration: '5h 00m' },
    { airline: 'Pacific Breeze', flightNumber: 'PB505', price: 480, departure: '15:00', arrival: '20:00', duration: '5h 00m' },
    { airline: 'Aloha Air', flightNumber: 'AA606', price: 390, departure: '21:00', arrival: '02:00+1', duration: '5h 00m' }
  ]]
]);

/**
 * FlightAgentExecutor implements the flight agent's core logic for flight booking negotiations
 * with A2A protocol integration.
 */
class FlightAgentExecutor implements AgentExecutor {
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
      `[FlightAgentExecutor] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`
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
          parts: [{ kind: 'text', text: '✈️ Searching flights and negotiating rates via A2A protocol...' }],
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

      // Process flight booking with A2A negotiation
      await this.processFlightBooking(userText, taskId, contextId, eventBus);

    } catch (error) {
      console.error('[FlightAgentExecutor] Error:', error);
      
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
            parts: [{ kind: 'text', text: `❌ Error processing flight booking: ${error}` }],
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

  private async processFlightBooking(
    userText: string,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    const destination = this.extractDestination(userText);
    const flights = flightInventory.get(destination.toLowerCase()) || [];

    // Simulate A2A negotiation process
    const steps = [
      {
        delay: 1000,
        message: `🔍 Searching flights to ${destination} using A2A protocol...`,
        data: { step: "search", destination, protocol: "A2A" }
      },
      {
        delay: 1200,
        message: `✈️ Found ${flights.length} flight options. Negotiating rates via A2A...`,
        data: { step: "negotiation", options: flights.length, protocol: "A2A" }
      },
      {
        delay: 1500,
        message: "💰 Negotiating competitive rates with airline partners...",
        data: { step: "rate_negotiation", status: "negotiating" }
      },
      {
        delay: 1000,
        message: "✅ Flight booking confirmed via A2A protocol!",
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
          name: `A2A Flight Negotiation: ${step.data.step}`,
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

    // Select best flight option
    const selectedFlight = flights[0] || { 
      airline: 'SkyHigh Airlines', 
      flightNumber: 'SH123', 
      price: 450, 
      departure: '08:00', 
      arrival: '14:30', 
      duration: '6h 30m' 
    };
    
    // Generate flight booking confirmation
    const flightBookingData = {
      bookingId: uuidv4(),
      flight: {
        airline: selectedFlight.airline,
        flightNumber: selectedFlight.flightNumber,
        destination: destination,
        price: selectedFlight.price,
        departure: selectedFlight.departure,
        arrival: selectedFlight.arrival,
        duration: selectedFlight.duration
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

    // Publish final flight booking artifact
    const finalArtifact: TaskArtifactUpdateEvent = {
      kind: 'artifact-update',
      taskId: taskId,
      contextId: contextId,
      artifact: {
        artifactId: uuidv4(),
        name: "Flight Booking Confirmation",
        parts: [
          {
            kind: 'data',
            data: flightBookingData
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
            text: `✈️ Flight booking completed via A2A protocol!\n\n📋 Flight Details:\n✈️ Airline: ${flightBookingData.flight.airline}\n🔢 Flight: ${flightBookingData.flight.flightNumber}\n📍 Destination: ${flightBookingData.flight.destination}\n💰 Price: $${flightBookingData.flight.price}\n🕐 Departure: ${flightBookingData.flight.departure}\n🕐 Arrival: ${flightBookingData.flight.arrival}\n⏱️ Duration: ${flightBookingData.flight.duration}\n\n🤖 Negotiation Details:\n📡 Protocol: ${flightBookingData.negotiation.protocol}\n✅ Status: ${flightBookingData.confirmation.status}\n\nBooking ID: ${flightBookingData.bookingId}` 
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

const flightAgentCard: AgentCard = {
  name: 'Flight Agent',
  description: 'An AI flight agent that negotiates flight bookings using A2A protocol.',
  url: 'http://localhost:41246/',
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
      id: 'flight_booking',
      name: 'Flight Booking & A2A Negotiation',
      description: 'Finds and books flights with negotiated rates using A2A protocol.',
      tags: ['flight', 'airline', 'booking', 'negotiation', 'a2a'],
      examples: [
        'Find flights to Paris for March 15',
        'Book flights to Tokyo for business trip',
        'Reserve flights to Hawaii for vacation',
        'Get best rates for flights to New York'
      ],
      inputModes: ['text'],
      outputModes: ['text', 'data'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

async function main() {
  const taskStore: TaskStore = new InMemoryTaskStore();
  const agentExecutor: AgentExecutor = new FlightAgentExecutor();
  const requestHandler = new DefaultRequestHandler(
    flightAgentCard,
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

  const PORT = process.env.FLIGHT_AGENT_PORT || 41246;
  expressApp.listen(PORT, () => {
    console.log(`[Flight Agent] Server started on http://localhost:${PORT}`);
    console.log(`[Flight Agent] Agent Card: http://localhost:${PORT}/.well-known/agent-card.json`);
    console.log('[Flight Agent] Press Ctrl+C to stop the server');
  });
}

main().catch(console.error);
