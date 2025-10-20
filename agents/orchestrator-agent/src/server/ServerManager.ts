/**
 * Server Configuration and Routes
 * 
 * FastAPI server setup with all endpoints and middleware
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastify from 'fastify';
import { 
  ChatRequest, 
  ChatResponse, 
  ToolRequest, 
  ToolResponse, 
  HealthResponse,
  AgentRegistryResponse 
} from '../types/index.js';
import { AgentRegistry } from '../services/AgentRegistry.js';
import { WorkflowManager } from '../services/WorkflowManager.js';
import { OrchestratorAgent } from '../services/OrchestratorAgent.js';
import { LlamaService } from '../services/LlamaService.js';
import { config } from '../config/index.js';

export class ServerManager {
  private server: FastifyInstance;
  private agentRegistry: AgentRegistry;
  private workflowManager: WorkflowManager;
  private orchestrator: OrchestratorAgent;

  constructor() {
    this.server = fastify({
      logger: {
        level: 'info',
      },
    });
    
    this.agentRegistry = new AgentRegistry();
    this.workflowManager = new WorkflowManager(this.agentRegistry);
    
    // Initialize Llama service
    const llamaService = new LlamaService({
      model: config.llamaModel,
      host: config.llamaHost,
      port: config.llamaPort,
    });
    
    this.orchestrator = new OrchestratorAgent(this.agentRegistry, this.workflowManager, llamaService);
  }

  /**
   * Setup all routes and middleware
   */
  async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.server.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      const activeAgents = this.agentRegistry.getActiveAgents();
      const response: HealthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeAgents: activeAgents.length,
        registeredAgents: activeAgents.map(a => a.id),
      };
      return response;
    });

    // Agent registry endpoint
    this.server.get('/api/agents', async (request: FastifyRequest, reply: FastifyReply) => {
      const agents = this.agentRegistry.getActiveAgents();
      const response: AgentRegistryResponse[] = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        url: agent.url,
        capabilities: agent.capabilities,
        status: agent.status,
      }));
      return response;
    });

    // Workflow endpoints
    this.server.get('/api/workflows', async (request: FastifyRequest, reply: FastifyReply) => {
      return this.workflowManager.getAllWorkflows();
    });

    this.server.get('/api/workflows/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const workflow = this.workflowManager.getWorkflow(id);
      if (!workflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }
      return workflow;
    });

    // Chat endpoint (AG-UI Protocol)
    this.server.post('/chat', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { message, sessionId } = request.body as ChatRequest;
        
        if (!message) {
          return reply.status(400).send({ error: 'Message is required' });
        }

        const currentSessionId = sessionId || this.generateSessionId();
        const response = await this.orchestrator.processMessage(currentSessionId, message);

        const chatResponse: ChatResponse = {
          response,
          sessionId: currentSessionId,
          timestamp: new Date().toISOString(),
        };
        
        return chatResponse;
      } catch (error: any) {
        console.error('Chat endpoint error:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    });

    // Tool endpoints for agent communication
    this.server.post('/tools/send-message-to-a2a-agent', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { agentId, message } = request.body as ToolRequest;
        
        if (!agentId || !message) {
          return reply.status(400).send({ error: 'AgentId and message are required' });
        }

        const response = await this.orchestrator.sendMessageToA2AAgent(agentId, message);
        const toolResponse: ToolResponse = { response };
        return toolResponse;
      } catch (error: any) {
        console.error('Tool endpoint error:', error);
        return reply.status(500).send({ error: error.message });
      }
    });

    this.server.post('/tools/check-agent-health', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { agentId } = request.body as ToolRequest;
        
        if (!agentId) {
          return reply.status(400).send({ error: 'AgentId is required' });
        }

        const response = await this.orchestrator.checkAgentHealth(agentId);
        const toolResponse: ToolResponse = { response };
        return toolResponse;
      } catch (error: any) {
        console.error('Health check error:', error);
        return reply.status(500).send({ error: error.message });
      }
    });

    this.server.post('/tools/execute-workflow', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { workflowName, context } = request.body as ToolRequest;
        
        if (!workflowName) {
          return reply.status(400).send({ error: 'WorkflowName is required' });
        }

        const response = await this.orchestrator.executeWorkflow(workflowName as any, context);
        const toolResponse: ToolResponse = { response };
        return toolResponse;
      } catch (error: any) {
        console.error('Workflow execution error:', error);
        return reply.status(500).send({ error: error.message });
      }
    });

    // Statistics endpoint
    this.server.get('/api/stats', async (request: FastifyRequest, reply: FastifyReply) => {
      return this.orchestrator.getStats();
    });

    // Llama status endpoint
    this.server.get('/api/llama/status', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const llamaService = (this.orchestrator as any).llamaService;
        const status = await llamaService.getStatus();
        return status;
      } catch (error: any) {
        return reply.status(500).send({ error: error.message });
      }
    });

    // Session management endpoints
    this.server.get('/api/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
      return this.orchestrator.getAllSessions();
    });

    this.server.get('/api/sessions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const session = this.orchestrator.getSession(id);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      return session;
    });

    // Graceful shutdown hook
    this.server.addHook('onClose', async () => {
      this.agentRegistry.stopHealthChecks();
    });
  }

  /**
   * Start the server
   */
  async start(port: number = 9000): Promise<void> {
    await this.setupRoutes();
    
    await this.server.listen({ 
      port, 
      host: '0.0.0.0' 
    });

    console.log(`🚀 Universal Asset Negotiation Orchestrator (ADK + AG-UI) running on http://0.0.0.0:${port}`);
    console.log(`🏥 Health Check: http://localhost:${port}/health`);
    console.log(`🤖 Chat Endpoint: http://localhost:${port}/chat`);
    console.log(`📊 Agent Registry: http://localhost:${port}/api/agents`);
    console.log(`🔄 Workflows: http://localhost:${port}/api/workflows`);
    console.log(`🔧 Tools: http://localhost:${port}/tools/*`);
    console.log(`📈 Statistics: http://localhost:${port}/api/stats`);
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.server.close();
  }

  /**
   * Generate a new session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server instance (for testing)
   */
  getServer(): FastifyInstance {
    return this.server;
  }
}
