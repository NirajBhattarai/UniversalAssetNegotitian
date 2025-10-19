import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatGroq } from '@langchain/groq';
import { createHederaToolkit } from '../../lib/hedera';

interface AgentRequest {
  prompt: string;
}

interface AgentResponse {
  output: string;
  transactionBytes?: string;
  requiresSigning?: boolean;
  error?: string;
}

/**
 * API endpoint for Hedera AI Agent with toolkit integration
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({
      output: '',
      error: 'Method not allowed',
    });
  }

  try {
    const { prompt }: AgentRequest = req.body;

    if (!prompt) {
      return res.status(400).json({
        output: '',
        error: 'Missing prompt',
      });
    }

    // Check if GROQ API key is available
    if (!process.env.GROQ_API_KEY) {
      return res.status(200).json({
        output: `🤖 Hedera AI Agent is ready! 

I'm a helpful Hedera blockchain assistant. I can help you with:
- Account operations and queries
- Token management (HTS)
- Balance queries  
- Transaction information
- Hedera network concepts

Your question: "${prompt}"

Note: To enable AI responses, please set up your GROQ_API_KEY in your environment variables. For now, I can provide general information about Hedera blockchain operations.

Would you like me to explain any specific Hedera concepts or operations?`,
      });
    }

    // Initialize Hedera toolkit
    const toolkit = createHederaToolkit();
    const tools = toolkit.getTools();

    // Initialize the LLM
    const llm = new ChatGroq({
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      apiKey: process.env.GROQ_API_KEY,
    });

    // Check if user is asking for specific account operations
    const isAccountQuery = /balance|account|0\.0\.\d+|query/i.test(prompt);

    if (isAccountQuery) {
      // For account queries, try to use the Hedera tools directly
      try {
        // Look for account ID in the prompt
        const accountIdMatch = prompt.match(/0\.0\.\d+/);
        const accountId = accountIdMatch ? accountIdMatch[0] : null;

        if (accountId) {
          // Use the get_hbar_balance_query_tool directly
          const balanceTool = tools.find(
            tool =>
              tool.name.includes('hbar_balance') ||
              tool.name.includes('balance')
          );

          if (balanceTool) {
            const balanceResult = await balanceTool.invoke({ accountId });
            const response: AgentResponse = {
              output: `💰 Account Balance Query Result:

Account ID: ${accountId}
Balance: ${balanceResult}

This is the real-time HBAR balance from the Hedera testnet.`,
            };
            return res.status(200).json(response);
          }
        }
      } catch (toolError) {
        console.log('Tool execution failed, falling back to LLM:', toolError);
      }
    }

    // Enhanced prompt with available tools
    const systemPrompt = `You are a helpful Hedera blockchain assistant with access to real blockchain tools. You can help users with:
    - Account operations and queries
    - Token management (HTS)
    - Balance queries
    - Transaction information
    - Hedera network concepts
    
    Available Hedera tools: ${tools.map(tool => tool.name).join(', ')}
    
    User question: ${prompt}
    
    Please provide a helpful response about Hedera blockchain operations. If the user asks for specific account information, balances, or other blockchain data, use the available tools to fetch real data from the Hedera network.`;

    // Get response from LLM
    const result = await llm.invoke(systemPrompt);

    const response: AgentResponse = {
      output: result.content as string,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Agent API error:', error);
    res.status(500).json({
      output: '',
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}
