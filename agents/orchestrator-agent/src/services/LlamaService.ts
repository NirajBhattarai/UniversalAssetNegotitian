/**
 * Llama Service
 * 
 * Handles communication with local Llama model via Ollama
 */

import axios from 'axios';

export interface LlamaConfig {
  model: string;
  host: string;
  port: number;
}

export interface LlamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    stop?: string[];
  };
}

export interface LlamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class LlamaService {
  private config: LlamaConfig;
  private baseUrl: string;

  constructor(config: LlamaConfig) {
    this.config = config;
    this.baseUrl = `http://${config.host}:${config.port}`;
  }

  /**
   * Generate text using the local Llama model
   */
  async generateText(prompt: string, options?: LlamaRequest['options']): Promise<string> {
    try {
      const request: LlamaRequest = {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          stop: ['Human:', 'User:', 'Assistant:', 'Agent:'],
          ...options,
        },
      };

      const response = await axios.post(`${this.baseUrl}/api/generate`, request, {
        timeout: 60000, // 60 seconds timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: LlamaResponse = response.data as LlamaResponse;
      return data.response.trim();

    } catch (error: any) {
      console.error('Llama generation error:', error);
      throw new Error(`Failed to generate text with Llama: ${error.message}`);
    }
  }

  /**
   * Check if the Llama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000,
      });
      return (response.data as any).models?.map((model: any) => model.name) || [];
    } catch (error: any) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  /**
   * Check if the configured model is available
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const models = await this.getAvailableModels();
      return models.includes(this.config.model);
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull/download a model if it's not available
   */
  async pullModel(): Promise<void> {
    try {
      console.log(`📥 Pulling Llama model: ${this.config.model}`);
      const response = await axios.post(`${this.baseUrl}/api/pull`, {
        name: this.config.model,
        stream: false,
      }, {
        timeout: 300000, // 5 minutes timeout for model download
      });
      
      console.log(`✅ Model ${this.config.model} pulled successfully`);
    } catch (error: any) {
      console.error(`❌ Failed to pull model ${this.config.model}:`, error.message);
      throw new Error(`Failed to pull model: ${error.message}`);
    }
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<{
    available: boolean;
    modelAvailable: boolean;
    availableModels: string[];
    configuredModel: string;
  }> {
    const available = await this.isAvailable();
    const modelAvailable = available ? await this.isModelAvailable() : false;
    const availableModels = available ? await this.getAvailableModels() : [];
    
    return {
      available,
      modelAvailable,
      availableModels,
      configuredModel: this.config.model,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LlamaConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.baseUrl = `http://${this.config.host}:${this.config.port}`;
  }
}
