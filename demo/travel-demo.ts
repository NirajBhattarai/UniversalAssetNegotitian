import { A2AClient } from '@a2a-js/sdk/client';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Color utilities for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * MultiAgentOrchestrator coordinates travel booking negotiations between multiple agents
 * using A2A protocol and Hedera blockchain settlement.
 */
class MultiAgentOrchestrator {
  private clients: Map<string, A2AClient> = new Map();
  private contextId: string = uuidv4();

  constructor() {
    // Initialize A2A clients for each agent
    const agentUrls = {
      travel: 'http://localhost:41243',
      hotel: 'http://localhost:41244',
      payment: 'http://localhost:41245',
      flight: 'http://localhost:41246'
    };

    Object.entries(agentUrls).forEach(([name, url]) => {
      this.clients.set(name, new A2AClient(url));
    });
  }

  async startHederaTravelNegotiation(): Promise<void> {
    console.log(colorize('bright', '🤖 Hedera-Powered Multi-Agent Travel Booking Demo'));
    console.log(colorize('cyan', '=' .repeat(70)));
    console.log(colorize('yellow', 'This demo shows agents negotiating travel bookings using:'));
    console.log(colorize('yellow', '• A2A Protocol for agent-to-agent communication'));
    console.log(colorize('yellow', '• Hedera Agent Kit for blockchain operations'));
    console.log(colorize('yellow', '• AP2 (Account-to-Account) payment settlement'));
    console.log(colorize('yellow', '• HBAR, USDC, and USDT token support'));
    console.log(colorize('cyan', '=' .repeat(70)));
    console.log();

    try {
      // Step 1: Travel Agent initiates the booking process
      await this.initiateHederaTravelBooking();
      
      // Step 2: Flight Agent handles flight booking
      await this.handleFlightBooking();
      
      // Step 3: Hotel Agent handles accommodation
      await this.handleHotelBooking();
      
      // Step 4: Payment Agent processes payment with Hedera tokens
      await this.handleHederaPaymentSettlement();
      
      // Step 5: Travel Agent provides final summary
      await this.provideFinalSummary();

    } catch (error) {
      console.error(colorize('red', '❌ Error in Hedera multi-agent negotiation:'), error);
    }
  }

  private async initiateHederaTravelBooking(): Promise<void> {
    console.log(colorize('green', '🌍 Step 1: Travel Agent Initiating Hedera-Powered Booking'));
    console.log(colorize('dim', 'Travel Agent is analyzing request and coordinating with Hedera-enabled agents...'));
    
    const travelClient = this.clients.get('travel')!;
    const message = {
      messageId: uuidv4(),
      kind: "message" as const,
      role: "user" as const,
      parts: [
        {
          kind: "text" as const,
          text: "Book a trip to Paris for 2 people from March 15-20, 2024. Use Hedera tokens for payment settlement via AP2 protocol."
        }
      ],
      contextId: this.contextId,
    };

    const params = { message };
    
    try {
      const stream = travelClient.sendMessageStream(params);
      
      for await (const event of stream) {
        if (event.kind === "status-update") {
          console.log(colorize('green', `  ${event.status.message?.parts[0]?.text || 'Processing...'}`));
        } else if (event.kind === "artifact-update") {
          console.log(colorize('blue', `  📄 Travel Booking: ${event.artifact.name}`));
        }
      }
    } catch (error) {
      console.log(colorize('yellow', `  ⚠️ Travel Agent simulation (not running): ${error}`));
    }
    
    console.log();
  }

  private async handleFlightBooking(): Promise<void> {
    console.log(colorize('blue', '✈️ Step 2: Flight Agent Processing A2A Negotiation'));
    console.log(colorize('dim', 'Flight Agent is searching flights and negotiating via A2A protocol...'));
    
    const flightClient = this.clients.get('flight')!;
    const message = {
      messageId: uuidv4(),
      kind: "message" as const,
      role: "user" as const,
      parts: [
        {
          kind: "text" as const,
          text: "Find flights from New York to Paris for 2 passengers on March 15, 2024. Negotiate best rates using A2A protocol."
        }
      ],
      contextId: this.contextId,
    };

    const params = { message };
    
    try {
      const stream = flightClient.sendMessageStream(params);
      
      for await (const event of stream) {
        if (event.kind === "status-update") {
          console.log(colorize('blue', `  ${event.status.message?.parts[0]?.text || 'Processing...'}`));
        } else if (event.kind === "artifact-update") {
          console.log(colorize('blue', `  📄 Flight Booking: ${event.artifact.name}`));
        }
      }
    } catch (error) {
      console.log(colorize('yellow', `  ⚠️ Flight Agent simulation (not running): ${error}`));
    }
    
    console.log();
  }

  private async handleHotelBooking(): Promise<void> {
    console.log(colorize('magenta', '🏨 Step 3: Hotel Agent Processing A2A Negotiation'));
    console.log(colorize('dim', 'Hotel Agent is searching accommodations and negotiating via A2A protocol...'));
    
    const hotelClient = this.clients.get('hotel')!;
    const message = {
      messageId: uuidv4(),
      kind: "message" as const,
      role: "user" as const,
      parts: [
        {
          kind: "text" as const,
          text: "Find hotels in Paris for 2 guests from March 15-20, 2024. Negotiate best rates using A2A protocol."
        }
      ],
      contextId: this.contextId,
    };

    const params = { message };
    
    try {
      const stream = hotelClient.sendMessageStream(params);
      
      for await (const event of stream) {
        if (event.kind === "status-update") {
          console.log(colorize('magenta', `  ${event.status.message?.parts[0]?.text || 'Processing...'}`));
        } else if (event.kind === "artifact-update") {
          console.log(colorize('blue', `  📄 Hotel Booking: ${event.artifact.name}`));
        }
      }
    } catch (error) {
      console.log(colorize('yellow', `  ⚠️ Hotel Agent simulation (not running): ${error}`));
    }
    
    console.log();
  }

  private async handleHederaPaymentSettlement(): Promise<void> {
    console.log(colorize('cyan', '💳 Step 4: Payment Agent Processing Hedera AP2 Settlement'));
    console.log(colorize('dim', 'Payment Agent is processing payment using Hedera Agent Kit and AP2 protocol...'));
    
    const paymentClient = this.clients.get('payment')!;
    const message = {
      messageId: uuidv4(),
      kind: "message" as const,
      role: "user" as const,
      parts: [
        {
          kind: "text" as const,
          text: "Process payment of $1250 using HBAR tokens via AP2 protocol. Settle on Hedera blockchain using Agent Kit."
        }
      ],
      contextId: this.contextId,
    };

    const params = { message };
    
    try {
      const stream = paymentClient.sendMessageStream(params);
      
      for await (const event of stream) {
        if (event.kind === "status-update") {
          console.log(colorize('cyan', `  ${event.status.message?.parts[0]?.text || 'Processing...'}`));
        } else if (event.kind === "artifact-update") {
          console.log(colorize('blue', `  📄 Hedera Payment Settlement: ${event.artifact.name}`));
        }
      }
    } catch (error) {
      console.log(colorize('yellow', `  ⚠️ Payment Agent simulation (not running): ${error}`));
    }
    
    console.log();
  }

  private async provideFinalSummary(): Promise<void> {
    console.log(colorize('green', '🎉 Step 5: Final Travel Booking Summary'));
    console.log(colorize('dim', 'Travel Agent is aggregating all bookings and providing final summary...'));
    
    const travelClient = this.clients.get('travel')!;
    const message = {
      messageId: uuidv4(),
      kind: "message" as const,
      role: "user" as const,
      parts: [
        {
          kind: "text" as const,
          text: "Provide final summary of the complete travel booking with Hedera settlement details."
        }
      ],
      contextId: this.contextId,
    };

    const params = { message };
    
    try {
      const stream = travelClient.sendMessageStream(params);
      
      for await (const event of stream) {
        if (event.kind === "status-update") {
          console.log(colorize('green', `  ${event.status.message?.parts[0]?.text || 'Processing...'}`));
        } else if (event.kind === "artifact-update") {
          console.log(colorize('blue', `  📄 Final Booking Summary: ${event.artifact.name}`));
        }
      }
    } catch (error) {
      console.log(colorize('yellow', `  ⚠️ Travel Agent simulation (not running): ${error}`));
    }
    
    console.log();
    console.log(colorize('bright', '🎊 Hedera Multi-Agent Travel Booking Demo Completed!'));
    console.log(colorize('cyan', '=' .repeat(70)));
    console.log(colorize('yellow', 'Key Features Demonstrated:'));
    console.log(colorize('yellow', '✅ A2A Protocol for agent-to-agent communication'));
    console.log(colorize('yellow', '✅ Hedera Agent Kit integration'));
    console.log(colorize('yellow', '✅ AP2 (Account-to-Account) payment settlement'));
    console.log(colorize('yellow', '✅ HBAR token transactions on Hedera network'));
    console.log(colorize('yellow', '✅ Multi-agent coordination and negotiation'));
    console.log(colorize('cyan', '=' .repeat(70)));
  }
}

// Demo execution
async function runHederaDemo(): Promise<void> {
  const orchestrator = new MultiAgentOrchestrator();
  await orchestrator.startHederaTravelNegotiation();
}

// Run the demo
runHederaDemo().catch(console.error);
