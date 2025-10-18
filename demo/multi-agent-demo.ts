#!/usr/bin/env tsx

import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mock A2A Client for demonstration
class MockA2AClient {
  private agentId: string;
  private agentName: string;
  private port: number;

  constructor(agentId: string, agentName: string, port: number) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.port = port;
  }

  async sendMessage(message: string, targetAgent: string): Promise<string> {
    console.log(`[${this.agentName}] 📤 Sending message to ${targetAgent}: "${message}"`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Mock responses based on agent type
    const responses = {
      'travel': '🌍 Travel Agent: I\'ll coordinate this request with other agents...',
      'flight': '✈️ Flight Agent: Searching flight databases...',
      'hotel': '🏨 Hotel Agent: Checking hotel availability...',
      'payment': '💳 Payment Agent: Calculating costs and payment options...'
    };
    
    return responses[targetAgent as keyof typeof responses] || '🤖 Agent: Message received and processed.';
  }

  async processRequest(request: string): Promise<void> {
    console.log(`[${this.agentName}] 🔍 Processing request: "${request}"`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    console.log(`[${this.agentName}] ✅ Request processed successfully`);
  }
}

// Multi-Agent Orchestrator
class MultiAgentOrchestrator {
  private agents: Map<string, MockA2AClient> = new Map();
  private contextId: string;

  constructor() {
    this.contextId = uuidv4();
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agents.set('travel', new MockA2AClient('travel', 'Travel Agent', 41243));
    this.agents.set('flight', new MockA2AClient('flight', 'Flight Agent', 41244));
    this.agents.set('hotel', new MockA2AClient('hotel', 'Hotel Agent', 41245));
    this.agents.set('payment', new MockA2AClient('payment', 'Payment Agent', 41246));
    
    console.log('🤖 Multi-Agent System Initialized');
    console.log('📋 Available Agents:');
    this.agents.forEach((agent, id) => {
      console.log(`   • ${agent['agentName']} (${id}) - Port ${agent['port']}`);
    });
    console.log(`🔗 Context ID: ${this.contextId}\n`);
  }

  async demonstrateMultiAgentCommunication(): Promise<void> {
    console.log('🚀 Starting Multi-Agent Communication Demo\n');
    
    // Scenario 1: Travel Booking Request
    await this.simulateTravelBooking();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Scenario 2: Payment Processing
    await this.simulatePaymentProcessing();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Scenario 3: Agent-to-Agent Negotiation
    await this.simulateAgentNegotiation();
  }

  private async simulateTravelBooking(): Promise<void> {
    console.log('📋 SCENARIO 1: Travel Booking Request');
    console.log('─'.repeat(40));
    
    const travelAgent = this.agents.get('travel')!;
    const flightAgent = this.agents.get('flight')!;
    const hotelAgent = this.agents.get('hotel')!;
    const paymentAgent = this.agents.get('payment')!;
    
    // Step 1: User request to Travel Agent
    console.log('\n👤 User Request: "Book a trip to Paris for 2 people"');
    await travelAgent.processRequest('Book a trip to Paris for 2 people');
    
    // Step 2: Travel Agent coordinates with Flight Agent
    console.log('\n🔄 Travel Agent coordinating with Flight Agent...');
    const flightResponse = await travelAgent.sendMessage('Find flights to Paris for 2 people', 'flight');
    console.log(`📨 Response: ${flightResponse}`);
    
    // Step 3: Travel Agent coordinates with Hotel Agent
    console.log('\n🔄 Travel Agent coordinating with Hotel Agent...');
    const hotelResponse = await travelAgent.sendMessage('Find hotels in Paris for 2 people', 'hotel');
    console.log(`📨 Response: ${hotelResponse}`);
    
    // Step 4: Travel Agent coordinates with Payment Agent
    console.log('\n🔄 Travel Agent coordinating with Payment Agent...');
    const paymentResponse = await travelAgent.sendMessage('Calculate total cost for Paris trip', 'payment');
    console.log(`📨 Response: ${paymentResponse}`);
    
    // Step 5: Final coordination
    console.log('\n🤝 Final coordination between all agents...');
    await travelAgent.processRequest('Finalize booking with all agents');
    
    console.log('\n✅ Travel booking completed successfully!');
  }

  private async simulatePaymentProcessing(): Promise<void> {
    console.log('📋 SCENARIO 2: Payment Processing');
    console.log('─'.repeat(40));
    
    const paymentAgent = this.agents.get('payment')!;
    const travelAgent = this.agents.get('travel')!;
    
    // Step 1: Payment request
    console.log('\n👤 User Request: "Process payment of $1250 using HBAR tokens"');
    await paymentAgent.processRequest('Process payment of $1250 using HBAR tokens');
    
    // Step 2: Payment Agent communicates with Travel Agent
    console.log('\n🔄 Payment Agent coordinating with Travel Agent...');
    const travelResponse = await paymentAgent.sendMessage('Confirm booking details for payment', 'travel');
    console.log(`📨 Response: ${travelResponse}`);
    
    // Step 3: Payment processing
    console.log('\n💳 Processing payment...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✅ Payment processed successfully!');
    console.log('🔗 Transaction ID: 0x' + Math.random().toString(16).substr(2, 64));
    console.log('💰 Amount: $1,250 USD');
    console.log('🪙 Token: HBAR');
  }

  private async simulateAgentNegotiation(): Promise<void> {
    console.log('📋 SCENARIO 3: Agent-to-Agent Negotiation');
    console.log('─'.repeat(40));
    
    const flightAgent = this.agents.get('flight')!;
    const hotelAgent = this.agents.get('hotel')!;
    const paymentAgent = this.agents.get('payment')!;
    
    // Step 1: Flight Agent initiates negotiation
    console.log('\n✈️ Flight Agent: "I have a flight offer for $450"');
    await flightAgent.processRequest('Flight offer: $450 for Paris route');
    
    // Step 2: Hotel Agent responds
    console.log('\n🏨 Hotel Agent: "I can offer hotel for $650/night"');
    await hotelAgent.processRequest('Hotel offer: $650/night in Paris');
    
    // Step 3: Payment Agent calculates
    console.log('\n💳 Payment Agent: "Calculating total package cost..."');
    await paymentAgent.processRequest('Calculate package: Flight $450 + Hotel $650×5 nights');
    
    // Step 4: Agents negotiate
    console.log('\n🤝 Agents negotiating package deal...');
    
    const negotiationRounds = [
      { agent: 'Flight Agent', message: 'Can we reduce flight cost to $400?' },
      { agent: 'Hotel Agent', message: 'I can offer $600/night for package deal' },
      { agent: 'Payment Agent', message: 'Total would be $3,400 with discounts' },
      { agent: 'Flight Agent', message: 'Deal accepted! Package price: $3,400' }
    ];
    
    for (const round of negotiationRounds) {
      console.log(`\n${round.agent}: "${round.message}"`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('\n✅ Multi-agent negotiation completed!');
    console.log('📋 Final Package: $3,400 USD');
    console.log('🤝 All agents agreed on the deal');
  }

  async startRealTimeDemo(): Promise<void> {
    console.log('🎬 Starting Real-Time Multi-Agent Demo');
    console.log('Press Ctrl+C to stop\n');
    
    let counter = 0;
    const interval = setInterval(async () => {
      counter++;
      console.log(`\n🔄 Demo Round ${counter}`);
      console.log('─'.repeat(20));
      
      // Random agent communication
      const agentIds = Array.from(this.agents.keys());
      const randomAgent1 = agentIds[Math.floor(Math.random() * agentIds.length)];
      const randomAgent2 = agentIds[Math.floor(Math.random() * agentIds.length)];
      
      if (randomAgent1 !== randomAgent2) {
        const agent1 = this.agents.get(randomAgent1)!;
        const message = `Random message ${counter} from ${agent1['agentName']}`;
        const response = await agent1.sendMessage(message, randomAgent2);
        console.log(`📨 Response: ${response}`);
      }
      
    }, 5000); // Every 5 seconds
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping Multi-Agent Demo...');
      clearInterval(interval);
      console.log('✅ Demo stopped successfully');
      process.exit(0);
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 Multi-Agent Communication Demo');
  console.log('=====================================\n');
  
  const orchestrator = new MultiAgentOrchestrator();
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--realtime') || args.includes('-r')) {
    await orchestrator.startRealTimeDemo();
  } else {
    await orchestrator.demonstrateMultiAgentCommunication();
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n💡 To run real-time demo: npm run demo:multi-agent -- --realtime');
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Run the demo
main().catch(console.error);
