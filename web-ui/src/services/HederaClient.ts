export interface HederaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface HederaChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

export interface HederaConnectionResponse {
  connected: boolean;
}

export class HederaClientService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/hedera';
  }

  async sendMessage(message: string): Promise<HederaChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        message: 'Failed to send message. Please try again.',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'GET',
      });

      if (!response.ok) {
        return false;
      }

      const data: HederaConnectionResponse = await response.json();
      return data.connected;
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }
}