/**
 * Configuration Module
 * 
 * Environment variables and configuration management
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  // Server Configuration
  port: number;
  host: string;
  nodeEnv: string;

  // Local Llama Configuration
  llamaModel: string;
  llamaHost: string;
  llamaPort: number;

  // Agent Registry Configuration
  healthCheckInterval: number;
  agentTimeout: number;
  maxRetryAttempts: number;

  // Workflow Configuration
  defaultWorkflowTimeout: number;
  maxConcurrentWorkflows: number;

  // Logging Configuration
  logLevel: string;
  enableRequestLogging: boolean;

  // Session Configuration
  sessionTimeout: number;
  maxSessions: number;

  // A2A Agent URLs
  walletBalanceAgentUrl: string;
  carbonCreditNegotiationAgentUrl: string;
  paymentAgentUrl: string;
  assetBrokerAgentUrl: string;
}

export const config: Config = {
  // Server Configuration
  port: parseInt(process.env.ORCHESTRATOR_PORT || '9000'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Local Llama Configuration
  llamaModel: process.env.LLAMA_MODEL || 'llama3.2',
  llamaHost: process.env.LLAMA_HOST || 'localhost',
  llamaPort: parseInt(process.env.LLAMA_PORT || '11434'),

  // Agent Registry Configuration
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  agentTimeout: parseInt(process.env.AGENT_TIMEOUT || '30000'),
  maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),

  // Workflow Configuration
  defaultWorkflowTimeout: parseInt(process.env.DEFAULT_WORKFLOW_TIMEOUT || '60000'),
  maxConcurrentWorkflows: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '10'),

  // Logging Configuration
  logLevel: process.env.LOG_LEVEL || 'info',
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',

  // Session Configuration
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
  maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),

  // A2A Agent URLs
  walletBalanceAgentUrl: process.env.WALLET_BALANCE_AGENT_URL || 'http://localhost:41252',
  carbonCreditNegotiationAgentUrl: process.env.CARBON_CREDIT_NEGOTIATION_AGENT_URL || 'http://localhost:41251',
  paymentAgentUrl: process.env.PAYMENT_AGENT_URL || 'http://localhost:41245',
  assetBrokerAgentUrl: process.env.ASSET_BROKER_AGENT_URL || 'http://localhost:41250',
};

/**
 * Validate configuration
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate Llama configuration
  if (!config.llamaModel) {
    errors.push('LLAMA_MODEL is required');
  }
  
  if (!config.llamaHost) {
    errors.push('LLAMA_HOST is required');
  }
  
  if (config.llamaPort < 1 || config.llamaPort > 65535) {
    errors.push('LLAMA_PORT must be between 1 and 65535');
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push('ORCHESTRATOR_PORT must be between 1 and 65535');
  }

  if (config.healthCheckInterval < 1000) {
    errors.push('HEALTH_CHECK_INTERVAL must be at least 1000ms');
  }

  if (config.agentTimeout < 1000) {
    errors.push('AGENT_TIMEOUT must be at least 1000ms');
  }

  if (config.defaultWorkflowTimeout < 1000) {
    errors.push('DEFAULT_WORKFLOW_TIMEOUT must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Get environment info
 */
export function getEnvironmentInfo(): { [key: string]: any } {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    host: config.host,
    llamaModel: config.llamaModel,
    llamaHost: config.llamaHost,
    llamaPort: config.llamaPort,
    healthCheckInterval: config.healthCheckInterval,
    agentTimeout: config.agentTimeout,
    logLevel: config.logLevel,
    sessionTimeout: config.sessionTimeout,
    maxSessions: config.maxSessions,
  };
}
