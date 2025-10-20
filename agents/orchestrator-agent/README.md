# Universal Asset Negotiation Orchestrator Agent (ADK + AG-UI Protocol)

A central orchestrator agent that coordinates multi-agent workflows for the Universal Asset Negotiation system using Google's Agent Development Kit (ADK) and AG-UI Protocol. This agent manages communication between specialized A2A agents including wallet balance checking, carbon credit negotiation, and payment processing.

## 🌟 Features

- **ADK Integration**: Built with Google's Agent Development Kit for advanced AI capabilities
- **AG-UI Protocol**: Full AG-UI Protocol support for seamless frontend integration
- **Multi-Agent Coordination**: Orchestrates complex workflows across multiple specialized A2A agents
- **Agent Registry Management**: Dynamic agent discovery and registration with health monitoring
- **Workflow Engine**: Executes complex multi-step workflows with dependency management
- **Sequential Execution**: Follows ADK constraints for one-at-a-time agent communication
- **FastAPI Server**: High-performance FastAPI server with comprehensive logging
- **Error Handling**: Robust error handling and recovery mechanisms

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 8+
- Google API Key (for Gemini AI)
- Other A2A agents running (wallet-balance-agent, carbon-credit-negotiation-agent, payment-agent, asset-broker-agent)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
export GOOGLE_API_KEY="your-google-api-key-here"
# Get your API key from: https://aistudio.google.com/app/apikey

# Start the orchestrator
npm start
```

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Required
GOOGLE_API_KEY=your-google-api-key-here

# Optional (defaults provided)
ORCHESTRATOR_PORT=9000
NODE_ENV=development
HEALTH_CHECK_INTERVAL=30000
AGENT_TIMEOUT=30000
DEFAULT_WORKFLOW_TIMEOUT=60000
```

## 🔧 Usage

### AG-UI Protocol

The orchestrator responds to natural language requests and coordinates workflows:

```
"Coordinate carbon credit purchase workflow"
"Execute portfolio analysis across all agents"
"Process payment with balance verification"
"Check wallet balances across all networks"
"Orchestrate complex asset negotiation"
```

### REST API

#### Health Check
```bash
GET http://localhost:9000/health
```

#### Agent Registry
```bash
# Get all registered agents
GET http://localhost:9000/api/agents
```

#### Workflow Management
```bash
# Get all workflows
GET http://localhost:9000/api/workflows
```

#### Chat Endpoint (AG-UI Protocol)
```bash
POST http://localhost:9000/chat
Content-Type: application/json

{
  "message": "Coordinate carbon credit purchase workflow",
  "sessionId": "optional-session-id"
}
```

#### Tool Endpoints
```bash
# Send message to A2A agent
POST http://localhost:9000/tools/send-message-to-a2a-agent
Content-Type: application/json

{
  "agentId": "wallet-balance-agent",
  "message": "Check balance for wallet 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
}

# Check agent health
POST http://localhost:9000/tools/check-agent-health
Content-Type: application/json

{
  "agentId": "wallet-balance-agent"
}

# Execute workflow
POST http://localhost:9000/tools/execute-workflow
Content-Type: application/json

{
  "workflowName": "carbon_credit_purchase",
  "context": {}
}
```

## 🏗️ Architecture

### Core Components

- **OrchestratorAgent**: Main ADK agent using Google's Gemini AI for natural language processing
- **AgentRegistry**: Manages A2A agent discovery, registration, and health monitoring
- **WorkflowManager**: Executes complex multi-step workflows with dependency management
- **FastAPI Server**: High-performance web server with comprehensive logging and error handling
- **Session Management**: Maintains conversation context and session state

### Workflow Types

1. **Carbon Credit Purchase**: Balance check → Negotiation → Payment processing
2. **Portfolio Analysis**: Comprehensive portfolio analysis and recommendations
3. **Payment Processing**: Balance verification → Transaction processing
4. **Universal Asset Trading**: Balance check → Asset negotiation → Payment processing

### Agent Communication Flow

```
User Request → ADK Agent → Workflow Determination → Sequential A2A Agent Calls → Result Synthesis
```

### ADK Integration

The orchestrator uses Google's Agent Development Kit (ADK) with:
- **Gemini AI Model**: `gemini-2.0-flash-exp` for advanced natural language understanding
- **Sequential Execution**: Follows ADK constraints for one-at-a-time agent communication
- **Tool Integration**: Built-in tools for A2A agent communication
- **Session Management**: Maintains conversation context across interactions

## 📊 Supported Workflows

### Carbon Credit Purchase Workflow
1. **Wallet Balance Check**: Verify sufficient funds
2. **Carbon Credit Negotiation**: Find best deals
3. **Payment Processing**: Execute transaction

### Portfolio Analysis Workflow
1. **Balance Analysis**: Get comprehensive portfolio data
2. **Investment Opportunities**: Analyze carbon credit opportunities

### Payment Processing Workflow
1. **Balance Verification**: Confirm sufficient funds
2. **Transaction Processing**: Execute payment

## 🔍 API Endpoints

### Health & Status
- `GET /health` - Health check and agent status
- `GET /.well-known/agent-card.json` - A2A agent card

### Agent Management
- `GET /api/agents` - List all registered agents
- `POST /api/agents/register` - Register new agent

### Workflow Management
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/:id` - Get specific workflow

### A2A Protocol
- `POST /a2a/messages` - Send message to orchestrator

## 📈 Response Format

### Workflow Execution Result
```json
{
  "workflowId": "uuid",
  "name": "Carbon Credit Purchase",
  "status": "completed",
  "steps": [
    {
      "id": "step-uuid",
      "action": "Check wallet balance",
      "status": "completed",
      "result": { /* step result */ }
    }
  ],
  "duration": 1500,
  "completedAt": "2024-01-01T00:00:00Z"
}
```

### Agent Registry Status
```json
{
  "wallet-balance-agent": {
    "card": { /* AgentCard */ },
    "url": "http://localhost:41252",
    "status": "active",
    "lastHealthCheck": "2024-01-01T00:00:00Z",
    "capabilities": ["balance_check"]
  }
}
```

## 🔧 Configuration

### Agent Registration
The orchestrator automatically registers known agents:
- **wallet-balance-agent**: Port 41252
- **carbon-credit-negotiation-agent**: Port 41251  
- **payment-agent**: Port 41245

### Health Monitoring
- Health checks run every 30 seconds
- Agents are marked inactive if health checks fail
- Automatic retry mechanisms for failed requests

### Workflow Execution
- Steps execute in dependency order
- Parallel execution for independent steps
- Comprehensive error handling and rollback

## 🚨 Troubleshooting

**Google API Key Issues?**
- Ensure `GOOGLE_API_KEY` environment variable is set
- Get a valid API key from: https://aistudio.google.com/app/apikey
- Check API key permissions and quotas

**Agents not connecting?**
- Verify all A2A agent services are running
- Check agent URLs in registry: `GET /api/agents`
- Review health check logs in console output

**Workflow failures?**
- Check agent dependencies and capabilities
- Verify A2A agents are responding to health checks
- Review workflow step errors in logs

**Chat endpoint not responding?**
- Ensure Google API key is properly configured
- Check FastAPI server logs for errors
- Verify all dependencies are installed: `npm install`

**Performance issues?**
- Monitor agent response times in health checks
- Check Google AI API quotas and limits
- Review FastAPI server performance metrics

## 🔗 Integration

### With Web UI
The orchestrator integrates with the web UI through:
- Communication agent tool
- A2A protocol endpoints
- Workflow management APIs

### With Other Agents
- Automatic agent discovery
- Health monitoring
- Message routing and coordination

## 📝 Development

### Adding New Workflows
1. Define workflow steps in `OrchestratorAgentExecutor`
2. Add workflow type detection logic
3. Implement step execution logic
4. Test with agent registry

### Adding New Agents
1. Register agent in `main()` function
2. Define agent capabilities
3. Update workflow dependencies
4. Test integration

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## 📞 Support

For issues and questions:
- Create GitHub issue
- Check agent health status
- Review workflow execution logs
