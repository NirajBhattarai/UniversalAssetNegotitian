/**
 * Agent Registry Service
 * 
 * Manages A2A agent discovery, registration, and health monitoring
 */

import axios from 'axios';
import { A2AAgent } from '../types/index.js';

export class AgentRegistry {
  private agents: Map<string, A2AAgent> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.registerDefaultAgents();
    this.startHealthChecks();
  }

  /**
   * Register default A2A agents
   */
  private registerDefaultAgents(): void {
    // Register known A2A agents
    this.registerAgent({
      id: 'wallet-balance-agent',
      name: 'Wallet Balance Agent',
      url: 'http://localhost:41252',
      capabilities: ['balance_check', 'multi_network_balance'],
      status: 'active'
    });

    this.registerAgent({
      id: 'carbon-credit-negotiation-agent',
      name: 'Carbon Credit Negotiation Agent',
      url: 'http://localhost:41251',
      capabilities: ['carbon_negotiation', 'carbon_credit_purchase'],
      status: 'active'
    });

    this.registerAgent({
      id: 'payment-agent',
      name: 'Payment Agent',
      url: 'http://localhost:41245',
      capabilities: ['payment_processing', 'transaction_settlement'],
      status: 'active'
    });
  }

  /**
   * Register a new agent with the orchestrator
   */
  registerAgent(agent: A2AAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`✅ Agent registered: ${agent.name} at ${agent.url}`);
  }

  /**
   * Get agent information by ID
   */
  getAgent(agentId: string): A2AAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): A2AAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.status === 'active');
  }

  /**
   * Get all agents (active and inactive)
   */
  getAllAgents(): A2AAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): A2AAgent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent.capabilities.includes(capability) && agent.status === 'active'
    );
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: A2AAgent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }

  /**
   * Perform health check on all agents
   */
  private async performHealthCheck(): Promise<void> {
    for (const [agentId, agent] of this.agents) {
      try {
        let healthEndpoint = '/health';
        
        // Different agents may have different health check endpoints
        if (agentId === 'payment-agent') {
          // Payment agent uses A2A protocol, check agent card instead
          const response = await axios.get(`${agent.url}/.well-known/agent-card.json`, { timeout: 5000 });
          if (response.status === 200 && (response.data as any).name) {
            agent.status = 'active';
          } else {
            agent.status = 'inactive';
          }
        } else {
          // Standard health check for other agents
          const response = await axios.get(`${agent.url}${healthEndpoint}`, { timeout: 5000 });
          if (response.status === 200) {
            agent.status = 'active';
          } else {
            agent.status = 'inactive';
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ Health check failed for agent ${agentId}:`, error.message);
        agent.status = 'inactive';
      }
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): { total: number; active: number; inactive: number } {
    const agents = Array.from(this.agents.values());
    return {
      total: agents.length,
      active: agents.filter(a => a.status === 'active').length,
      inactive: agents.filter(a => a.status === 'inactive').length,
    };
  }
}
