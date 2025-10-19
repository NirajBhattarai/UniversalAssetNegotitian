import { NextApiResponse } from 'next';
import { ChatResponse, STREAMING_DELAY_MS } from './chat-config';

export async function streamChunk(
  res: NextApiResponse<ChatResponse>,
  content: string,
  delay: number = STREAMING_DELAY_MS
): Promise<void> {
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
  
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export function streamError(
  res: NextApiResponse<ChatResponse>,
  error: string
): void {
  res.write(`data: ${JSON.stringify({
    content: '',
    error,
    done: true,
  })}\n\n`);
}

export function streamEnd(
  res: NextApiResponse<ChatResponse>,
  fullOutput: string
): void {
  res.write(`data: ${JSON.stringify({
    content: '',
    done: true,
    fullOutput,
  })}\n\n`);
  
  res.end();
}

export async function processStreamChunks(
  stream: any,
  res: NextApiResponse<ChatResponse>,
  onChunk?: (chunk: any) => void
): Promise<string> {
  let fullOutput = '';
  let hasContent = false;
  let chunkCount = 0;
  const maxChunks = 1000; // Prevent infinite loops

  try {
    for await (const chunk of stream) {
      chunkCount++;
      
      if (chunkCount > maxChunks) {
        console.warn('Max chunks reached, breaking stream');
        break;
      }

      if (onChunk) {
        onChunk(chunk);
      }
      
      // Handle different chunk types
      if (chunk.output) {
        const content = chunk.output;
        fullOutput += content;
        hasContent = true;
        
        await streamChunk(res, content);
      } else if (chunk.content) {
        // Handle direct content chunks
        const content = chunk.content;
        fullOutput += content;
        hasContent = true;
        
        await streamChunk(res, content);
      } else if (chunk.text) {
        // Handle text chunks
        const content = chunk.text;
        fullOutput += content;
        hasContent = true;
        
        await streamChunk(res, content);
      }

      // Log chunk details for debugging
      if (chunkCount % 10 === 0) {
        console.log(`Processed ${chunkCount} chunks, output length: ${fullOutput.length}`);
      }
    }
  } catch (error) {
    console.error('Error processing stream chunks:', error);
    throw error;
  }

  console.log(`Stream processing complete. Total chunks: ${chunkCount}, Output length: ${fullOutput.length}`);
  return fullOutput;
}
