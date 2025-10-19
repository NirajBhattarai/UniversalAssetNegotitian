# Carbon Credit Multi-Agent Trading System

A sophisticated multi-agent system powered by Hedera Agent Kit and Google A2A protocol for automated carbon credit negotiation, verification, and settlement.

## 🎯 Project Overview

This system demonstrates a carbon credit focused multi-agent architecture where specialized agents can negotiate, coordinate, and execute carbon credit transactions using the A2A (Agent-to-Agent) protocol. The system showcases real-time agent communication, blockchain integration with Hedera, and a modern web interface for carbon credit trading.

## 🏗️ System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Web UI (Next.js)                         │
│              Carbon Credit Trading Interface                │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────┴───────────────────────────────────────┐
│                A2A Agent Orchestrator                      │
│              (Multi-Agent Coordination)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ A2A Protocol
┌─────────────────────┴───────────────────────────────────────┐
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ Carbon Credit       │  │ Carbon Credit       │          │
│  │ Negotiation Agent   │  │ Payment Agent       │          │
│  └─────────────────────┘  └─────────────────────┘          │
└─────────────────────┬───────────────────────────────────────┘
                      │ Database Integration
┌─────────────────────┴───────────────────────────────────────┐
│                Carbon Credit Marketplace                    │
│              PostgreSQL Database                            │
└─────────────────────────────────────────────────────────────┘
```

### Agent Architecture

Each agent follows a standardized architecture:

- **Agent Executor**: Core business logic and decision making
- **A2A Client**: Communication interface for inter-agent messaging
- **Hedera Integration**: Blockchain operations and smart contract interactions
- **Event Bus**: Real-time status updates and event streaming
- **Request Context**: State management and context preservation

### Key Technologies

- **A2A Protocol**: Agent-to-Agent communication standard
- **Hedera Agent Kit**: Blockchain integration and smart contract management
- **Next.js**: Modern React-based web interface
- **TypeScript**: Type-safe development across the stack
- **Express.js**: Agent server infrastructure
- **LangChain**: AI-powered agent reasoning and decision making

## 🤖 Agent Specifications

### Carbon Credit Negotiation Agent (Port 41251)
- **Purpose**: Finds and negotiates the best carbon credit offers
- **Capabilities**: 
  - Real-time database integration with carbon credit marketplace
  - Price comparison and optimization
  - Volume-based negotiation
  - Payment method flexibility (USDC, USDT, HBAR, Bank Transfer)
  - Company filtering and verification

### Carbon Credit Payment Agent (Port 41245)
- **Purpose**: Processes carbon credit payments and manages transactions
- **Capabilities**:
  - Payment processing for carbon credit purchases
  - Database integration for credit reduction
  - Multiple payment methods (USDC, USDT, HBAR, Bank Transfer)
  - Transaction verification and confirmation
  - Future blockchain integration (TODO)

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For cloning the repository

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd UniversalAssetNegotiation
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install web UI dependencies
   cd web-ui && npm install && cd ..
   
   # Install agent dependencies
   cd agents/payment-agent && npm install && cd ../..
   cd agents/asset-broker-agent && npm install && cd ../..
   cd agents/carbon-credit-negotiation-agent && npm install && cd ../..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   # Required: Hedera account credentials, API keys
   ```

### Starting the System

#### Option 1: Start All Components (Recommended)

```bash
# Terminal 1: Start all agents
npm run agents:all

# Terminal 2: Start web UI
npm run ui:dev
```

#### Option 2: Start Components Individually

```bash
# Terminal 1: Carbon Credit Negotiation Agent
npm run agents:carbon-credit-negotiation

# Terminal 2: Carbon Credit Payment Agent
npm run agents:payment-agent

# Terminal 3: Asset Broker Agent
npm run agents:asset-broker
```

# Terminal 6: Web UI
npm run ui:dev
```

### Access Points

Once started, you can access:

- **Web UI**: http://localhost:3000
- **Travel Agent**: http://localhost:41243/.well-known/agent-card.json
- **Hotel Agent**: http://localhost:41244/.well-known/agent-card.json
- **Flight Agent**: http://localhost:41246/.well-known/agent-card.json
- **Payment Agent**: http://localhost:41245/.well-known/agent-card.json
- **Asset Broker Agent**: http://localhost:41250/.well-known/agent-card.json

## 🎮 Demo Scenarios

### Travel Booking Demo

```bash
npm run demo:travel
```

This demo showcases:
- Multi-agent coordination for travel booking
- Real-time negotiation between agents
- Hedera blockchain settlement
- End-to-end transaction flow

### Multi-Agent Carbon Credit Demo

```bash
npm run demo:multi-agent
```

This demo demonstrates:
- Carbon credit purchase coordination between agents
- Multi-agent carbon credit payment processing
- Agent-to-agent carbon credit negotiation
- Cross-agent communication patterns
- Database integration for real-time data
- Payment settlement workflows (bypassing blockchain for now)

### Carbon Credit Negotiation Demo

```bash
npm run demo:carbon-credit
```

This demo showcases:
- Carbon credit marketplace database integration
- Price negotiation and comparison
- Company offer analysis
- Settlement recommendations

### Carbon Credit Payment Demo

```bash
npm run demo:carbon-credit-payment
```

This demo showcases:
- Carbon credit payment processing with USDC/USDT/HBAR
- Database integration for credit tracking
- Dummy blockchain settlement (TODO: implement real blockchain)
- Payment confirmation and transaction details

## 🔧 Development

### Project Structure

```
UniversalAssetNegotiation/
├── agents/                          # Individual agent implementations
│   ├── payment-agent/              # Carbon credit payment processing agent
│   ├── asset-broker-agent/         # Asset negotiation coordinator
│   └── carbon-credit-negotiation-agent/  # Carbon credit price negotiation agent
├── web-ui/                         # Next.js web interface
│   ├── src/
│   │   ├── components/             # React components
│   │   ├── services/               # A2A service integration
│   │   └── types/                  # TypeScript definitions
├── demo/                           # Demo scripts and examples
├── src/                           # Shared utilities and configuration
└── package.json                   # Root package configuration
```

### Adding New Agents

1. **Create agent directory**
   ```bash
   mkdir agents/new-agent
   cd agents/new-agent
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install @a2a-js/sdk hedera-agent-kit express cors dotenv
   ```

3. **Implement agent executor**
   ```typescript
   // src/index.ts
   import { AgentExecutor, RequestContext, ExecutionEventBus } from 'hedera-agent-kit';
   
   class NewAgentExecutor implements AgentExecutor {
     async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
       // Agent logic implementation
     }
   }
   ```

4. **Add to package.json scripts**
   ```json
   {
     "scripts": {
       "agents:new-agent": "npx tsx agents/new-agent/src/index.ts"
     }
   }
   ```

### Web UI Development

The web UI is built with Next.js and includes:

- **Multi-Agent Chat Interface**: Real-time communication with agents
- **Hedera Integration**: Blockchain transaction monitoring
- **Negotiation Visualization**: Step-by-step process tracking
- **Agent Status Monitoring**: Real-time health checks

Key components:
- `MultiAgentChat.tsx`: Main chat interface
- `A2AAgentService.ts`: Agent communication service
- `types/index.ts`: TypeScript definitions

## 🔐 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Hedera Configuration
HEDERA_ACCOUNT_ID=your_account_id
HEDERA_PRIVATE_KEY=your_private_key
HEDERA_NETWORK=testnet

# A2A Configuration
A2A_PROTOCOL_VERSION=1.0
A2A_TIMEOUT=30000

# Agent Configuration
TRAVEL_AGENT_PORT=41243
HOTEL_AGENT_PORT=41244
FLIGHT_AGENT_PORT=41246
PAYMENT_AGENT_PORT=41245
ASSET_BROKER_PORT=41250

# Web UI Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Hedera Setup

1. **Create Hedera Account**
   - Visit [Hedera Portal](https://portal.hedera.com)
   - Create a testnet account
   - Note your Account ID and Private Key

2. **Configure Network**
   - Testnet: `https://testnet.hashio.io/api`
   - Mainnet: `https://mainnet.hashio.io/api`

## 🧪 Testing

### Agent Health Checks

```bash
# Check all agent statuses
curl http://localhost:41243/health  # Travel Agent
curl http://localhost:41244/health  # Hotel Agent
curl http://localhost:41246/health  # Flight Agent
curl http://localhost:41245/health  # Payment Agent
curl http://localhost:41250/health  # Asset Broker
```

### Integration Testing

```bash
# Run travel booking test
npm run demo:travel

# Run negotiation test
npm run demo:negotiation
```

## 📊 Monitoring

### Agent Status Dashboard

The web UI provides real-time monitoring of:
- Agent online/offline status
- Message throughput
- Error rates
- Response times

### Logs

Each agent logs to stdout with structured logging:
- Request/response cycles
- Error conditions
- Performance metrics
- Blockchain transactions

## 🚨 Troubleshooting

### Common Issues

1. **Agents not starting**
   - Check port availability
   - Verify environment variables
   - Ensure dependencies are installed

2. **Web UI connection issues**
   - Verify agent URLs in configuration
   - Check CORS settings
   - Ensure agents are running

3. **Hedera integration problems**
   - Verify account credentials
   - Check network connectivity
   - Ensure sufficient HBAR balance

### Debug Mode

Enable debug logging:
```bash
DEBUG=a2a:* npm run agents:all
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Hedera**: For blockchain infrastructure and Agent Kit
- **Google**: For A2A protocol specification
- **LangChain**: For AI agent capabilities
- **Next.js**: For modern web interface framework

---

For more detailed documentation, visit the `/docs` directory or check individual agent README files.