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
  createSystemPrompt,
} from '../../lib/chat-config';
import {
  streamChunk,
  streamError,
  streamEnd,
  processStreamChunks,
} from '../../lib/chat-streaming';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';

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

    console.log('Prompt received:', inputPrompt);

    // Check if any AI provider is available
    let llm;
    try {
      llm = createLLM();
    } catch (error) {
      return res.status(200).json({
        output: NO_AI_PROVIDER_RESPONSE,
      });
    }

      // Load the structured chat prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', createSystemPrompt(inputPrompt)],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

    // Setup Hedera tools and agent
    const { tools } = setupTools();

    const agent = createToolCallingAgent({
      llm,
      tools,
      prompt
    });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
    });
      

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
