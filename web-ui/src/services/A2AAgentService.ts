import { A2AClient } from '@a2a-js/sdk/client';

export interface AgentConfig {
  id: string;
  name: string;
  url: string;
  description: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  agentName?: string;
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export class A2AAgentService {
  private clients: Map<string, A2AClient> = new Map();
  private agents: AgentConfig[] = [
    {
      id: 'carbon-credit-negotiation',
      name: 'Carbon Credit Negotiation Agent',
      url: 'http://localhost:41251',
      description: 'Find best carbon credit offers from marketplace'
    },
    {
      id: 'carbon-credit-payment',
      name: 'Carbon Credit Payment Agent',
      url: 'http://localhost:41245',
      description: 'Process carbon credit payments with blockchain'
    },
    {
      id: 'wallet-balance',
      name: 'Multi-Network Wallet Balance Agent',
      url: 'http://localhost:41252',
      description: 'Check wallet balances across Hedera, Ethereum, and Polygon networks'
    }
  ];

  constructor() {
    // Initialize clients asynchronously - don't fail if agents are offline
    this.initializeClients().catch(error => {
      console.warn('Some A2A agents are offline - this is expected if agents are not running:', error);
    });
  }

  private async initializeClients(): Promise<void> {
    await Promise.all(
      this.agents.map(async (agent) => {
        try {
          const client = await A2AClient.fromCardUrl(`${agent.url}/.well-known/agent-card.json`);
          this.clients.set(agent.id, client);
          console.log(`✅ Successfully connected to ${agent.name}`);
        } catch (error) {
          console.warn(`⚠️  ${agent.name} is offline (this is normal if agents are not running):`, error instanceof Error ? error.message : 'Connection failed');
        }
      })
    );
  }

  async checkAgentStatus(agentId: string): Promise<boolean> {
    try {
      const agent = this.agents.find(a => a.id === agentId);
      if (!agent) return false;

      const response = await fetch(`${agent.url}/.well-known/agent-card.json`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(3000) // Reduced timeout for faster response
      });
      
      return response.ok;
    } catch (error) {
      // Don't log warnings for offline agents - this is expected behavior
      return false;
    }
  }

  async checkAllAgentsStatus(): Promise<Record<string, boolean>> {
    const statuses: Record<string, boolean> = {};
    
    await Promise.all(
      this.agents.map(async (agent) => {
        statuses[agent.id] = await this.checkAgentStatus(agent.id);
      })
    );
    
    return statuses;
  }

  async sendMessageToAgent(
    message: string, 
    agentId: string,
    contextId?: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const agent = this.agents.find(a => a.id === agentId);
      if (!agent) {
        return { success: false, error: 'Agent configuration not found' };
      }

      // Check if agent is online first
      const isOnline = await this.checkAgentStatus(agentId);
      if (!isOnline) {
        return { success: false, error: `${agent.name} is offline` };
      }

      // Try to get or create client
      let client = this.clients.get(agentId);
      if (!client) {
        try {
          client = await A2AClient.fromCardUrl(`${agent.url}/.well-known/agent-card.json`);
          this.clients.set(agentId, client);
        } catch (error) {
          return { success: false, error: `Failed to connect to ${agent.name}: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
      }

      // Create A2A message
      const a2aMessage = {
        messageId: Date.now().toString(),
        kind: "message" as const,
        role: "user" as const,
        parts: [
          {
            kind: "text" as const,
            text: message
          }
        ],
        contextId: contextId || Date.now().toString(),
      };

      // Send message and collect response
      const params = { message: a2aMessage };
      const stream = client.sendMessageStream(params);
      
      let fullResponse = '';
      let hasResponse = false;

      for await (const event of stream) {
        if (event.kind === "status-update") {
          const statusText = (event.status.message?.parts?.[0] as any)?.text || '';
          if (statusText) {
            fullResponse += statusText + '\n';
            hasResponse = true;
          }
        } else if (event.kind === "artifact-update") {
          const artifactName = event.artifact.name || '';
          const artifactContent = (event.artifact as any).content || '';
          if (artifactName) {
            fullResponse += `📄 ${artifactName}\n`;
            hasResponse = true;
          }
          if (artifactContent) {
            fullResponse += artifactContent + '\n';
            hasResponse = true;
          }
        } else if (event.kind === "message") {
          const messageText = (event as any).message?.parts?.[0]?.text || '';
          if (messageText) {
            fullResponse += messageText + '\n';
            hasResponse = true;
          }
        }
      }

      if (!hasResponse) {
        return { 
          success: false, 
          error: `No response received from ${agent.name}. Agent may be offline or not responding properly.` 
        };
      }

      return { success: true, response: fullResponse };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendMessageToAllAgents(
    message: string,
    contextId?: string
  ): Promise<Record<string, { success: boolean; response?: string; error?: string }>> {
    const results: Record<string, { success: boolean; response?: string; error?: string }> = {};
    
    await Promise.all(
      this.agents.map(async (agent) => {
        results[agent.id] = await this.sendMessageToAgent(message, agent.id, contextId);
      })
    );
    
    return results;
  }

  getAgents(): AgentConfig[] {
    return this.agents;
  }

  getAgent(agentId: string): AgentConfig | undefined {
    return this.agents.find(a => a.id === agentId);
  }
}

export const a2aAgentService = new A2AAgentService();
