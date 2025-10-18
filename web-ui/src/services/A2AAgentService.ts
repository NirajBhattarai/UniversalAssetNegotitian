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
      id: 'travel',
      name: 'Travel Agent',
      url: 'http://localhost:41243',
      description: 'Master coordinator for travel bookings'
    },
    {
      id: 'payment',
      name: 'Payment Agent',
      url: 'http://localhost:41245',
      description: 'Hedera token payment processing'
    },
    {
      id: 'hotel',
      name: 'Hotel Agent',
      url: 'http://localhost:41244',
      description: 'Accommodation booking specialist'
    },
    {
      id: 'flight',
      name: 'Flight Agent',
      url: 'http://localhost:41246',
      description: 'Flight booking specialist'
    }
  ];

  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    this.agents.forEach(agent => {
      this.clients.set(agent.id, new A2AClient(agent.url));
    });
  }

  async checkAgentStatus(agentId: string): Promise<boolean> {
    try {
      const agent = this.agents.find(a => a.id === agentId);
      if (!agent) return false;

      const response = await fetch(`${agent.url}/.well-known/agent-card.json`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(3000)
      });
      
      return response.ok;
    } catch {
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
      const client = this.clients.get(agentId);
      if (!client) {
        return { success: false, error: 'Agent not found' };
      }

      const agent = this.agents.find(a => a.id === agentId);
      if (!agent) {
        return { success: false, error: 'Agent configuration not found' };
      }

      // Check if agent is online
      const isOnline = await this.checkAgentStatus(agentId);
      if (!isOnline) {
        return { success: false, error: `${agent.name} is offline` };
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
          const statusText = event.status.message?.parts[0]?.text || '';
          if (statusText) {
            fullResponse += statusText + '\n';
            hasResponse = true;
          }
        } else if (event.kind === "artifact-update") {
          const artifactName = event.artifact.name || '';
          if (artifactName) {
            fullResponse += `📄 ${artifactName}\n`;
            hasResponse = true;
          }
        }
      }

      if (!hasResponse) {
        // Fallback response for demo purposes
        const responses = {
          travel: `🌍 Travel Agent Response:\n\nI've received your request: "${message}"\n\nI'll coordinate with other agents to fulfill your travel needs:\n- Searching for flights\n- Finding accommodations\n- Processing payment with Hedera tokens\n\nPlease wait while I negotiate with specialized agents...`,
          payment: `💳 Payment Agent Response:\n\nProcessing payment request: "${message}"\n\nUsing Hedera Agent Kit for blockchain operations:\n- Converting to HBAR tokens\n- Executing AP2 settlement\n- Confirming transaction on Hedera network\n\nTransaction will be processed shortly...`,
          hotel: `🏨 Hotel Agent Response:\n\nSearching accommodations for: "${message}"\n\nUsing A2A protocol for negotiation:\n- Finding available hotels\n- Negotiating competitive rates\n- Confirming reservation\n\nI'll provide you with the best options...`,
          flight: `✈️ Flight Agent Response:\n\nSearching flights for: "${message}"\n\nUsing A2A protocol for airline negotiation:\n- Finding available flights\n- Comparing prices\n- Securing best rates\n\nI'll find the perfect flight for you...`
        };
        
        fullResponse = responses[agentId as keyof typeof responses] || 'Agent response received';
      }

      return { success: true, response: fullResponse };

    } catch (error) {
      console.error('Error sending message to agent:', error);
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
