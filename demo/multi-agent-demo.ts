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
      'carbon-credit-negotiation': '🌱 Carbon Credit Negotiation Agent: Analyzing marketplace offers and finding best deals...',
      'carbon-credit-payment': '💳 Carbon Credit Payment Agent: Processing carbon credit payments with blockchain settlement...',
      'asset-broker': '🤝 Asset Broker Agent: Coordinating carbon credit transactions...'
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
    this.agents.set('carbon-credit-negotiation', new MockA2AClient('carbon-credit-negotiation', 'Carbon Credit Negotiation Agent', 41251));
    this.agents.set('carbon-credit-payment', new MockA2AClient('carbon-credit-payment', 'Carbon Credit Payment Agent', 41245));
    this.agents.set('asset-broker', new MockA2AClient('asset-broker', 'Asset Broker Agent', 41242));
    
    console.log('🤖 Multi-Agent System Initialized');
    console.log('📋 Available Agents:');
    this.agents.forEach((agent, id) => {
      console.log(`   • ${agent['agentName']} (${id}) - Port ${agent['port']}`);
    });
    console.log(`🔗 Context ID: ${this.contextId}\n`);
  }

  async demonstrateMultiAgentCommunication(): Promise<void> {
    console.log('🚀 Starting Multi-Agent Communication Demo\n');
    
    // Scenario 1: Carbon Credit Purchase Request
    await this.simulateCarbonCreditPurchase();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Scenario 2: Carbon Credit Payment Processing
    await this.simulateCarbonCreditPayment();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Scenario 3: Agent-to-Agent Carbon Credit Negotiation
    await this.simulateCarbonCreditNegotiation();
  }

  private async simulateCarbonCreditPurchase(): Promise<void> {
    console.log('📋 SCENARIO 1: Carbon Credit Purchase Request');
    console.log('─'.repeat(40));
    
    const assetBroker = this.agents.get('asset-broker')!;
    const negotiationAgent = this.agents.get('carbon-credit-negotiation')!;
    const paymentAgent = this.agents.get('carbon-credit-payment')!;
    
    // Step 1: User request to Asset Broker
    console.log('\n👤 User Request: "Purchase 10,000 carbon credits for corporate sustainability"');
    await assetBroker.processRequest('Purchase 10,000 carbon credits for corporate sustainability');
    
    // Step 2: Asset Broker coordinates with Carbon Credit Negotiation Agent
    console.log('\n🔄 Asset Broker coordinating with Carbon Credit Negotiation Agent...');
    const negotiationResponse = await assetBroker.sendMessage('Find best carbon credit offers for 10,000 credits', 'carbon-credit-negotiation');
    console.log(`📨 Response: ${negotiationResponse}`);
    
    // Step 3: Asset Broker coordinates with Carbon Credit Payment Agent
    console.log('\n🔄 Asset Broker coordinating with Carbon Credit Payment Agent...');
    const paymentResponse = await assetBroker.sendMessage('Process payment for 10,000 carbon credits using USDC', 'carbon-credit-payment');
    console.log(`📨 Response: ${paymentResponse}`);
    
    // Step 4: Final coordination
    console.log('\n🤝 Final coordination between all agents...');
    await assetBroker.processRequest('Finalize carbon credit purchase with all agents');
    
    console.log('\n✅ Carbon credit purchase completed successfully!');
  }

  private async simulateCarbonCreditPayment(): Promise<void> {
    console.log('📋 SCENARIO 2: Carbon Credit Payment Processing');
    console.log('─'.repeat(40));
    
    const paymentAgent = this.agents.get('carbon-credit-payment')!;
    const negotiationAgent = this.agents.get('carbon-credit-negotiation')!;
    
    // Step 1: Payment request
    console.log('\n👤 User Request: "Process payment for 5,000 carbon credits using HBAR tokens"');
    await paymentAgent.processRequest('Process payment for 5,000 carbon credits using HBAR tokens');
    
    // Step 2: Payment Agent communicates with Negotiation Agent
    console.log('\n🔄 Payment Agent coordinating with Carbon Credit Negotiation Agent...');
    const negotiationResponse = await paymentAgent.sendMessage('Confirm carbon credit details for payment', 'carbon-credit-negotiation');
    console.log(`📨 Response: ${negotiationResponse}`);
    
    // Step 3: Payment processing
    console.log('\n💳 Processing carbon credit payment...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✅ Carbon credit payment processed successfully!');
    console.log('🔗 Transaction ID: 0x' + Math.random().toString(16).substr(2, 64));
    console.log('🌿 Credits: 5,000 carbon credits');
    console.log('💰 Amount: $75,000 USD');
    console.log('🪙 Token: HBAR');
  }

  private async simulateCarbonCreditNegotiation(): Promise<void> {
    console.log('📋 SCENARIO 3: Agent-to-Agent Carbon Credit Negotiation');
    console.log('─'.repeat(40));
    
    const negotiationAgent = this.agents.get('carbon-credit-negotiation')!;
    const paymentAgent = this.agents.get('carbon-credit-payment')!;
    const assetBroker = this.agents.get('asset-broker')!;
    
    // Step 1: Negotiation Agent initiates offer
    console.log('\n🌱 Carbon Credit Negotiation Agent: "I found carbon credits at $15 per credit"');
    await negotiationAgent.processRequest('Carbon credit offer: $15 per credit from Company A');
    
    // Step 2: Payment Agent responds
    console.log('\n💳 Carbon Credit Payment Agent: "I can process payment with USDC or HBAR"');
    await paymentAgent.processRequest('Payment options: USDC or HBAR for carbon credits');
    
    // Step 3: Asset Broker coordinates
    console.log('\n🤝 Asset Broker Agent: "Coordinating best deal for 10,000 credits..."');
    await assetBroker.processRequest('Coordinate: 10,000 credits × $15 = $150,000');
    
    // Step 4: Agents negotiate
    console.log('\n🤝 Agents negotiating carbon credit package deal...');
    
    const negotiationRounds = [
      { agent: 'Carbon Credit Negotiation Agent', message: 'Can we get bulk discount for 10,000 credits?' },
      { agent: 'Carbon Credit Payment Agent', message: 'I can offer 2% discount for USDC payment' },
      { agent: 'Asset Broker Agent', message: 'Total would be $147,000 with payment discount' },
      { agent: 'Carbon Credit Negotiation Agent', message: 'Deal accepted! Package price: $147,000' }
    ];
    
    for (const round of negotiationRounds) {
      console.log(`\n${round.agent}: "${round.message}"`);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('\n✅ Multi-agent carbon credit negotiation completed!');
    console.log('📋 Final Package: 10,000 carbon credits for $147,000 USD');
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
  console.log('🚀 Multi-Agent Carbon Credit Communication Demo');
  console.log('===============================================\n');
  
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
