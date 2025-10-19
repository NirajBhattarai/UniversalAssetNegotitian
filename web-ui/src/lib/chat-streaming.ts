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

  for await (const chunk of stream) {
    if (onChunk) {
      onChunk(chunk);
    }
    
    if (chunk.output) {
      const content = chunk.output;
      fullOutput += content;
      hasContent = true;
      
      await streamChunk(res, content);
    }
  }

  return fullOutput;
}
