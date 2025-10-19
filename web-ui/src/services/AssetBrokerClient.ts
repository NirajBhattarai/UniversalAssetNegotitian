import { A2AClient } from '@a2a-js/sdk/client';
import { AgentEvent } from '@/types';

export class AssetBrokerClient {
  private client: A2AClient;
  private contextId: string | null = null;
  private taskId: string | null = null;

  constructor(baseUrl: string) {
    this.client = new A2AClient(baseUrl);
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.client.getAgentCard();
      return true;
    } catch {
      return false;
    }
  }

  async sendMessage(text: string): Promise<AsyncIterable<AgentEvent>> {
    const messageId = this.generateId();

    const message = {
      messageId,
      kind: 'message' as const,
      role: 'user' as const,
      parts: [
        {
          kind: 'text' as const,
          text,
        },
      ],
      ...(this.contextId && { contextId: this.contextId }),
      ...(this.taskId && { taskId: this.taskId }),
    };

    const params = { message };

    try {
      const stream = this.client.sendMessageStream(params);

      return this.mapStreamToAgentEvents(stream);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  private async *mapStreamToAgentEvents(
    stream: AsyncGenerator<any, void, undefined>
  ): AsyncGenerator<AgentEvent, void, undefined> {
    for await (const event of stream) {
      // Update context and task IDs
      if (event.contextId) {
        this.contextId = event.contextId;
      }
      if (event.taskId) {
        this.taskId = event.taskId;
      }

      // Map A2A events to our AgentEvent interface
      const agentEvent: AgentEvent = {
        kind: event.kind,
        taskId: event.taskId,
        contextId: event.contextId,
        status: event.status,
        artifact: event.artifact,
      };

      yield agentEvent;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  disconnect(): void {
    // Clean up any ongoing connections
    this.contextId = null;
    this.taskId = null;
  }
}
