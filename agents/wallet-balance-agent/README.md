# Multi-Network Wallet Balance Agent

A sophisticated AI agent that fetches wallet balances across multiple blockchain networks including Hedera, Ethereum, and Polygon. Supports both native currencies and ERC20 tokens.

## 🌟 Features

- **Multi-Network Support**: Hedera, Ethereum, and Polygon networks
- **Native Currency Support**: HBAR, ETH, MATIC
- **Token Support**: USDC, USDT, WETH, WMATIC, and custom tokens
- **Real-time Balance Fetching**: Live balance queries across networks
- **USD Value Conversion**: Mock price conversion for portfolio valuation
- **A2A Protocol Integration**: Seamless integration with multi-agent system
- **REST API**: Direct API access for programmatic balance checking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 8+
- Access to network RPC endpoints

### Installation

```bash
# Install dependencies
npm install

# Start the agent
npm start
```

### Environment Variables

No environment variables are required! The agent uses free public RPC endpoints by default:

- **Hedera**: `https://testnet.hashio.io/api` (public testnet)
- **Ethereum**: `https://ethereum.publicnode.com` (free public RPC)
- **Polygon**: `https://polygon.publicnode.com` (free public RPC)

**Note**: No private keys or API keys are required! The agent only reads public balance information using free RPC calls.

## 🔧 Usage

### A2A Protocol

The agent responds to natural language requests:

```
"Check balance for wallet 0.0.123456"
"Get Ethereum balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
"Show my wallet balance across all networks"
"Check Polygon balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
```

### REST API

Direct API access for programmatic use:

```bash
# Check balance across all networks
curl -X POST http://localhost:41252/api/balance \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"}'

# Check specific networks
curl -X POST http://localhost:41252/api/balance \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    "networks": ["ethereum", "polygon"]
  }'
```

## 📊 Supported Networks & Tokens

### Hedera Network
- **Native**: HBAR
- **Tokens**: MockUSDC, MockUSDT
- **RPC**: Hedera Testnet API

### Ethereum Network
- **Native**: ETH
- **Tokens**: USDC, USDT, WETH
- **RPC**: Ethereum Mainnet

### Polygon Network
- **Native**: MATIC
- **Tokens**: USDC, USDT, WMATIC
- **RPC**: Polygon RPC

## 🏗️ Architecture

### Core Components

- **BalanceService**: Multi-network balance fetching logic
- **TokenConfig**: Network and token configuration management
- **AgentExecutor**: A2A protocol implementation
- **Express Server**: REST API and A2A endpoints

### Balance Fetching Flow

```
User Request → Agent Parser → Network Selection → Balance Queries → Response Formatting
```

1. **Parse Request**: Extract wallet address and target networks
2. **Network Selection**: Determine which networks to query
3. **Balance Queries**: Parallel queries to each network
4. **Response Formatting**: Format and return comprehensive balance report

## 🔍 API Endpoints

### Health Check
```
GET /health
```

### Balance Check
```
POST /api/balance
Content-Type: application/json

{
  "walletAddress": "string",
  "networks": ["hedera", "ethereum", "polygon"] // optional
}
```

### A2A Protocol
```
GET /.well-known/agent-card.json
POST /a2a/messages
```

## 📈 Response Format

```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "networks": {
    "ethereum": {
      "networkName": "Ethereum Mainnet",
      "nativeBalance": {
        "token": {
          "symbol": "ETH",
          "name": "Ethereum (ETH)",
          "decimals": 18
        },
        "balance": "1000000000000000000",
        "balanceFormatted": "1.0",
        "usdValue": 2000,
        "network": "ethereum",
        "blockchain": "Ethereum"
      },
      "tokenBalances": [
        {
          "token": {
            "symbol": "USDC",
            "name": "USD Coin (Ethereum)",
            "decimals": 6
          },
          "balance": "1000000",
          "balanceFormatted": "1.0",
          "usdValue": 1.0,
          "network": "ethereum",
          "blockchain": "Ethereum"
        }
      ],
      "totalUsdValue": 2001.0
    }
  },
  "totalUsdValue": 2001.0,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🧪 Testing

### Run Demo
```bash
npm run demo:wallet-balance
```

### Test Cases
- Hedera account balance checking
- Ethereum address balance checking
- Polygon address balance checking
- Multi-network balance checking
- Specific network balance checking

## 🔧 Configuration

### Token Configuration

Add new tokens by updating `src/constants/tokens.ts`:

```typescript
export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  NEW_TOKEN: {
    id: 'new-token',
    name: 'New Token',
    symbol: 'NEW',
    address: '0x...',
    decimals: 18,
    blockchain: 'Ethereum',
    network: 'ethereum',
    isNative: false,
    abi: [...ERC20_ABI]
  }
};
```

### Network Configuration

Add new networks by updating the `NETWORKS` constant:

```typescript
export const NETWORKS = {
  NEW_NETWORK: {
    id: 'new-network',
    name: 'New Network',
    blockchain: 'New Blockchain',
    rpcUrl: 'https://rpc.new-network.com',
    explorerUrl: 'https://explorer.new-network.com',
    nativeCurrency: {
      symbol: 'NEW',
      decimals: 18
    }
  }
};
```

## 🚨 Error Handling

The agent handles various error scenarios:

- **Invalid wallet addresses**: Validates address format per network
- **Network connectivity issues**: Graceful degradation with error messages
- **RPC endpoint failures**: Continues with available networks
- **Token contract errors**: Skips problematic tokens, continues with others

## 🔮 Future Enhancements

- **Real-time price feeds**: Integration with CoinGecko, CoinMarketCap APIs
- **Additional networks**: Binance Smart Chain, Avalanche, Solana
- **NFT balance support**: ERC-721 and ERC-1155 token balances
- **Portfolio analytics**: Historical balance tracking and analytics
- **DeFi integration**: LP token balances and yield farming positions

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review agent logs for error details
