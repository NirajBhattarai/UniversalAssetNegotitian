import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Wallet Balance Tool for checking balances across multiple blockchain networks
 * This tool connects to the wallet balance agent service to get comprehensive balance information
 */
export const createWalletBalanceTool = () => {
  return tool(
    async ({ walletAddress, network = 'all' }: { walletAddress: string; network?: string }): Promise<string> => {
      /**
       * Check wallet balance across multiple blockchain networks
       * 
       * This tool connects to the wallet balance agent service running on localhost:41252
       * to retrieve comprehensive balance information across multiple networks.
       * 
       * Supported networks: Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche, Hedera
       */

      try {
        // Validate wallet address format
        if (!walletAddress) {
          return '❌ **Error:** Wallet address is required. Please provide a valid wallet address (e.g., 0x... or 0.0.xxx).';
        }

        // Check if it's a valid address format
        const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;
        const hederaAddressPattern = /^0\.0\.\d+$/;
        
        if (!ethAddressPattern.test(walletAddress) && !hederaAddressPattern.test(walletAddress)) {
          return '❌ **Error:** Invalid wallet address format. Please provide a valid Ethereum address (0x...) or Hedera account ID (0.0.xxx).';
        }

        console.log(`Checking wallet balance for: ${walletAddress} on network: ${network}`);

        // Call the wallet balance agent service
        const response = await fetch('http://localhost:41252/api/balance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: walletAddress,
            network: network,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Format the response nicely
          const networks = data.networks || {};
          const totalValue = data.totalUsdValue || 0;
          
          let result = `💰 **Multi-Network Wallet Balance Report**\n\n`;
          result += `**Wallet Address:** \`${walletAddress}\`\n`;
          result += `**Total Portfolio Value:** $${totalValue.toFixed(2)}\n`;
          result += `**Networks Checked:** ${Object.keys(networks).length}\n\n`;
          
          result += `**Network Breakdown:**\n`;
          
          // Sort networks by USD value (descending)
          const sortedNetworks = Object.entries(networks)
            .sort(([,a], [,b]) => ((b as any).usdValue || 0) - ((a as any).usdValue || 0));
          
          for (const [networkName, networkData] of sortedNetworks) {
            const data = networkData as any;
            const usdValue = data.usdValue || 0;
            const nativeBalance = data.nativeBalance || '0';
            const nativeSymbol = data.nativeSymbol || 'Unknown';
            
            result += `\n**${networkName.toUpperCase()}**\n`;
            result += `- Native Balance: ${nativeBalance} ${nativeSymbol}\n`;
            result += `- USD Value: $${usdValue.toFixed(2)}\n`;
            
            // Add token balances if available
            if (data.tokens && data.tokens.length > 0) {
              result += `- Tokens: ${data.tokens.length} tokens\n`;
              // Show top 3 tokens by value
              const topTokens = data.tokens
                .sort((a: any, b: any) => (b.usdValue || 0) - (a.usdValue || 0))
                .slice(0, 3);
              
              for (const token of topTokens) {
                result += `  • ${token.symbol}: ${token.balance} ($${token.usdValue?.toFixed(2) || '0.00'})\n`;
              }
            }
          }
          
          result += `\n**Last Updated:** ${new Date().toLocaleString()}\n`;
          result += `**Data Source:** Multi-Network Wallet Balance Agent`;
          
          return result;
        } else {
          return `⚠️ **Wallet Balance Service Error**\n\nFailed to retrieve balance information.\n\n**Error:** ${data.error || 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure the wallet balance agent service is running on localhost:41252\n- Verify the wallet address format is correct\n- Check if the wallet has any activity on the requested networks`;
        }
      } catch (error) {
        console.error('Wallet balance tool error:', error);
        return `❌ **Connection Error**\n\nFailed to connect to the wallet balance agent service.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure the wallet balance agent service is running on localhost:41252\n- Check your network connection\n- Verify the service endpoint is accessible`;
      }
    },
    {
      name: 'wallet_balance_checker',
      description: `Check wallet balance across multiple blockchain networks including Ethereum, Polygon, BSC, Arbitrum, Optimism, Avalanche, and Hedera.

This tool provides comprehensive balance information including:
- Total portfolio value in USD
- Native token balances for each network
- Token holdings and their USD values
- Network-specific breakdowns

Use this tool when users ask about:
- Wallet balances
- Portfolio values
- Token holdings
- Multi-network balance checks
- Address balance queries

Examples:
- "Check balance for 0x1234..."
- "What's my wallet balance?"
- "Show me my portfolio value"
- "Check balance for account 0.0.123456"`,
      schema: z.object({
        walletAddress: z
          .string()
          .describe('The wallet address to check balance for (Ethereum: 0x... or Hedera: 0.0.xxx)'),
        network: z
          .string()
          .optional()
          .describe('Specific network to check (default: "all" for all networks)')
          .default('all'),
      }),
    }
  );
};
