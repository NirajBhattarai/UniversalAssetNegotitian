/**
 * Orchestrator Agent Service
 * 
 * Main ADK agent using local Llama model for natural language processing
 * and coordination of A2A agents
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentMessage, 
  AgentSession, 
  OrchestrationRequest, 
  WorkflowType 
} from '../types/index.js';
import { AgentRegistry } from './AgentRegistry.js';
import { WorkflowManager } from './WorkflowManager.js';
import { LlamaService } from './LlamaService.js';

export class OrchestratorAgent {
  private llamaService: LlamaService;
  private agentRegistry: AgentRegistry;
  private workflowManager: WorkflowManager;
  private sessions: Map<string, AgentSession> = new Map();

  constructor(agentRegistry: AgentRegistry, workflowManager: WorkflowManager, llamaService: LlamaService) {
    this.agentRegistry = agentRegistry;
    this.workflowManager = workflowManager;
    this.llamaService = llamaService;
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    // Get or create session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        messages: [],
        context: {},
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.sessions.set(sessionId, session);
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });
    session.lastActivity = new Date();

    try {
      // Create system prompt with available tools
      const systemPrompt = this.createSystemPrompt();
      
      // Create conversation history
      const conversationHistory = session.messages.map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const prompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nUser: ${userMessage}\nAgent:`;

      // Generate response using local Llama model
      const response = await this.llamaService.generateText(prompt, {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
      });

      // Add agent response to session
      session.messages.push({
        role: 'agent',
        content: response,
        timestamp: new Date(),
      });

      return response;

    } catch (error: any) {
      console.error('Error processing message:', error);
      return `❌ **Error Processing Request**\n\nI encountered an error while processing your request: ${error.message}\n\nPlease try again or contact support if the issue persists.`;
    }
  }

  /**
   * Create system prompt with available tools and workflows
   */
  private createSystemPrompt(): string {
    const activeAgents = this.agentRegistry.getActiveAgents();
    const agentList = activeAgents.map(agent => 
      `- **${agent.name}** (${agent.id}): ${agent.capabilities.join(', ')}`
    ).join('\n');

    return `You are the Universal Asset Negotiation Orchestrator Agent. Your role is to coordinate specialized agents to handle complex asset negotiation workflows.

AVAILABLE SPECIALIZED AGENTS:

${agentList}

CRITICAL CONSTRAINTS:
- You MUST call agents ONE AT A TIME, never make multiple tool calls simultaneously
- After making a tool call, WAIT for the result before making another tool call
- Do NOT make parallel/concurrent tool calls - this is not supported

RECOMMENDED WORKFLOWS FOR ASSET NEGOTIATION:

1. **Carbon Credit Purchase Workflow**:
   - Step 1: Check wallet balance (wallet-balance-agent)
   - Step 2: Find carbon credit deals (carbon-credit-negotiation-agent)
   - Step 3: Process payment (payment-agent)

2. **Portfolio Analysis Workflow**:
   - Step 1: Get comprehensive balance (wallet-balance-agent)
   - Step 2: Analyze carbon credit opportunities (carbon-credit-negotiation-agent)

3. **Payment Processing Workflow**:
   - Step 1: Verify balance (wallet-balance-agent)
   - Step 2: Process transaction (payment-agent)

4. **Universal Asset Trading Workflow**:
   - Step 1: Check balance (wallet-balance-agent)
   - Step 2: Negotiate asset purchase (asset-broker-agent)
   - Step 3: Process payment (payment-agent)

WORKFLOW EXECUTION RULES:
- Always start by understanding the user's request
- Determine the appropriate workflow based on the request
- Execute steps sequentially, one agent at a time
- Wait for each agent's response before proceeding
- Synthesize results into a comprehensive response

RESPONSE STRATEGY:
- After each agent response, briefly acknowledge what you received
- Build up the solution incrementally as you gather information
- At the end, present a complete, well-organized result
- Don't just list agent responses - synthesize them into a cohesive solution

IMPORTANT: Once you have received a response from an agent, do NOT call that same
agent again for the same information. Use the information you already have.

When you need to call an agent, use the send_message_to_a2a_agent tool with the agent ID and appropriate message.`;
  }

  /**
   * Parse incoming request to determine workflow type
   */
  parseRequest(request: string): OrchestrationRequest {
    const lowerRequest = request.toLowerCase();
    
    return {
      request,
      workflow: this.detectWorkflowType(lowerRequest),
      context: {},
      priority: lowerRequest.includes('urgent') ? 'high' : 'normal',
      timeout: 60000, // 60 seconds default
    };
  }

  /**
   * Detect workflow type from request text
   */
  private detectWorkflowType(request: string): WorkflowType {
    if (request.includes('carbon credit') || request.includes('carbon credit')) {
      return 'carbon_credit_purchase';
    }
    if (request.includes('balance') || request.includes('wallet')) {
      return 'portfolio_analysis';
    }
    if (request.includes('payment') || request.includes('pay')) {
      return 'payment_processing';
    }
    if (request.includes('asset') || request.includes('trade')) {
      return 'universal_asset_trading';
    }
    return 'general_orchestration';
  }

  /**
   * Send message to A2A agent
   */
  async sendMessageToA2AAgent(agentId: string, message: string): Promise<string> {
    try {
      const agent = this.agentRegistry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Use direct API endpoints for each agent type
      let response;
      switch (agentId) {
        case 'wallet-balance-agent':
          // Extract wallet address from message
          const walletMatch = message.match(/0x[a-fA-F0-9]{40}|0\.0\.\d+/);
          const networkMatch = message.match(/(ethereum|polygon|hedera)/i);
          const walletAddress = walletMatch ? walletMatch[0] : '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
          const network = networkMatch ? networkMatch[1].toLowerCase() : 'ethereum';
          
          response = await axios.post(`${agent.url}/api/balance`, {
            walletAddress,
            network
          }, { timeout: 30000 });
          
          return `Wallet Balance Check Complete:\nAddress: ${response.data.walletAddress}\nNetworks: ${JSON.stringify(response.data.networks, null, 2)}\nTotal USD Value: $${response.data.totalUsdValue}\nTimestamp: ${response.data.timestamp}`;

        case 'carbon-credit-negotiation-agent':
          // Extract negotiation parameters from message
          const creditsMatch = message.match(/(\d+)\s*carbon\s*credits?/i);
          const priceMatch = message.match(/\$(\d+(?:\.\d{2})?)/);
          const credits = creditsMatch ? parseInt(creditsMatch[1]) : 1000;
          const maxPrice = priceMatch ? parseFloat(priceMatch[1]) / credits : undefined;
          
          response = await axios.post(`${agent.url}/api/negotiate`, {
            credits,
            maxPrice,
            paymentMethod: 'USDC'
          }, { timeout: 30000 });
          
          return `Carbon Credit Negotiation Complete:\nCredits: ${response.data.credits}\nPrice per Credit: $${response.data.pricePerCredit}\nTotal Cost: $${response.data.totalCost}\nCompany: ${response.data.company.name}\nSavings: $${response.data.savings}\nStatus: ${response.data.status}\nTimestamp: ${response.data.timestamp}`;

        case 'payment-agent':
          // Extract payment parameters from message
          const paymentCreditsMatch = message.match(/(\d+)\s*carbon\s*credits?/i);
          const paymentCostMatch = message.match(/\$(\d+(?:\.\d{2})?)/);
          const paymentCredits = paymentCreditsMatch ? parseInt(paymentCreditsMatch[1]) : 1000;
          const paymentCost = paymentCostMatch ? parseFloat(paymentCostMatch[1]) : paymentCredits * 15;
          
          response = await axios.post(`${agent.url}/api/process-payment`, {
            credits: paymentCredits,
            totalCost: paymentCost,
            companyId: 1,
            paymentMethod: 'USDC'
          }, { timeout: 30000 });
          
          return `Payment Processing Complete:\nTransaction ID: ${response.data.transactionId}\nPayment ID: ${response.data.paymentId}\nCredits Purchased: ${response.data.creditsPurchased}\nTotal Cost: $${response.data.totalCost}\nPayment Method: ${response.data.paymentMethod}\nCompany: ${response.data.companyName}\nBlockchain Network: ${response.data.blockchainDetails.network}\nTransaction Hash: ${response.data.blockchainDetails.transactionHash}\nStatus: ${response.data.blockchainDetails.status}\nTimestamp: ${response.data.timestamp}`;

        default:
          // Default to A2A protocol
          response = await axios.post(`${agent.url}/a2a/messages`, {
            request: message,
            timestamp: new Date().toISOString(),
          }, { timeout: 30000 });
          return response.data.response || response.data;
      }
    } catch (error: any) {
      console.error(`Error calling agent ${agentId}:`, error);
      return `Error calling ${agentId}: ${error.message}`;
    }
  }

  /**
   * Check agent health
   */
  async checkAgentHealth(agentId: string): Promise<string> {
    try {
      const agent = this.agentRegistry.getAgent(agentId);
      if (!agent) {
        return `Agent ${agentId} not found`;
      }

      let response;
      if (agentId === 'payment-agent') {
        // Payment agent uses A2A protocol, check agent card instead
        response = await axios.get(`${agent.url}/.well-known/agent-card.json`, { timeout: 5000 });
        return `Agent ${agentId} is healthy: ${response.data.name} (${response.data.version})`;
      } else {
        // Standard health check for other agents
        response = await axios.get(`${agent.url}/health`, { timeout: 5000 });
        return `Agent ${agentId} is healthy: ${JSON.stringify(response.data)}`;
      }
    } catch (error: any) {
      return `Agent ${agentId} health check failed: ${error.message}`;
    }
  }

  /**
   * Get agent registry information
   */
  async getAgentRegistry(): Promise<string> {
    const agents = this.agentRegistry.getActiveAgents();
    return JSON.stringify(agents, null, 2);
  }

  /**
   * Execute a predefined workflow
   */
  async executeWorkflow(workflowName: WorkflowType, context: any = {}): Promise<string> {
    try {
      const workflow = this.workflowManager.createPredefinedWorkflow(workflowName);
      const result = await this.workflowManager.executeWorkflow(workflow.id, context);
      return this.workflowManager.formatWorkflowResult(result);
    } catch (error: any) {
      return `Workflow execution failed: ${error.message}`;
    }
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): AgentSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(maxAge: number = 3600000): void { // 1 hour default
    const now = new Date();
    for (const [sessionId, session] of this.sessions) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get agent statistics
   */
  getStats(): { sessions: number; agents: any; workflows: any } {
    return {
      sessions: this.sessions.size,
      agents: this.agentRegistry.getStats(),
      workflows: this.workflowManager.getStats(),
    };
  }
}
