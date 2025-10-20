/**
 * Types and Interfaces for Universal Asset Negotiation Orchestrator Agent
 */

export interface A2AAgent {
  id: string;
  name: string;
  url: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'error';
}

export interface WorkflowStep {
  id: string;
  agentId: string;
  action: string;
  input: any;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  context: any;
  createdAt: Date;
  completedAt?: Date;
}

export interface OrchestrationRequest {
  request: string;
  workflow?: string;
  context?: any;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface AgentSession {
  id: string;
  messages: AgentMessage[];
  context: any;
  createdAt: Date;
  lastActivity: Date;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  timestamp: string;
}

export interface ToolRequest {
  agentId?: string;
  message?: string;
  workflowName?: string;
  context?: any;
}

export interface ToolResponse {
  response: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  activeAgents: number;
  registeredAgents: string[];
}

export interface AgentRegistryResponse {
  id: string;
  name: string;
  url: string;
  capabilities: string[];
  status: string;
}

export type WorkflowType = 
  | 'carbon_credit_purchase'
  | 'portfolio_analysis'
  | 'payment_processing'
  | 'universal_asset_trading'
  | 'general_orchestration';

export type AgentCapability = 
  | 'balance_check'
  | 'multi_network_balance'
  | 'carbon_negotiation'
  | 'carbon_credit_purchase'
  | 'payment_processing'
  | 'transaction_settlement'
  | 'asset_negotiation'
  | 'universal_asset_trading';
