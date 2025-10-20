import type { NextApiRequest, NextApiResponse } from 'next';
import { createLLM } from '../../lib/llm';
import {
  ChatRequest,
  ChatResponse,
  SSE_HEADERS,
  NO_AI_PROVIDER_RESPONSE,
  setupTools,
  createAgentExecutor,
  createFallbackResponse,
} from '../../lib/chat-config';
import {
  streamChunk,
  streamError,
  streamEnd,
  processStreamChunks,
} from '../../lib/chat-streaming';

/**
 * API endpoint for Hedera AI Chat with streaming
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({
      output: '',
      error: 'Method not allowed',
    });
  }

  try {
    const { prompt: inputPrompt }: ChatRequest = req.body;

    if (!inputPrompt) {
      return res.status(400).json({
        output: '',
        error: 'Missing prompt',
      });
    }

    // Check if any AI provider is available
    let llm;
    try {
      llm = createLLM();
    } catch (error) {
      return res.status(200).json({
        output: NO_AI_PROVIDER_RESPONSE,
      });
    }

    // Setup Hedera tools and agent
    const { tools } = setupTools();
    const agentExecutor = createAgentExecutor(llm, tools);

    // Set up Server-Sent Events streaming response
    Object.entries(SSE_HEADERS).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    console.log('Starting chat stream for prompt:', inputPrompt);

    // Check if this is a wallet balance request and handle it directly
    const lowerPrompt = inputPrompt.toLowerCase();
    const walletAddressMatch = inputPrompt.match(
      /(0x[a-fA-F0-9]{40}|0\.0\.\d+)/
    );

    if (
      (lowerPrompt.includes('balance') || lowerPrompt.includes('wallet')) &&
      walletAddressMatch
    ) {
      console.log('Detected wallet balance request, handling directly');

      try {
        const { createWalletBalanceTool } = await import(
          '../../lib/wallet-balance-tool'
        );
        const walletTool = createWalletBalanceTool();

        // Extract network if specified
        let network = 'all';
        if (lowerPrompt.includes('ethereum')) network = 'ethereum';
        else if (lowerPrompt.includes('polygon')) network = 'polygon';
        else if (lowerPrompt.includes('bsc')) network = 'bsc';
        else if (lowerPrompt.includes('arbitrum')) network = 'arbitrum';
        else if (lowerPrompt.includes('optimism')) network = 'optimism';
        else if (lowerPrompt.includes('avalanche')) network = 'avalanche';
        else if (lowerPrompt.includes('hedera')) network = 'hedera';

        const result = await walletTool.invoke({
          walletAddress: walletAddressMatch[0],
          network: network,
        });

        // Stream the result
        await streamChunk(res, result, 0);
        streamEnd(res, result);
        return;
      } catch (error) {
        console.error('Direct wallet balance handling failed:', error);
        // Fall through to agent executor
      }
    }

    try {
      // Stream from agent executor with timeout
      const streamPromise = agentExecutor.stream({ input: inputPrompt });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Agent executor timeout after 60 seconds')),
          60000
        )
      );

      const stream = await Promise.race([streamPromise, timeoutPromise]);

      console.log('Stream created successfully');

      // Process streaming chunks
      const fullOutput = await processStreamChunks(stream, res, chunk => {
        console.log('Stream chunk received:', {
          hasOutput: !!chunk.output,
          outputLength: chunk.output?.length || 0,
          chunkKeys: Object.keys(chunk),
        });
      });

      // If no content was streamed, provide fallback
      if (!fullOutput) {
        console.log('No content streamed, providing fallback response');
        const fallbackResponse = createFallbackResponse(inputPrompt);
        await streamChunk(res, fallbackResponse, 0);
        streamEnd(res, fallbackResponse);
        return;
      }

      // End stream with final output
      streamEnd(res, fullOutput);
    } catch (streamErr) {
      console.error('Stream error:', streamErr);
      streamError(res, 'Stream processing error');
      res.end();
      return;
    }
  } catch (error) {
    console.error('Chat API error:', error);

    // Set up SSE headers for error response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send error as stream
    streamError(
      res,
      error instanceof Error ? error.message : 'Internal server error'
    );
    res.end();
  }
}
