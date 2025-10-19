import { ChatOllama } from '@langchain/ollama';

/**
 * Creates and configures the LLM provider based on available environment variables
 * Supports multiple AI providers with fallback to Ollama
 */
export function createLLM() {
  // Option 1: OpenAI (requires OPENAI_API_KEY in .env)
  // if (process.env.OPENAI_API_KEY) {
  //   try {
  //     const { ChatOpenAI } = require('@langchain/openai');
  //     return new ChatOpenAI({ model: 'gpt-4o-mini' });
  //   } catch (error) {
  //     console.warn('OpenAI package not installed, falling back to Ollama');
  //   }
  // }

  // // Option 2: Anthropic Claude (requires ANTHROPIC_API_KEY in .env)
  // if (process.env.ANTHROPIC_API_KEY) {
  //   try {
  //     const { ChatAnthropic } = require('@langchain/anthropic');
  //     return new ChatAnthropic({ model: 'claude-3-haiku-20240307' });
  //   } catch (error) {
  //     console.warn('Anthropic package not installed, falling back to Ollama');
  //   }
  // }

  // // Option 3: Groq (requires GROQ_API_KEY in .env)
  // if (process.env.GROQ_API_KEY) {
  //   try {
  //     const { ChatGroq } = require('@langchain/groq');
  //     return new ChatGroq({ model: 'llama3-8b-8192' });
  //   } catch (error) {
  //     console.warn('Groq package not installed, falling back to Ollama');
  //   }
  // }

  // Option 4: Ollama (free, local - requires Ollama installed and running)
  try {
    return new ChatOllama({
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
    });
  } catch (e) {
    console.error('No AI provider configured. Please either:');
    console.error(
      '1. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY in .env'
    );
    console.error('2. Install and run Ollama locally (https://ollama.com)');
    throw new Error('No AI provider available');
  }
}
