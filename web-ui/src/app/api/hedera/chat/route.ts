import { NextRequest, NextResponse } from 'next/server';

export interface HederaChatRequest {
  message: string;
}

export interface HederaChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

class MockHederaServerClient {
  private isInitialized = false;

  constructor() {
    // Mock initialization
  }

  async initialize(): Promise<boolean> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isInitialized = true;
    return true;
  }

  async sendMessage(input: string): Promise<HederaChatResponse> {
    if (!this.isInitialized) {
      return {
        message: 'Mock Hedera client not initialized.',
        success: false,
        error: 'Client not initialized',
      };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock responses based on input
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('balance') || lowerInput.includes('hbar')) {
      return {
        message: `💰 Your mock HBAR balance: 1,250.50 HBAR\n\n📊 Account Details:\n• Account ID: 0.0.123456\n• Network: Mock Testnet\n• Status: Active\n• Last Transaction: Mock transaction ID\n\n💡 This is mock data for testing purposes.`,
        success: true,
      };
    }

    if (lowerInput.includes('account') || lowerInput.includes('info')) {
      return {
        message: `🔍 Mock Account Information:\n\n• Account ID: 0.0.123456\n• Public Key: Mock public key\n• Network: Mock Testnet\n• Balance: 1,250.50 HBAR\n• Created: Mock timestamp\n• Status: Active\n\n💡 This is mock data for testing purposes.`,
        success: true,
      };
    }

    if (lowerInput.includes('transaction') || lowerInput.includes('send')) {
      return {
        message: `📤 Mock Transaction Details:\n\n• Transaction ID: Mock transaction ID\n• Amount: Mock amount\n• Recipient: Mock recipient\n• Status: Confirmed\n• Gas Used: Mock gas amount\n• Timestamp: Mock timestamp\n\n✅ Transaction completed successfully!\n\n💡 This is mock data for testing purposes.`,
        success: true,
      };
    }

    if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
      return {
        message: `🤖 Mock Hedera Assistant - Available Commands:\n\n• "What's my HBAR balance?" - Check account balance\n• "Show my account information" - Display account details\n• "Send transaction" - Process mock transaction\n• "Help" - Show this help message\n\n💡 This is a mock implementation for testing purposes.`,
        success: true,
      };
    }

    // Default response
    return {
      message: `🤖 Mock Hedera Assistant Response:\n\nI received your message: "${input}"\n\nThis is a mock implementation for testing purposes. In a real implementation, I would:\n\n• Connect to Hedera network\n• Execute blockchain operations\n• Provide real-time data\n• Process actual transactions\n\nTry asking about your balance or account information!`,
      success: true,
    };
  }

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return await this.initialize();
      }
      return true;
    } catch (error) {
      console.error('Mock Hedera connection check failed:', error);
      return false;
    }
  }
}

// Global instance to reuse the connection
let hederaClient: MockHederaServerClient | null = null;

export async function POST(request: NextRequest) {
  try {
    const body: HederaChatRequest = await request.json();

    if (!body.message) {
      return NextResponse.json(
        { message: 'Message is required', success: false },
        { status: 400 }
      );
    }

    // Initialize client if not already done
    if (!hederaClient) {
      hederaClient = new MockHederaServerClient();
      const initialized = await hederaClient.initialize();
      if (!initialized) {
        return NextResponse.json(
          {
            message: 'Failed to initialize mock Hedera client',
            success: false,
          },
          { status: 500 }
        );
      }
    }

    const response = await hederaClient.sendMessage(body.message);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        success: false,
        error: 'Server error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Initialize client if not already done
    if (!hederaClient) {
      hederaClient = new MockHederaServerClient();
    }

    const isConnected = await hederaClient.checkConnection();
    return NextResponse.json({ connected: isConnected });
  } catch (error) {
    console.error('Connection check error:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
