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

    try {
      // Stream from agent executor
      const stream = await agentExecutor.stream({ input: inputPrompt });
      
      console.log('Stream created:', stream);

      // Process streaming chunks
      const fullOutput = await processStreamChunks(
        stream,
        res,
        (chunk) => console.log('Token:--->', chunk)
      );

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
    streamError(res, error instanceof Error ? error.message : 'Internal server error');
    res.end();
  }
}