# Universal Asset Negotiation Web UI

This is a Next.js application for the Universal Asset Negotiation platform, featuring Hedera blockchain integration and AI-powered chat assistance.

## Features

- **Asset Negotiation Interface**: Multi-agent A2A protocol platform
- **Hedera AI Assistant**: Blockchain operations and queries powered by AI
- **Real-time Chat**: Interactive chat interface for Hedera operations

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Hedera account credentials
- Groq API key (for AI functionality)

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Hedera Configuration
HEDERA_ACCOUNT_ID=your_account_id_here
HEDERA_PRIVATE_KEY=your_private_key_here

# AI Provider Configuration
GROQ_API_KEY=your_groq_api_key_here
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

The application uses a client-server architecture to handle Hedera blockchain operations:

- **Client-side**: React components that communicate with API routes
- **Server-side**: API routes (`/api/hedera/chat`) that handle Hedera SDK operations
- **AI Integration**: LangChain with Groq for intelligent blockchain assistance

## API Endpoints

- `GET /api/hedera/chat` - Check Hedera connection status
- `POST /api/hedera/chat` - Send message to Hedera AI assistant

## Troubleshooting

### Common Issues

1. **Module not found errors**: Ensure all dependencies are installed with `npm install`
2. **Hedera connection errors**: Verify your environment variables are set correctly
3. **AI provider errors**: Check that your Groq API key is valid and has sufficient credits

### Build Issues

If you encounter build errors related to Node.js modules in the browser:

1. The application is configured to handle server-side dependencies properly
2. Hedera SDK operations are isolated to API routes
3. Client-side code only communicates via HTTP requests

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Hedera Documentation](https://docs.hedera.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [Groq API Documentation](https://console.groq.com/docs)
