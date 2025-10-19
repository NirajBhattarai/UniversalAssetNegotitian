/**
 * Wallet Balance Agent Demo
 * 
 * This demo showcases the multi-network wallet balance agent capabilities
 * for checking balances across Hedera, Ethereum, and Polygon networks.
 */

import { A2AClient } from '@a2a-js/sdk/client';

const WALLET_BALANCE_AGENT_URL = 'http://localhost:41252';

async function demoWalletBalanceAgent() {
  console.log('🚀 Starting Wallet Balance Agent Demo\n');

  try {
    // Connect to the wallet balance agent
    console.log('📡 Connecting to Wallet Balance Agent...');
    const client = await A2AClient.fromCardUrl(`${WALLET_BALANCE_AGENT_URL}/.well-known/agent-card.json`);
    console.log('✅ Connected to Wallet Balance Agent\n');

    // Test cases for different wallet addresses and networks
    const testCases = [
      {
        name: 'Hedera Account Balance Check',
        message: 'Check balance for Hedera account 0.0.123456',
        description: 'Testing Hedera account balance fetching'
      },
      {
        name: 'Ethereum Address Balance Check',
        message: 'Get balance for Ethereum address 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        description: 'Testing Ethereum address balance fetching'
      },
      {
        name: 'Polygon Address Balance Check',
        message: 'Show Polygon wallet balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        description: 'Testing Polygon address balance fetching'
      },
      {
        name: 'Multi-Network Balance Check',
        message: 'Check my wallet balance across all networks for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        description: 'Testing comprehensive multi-network balance check'
      },
      {
        name: 'Specific Network Check',
        message: 'Check Ethereum and Polygon balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        description: 'Testing specific network balance fetching'
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 Test Case ${i + 1}: ${testCase.name}`);
      console.log(`📝 Description: ${testCase.description}`);
      console.log(`💬 Message: ${testCase.message}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Create A2A message
        const a2aMessage = {
          messageId: `demo-${Date.now()}-${i}`,
          kind: "message" as const,
          role: "user" as const,
          parts: [
            {
              kind: "text" as const,
              text: testCase.message
            }
          ],
          contextId: `demo-context-${i}`,
        };

        // Send message and collect response
        const params = { message: a2aMessage };
        const stream = client.sendMessageStream(params);
        
        let fullResponse = '';
        let hasResponse = false;

        console.log('📤 Sending request...');
        console.log('📥 Receiving response:\n');

        for await (const event of stream) {
          if (event.kind === "status-update") {
            const statusText = (event.status.message?.parts?.[0] as any)?.text || '';
            if (statusText) {
              console.log(`🔄 Status: ${statusText}`);
              fullResponse += statusText + '\n';
              hasResponse = true;
            }
          } else if (event.kind === "artifact-update") {
            const artifactName = event.artifact.name || '';
            const artifactData = (event.artifact.parts?.[0] as any)?.data || null;
            
            if (artifactName) {
              console.log(`📄 Artifact: ${artifactName}`);
              if (artifactData) {
                console.log(`📊 Data:`, JSON.stringify(artifactData, null, 2));
              }
              hasResponse = true;
            }
          } else if (event.kind === "message") {
            const messageText = (event as any).message?.parts?.[0]?.text || '';
            if (messageText) {
              console.log(`💬 Response: ${messageText}`);
              fullResponse += messageText + '\n';
              hasResponse = true;
            }
          }
        }

        if (!hasResponse) {
          console.log('❌ No response received from agent');
        } else {
          console.log('\n✅ Test case completed successfully');
        }

        // Add delay between test cases
        if (i < testCases.length - 1) {
          console.log('\n⏳ Waiting 3 seconds before next test...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (error) {
        console.error(`❌ Error in test case ${i + 1}:`, error);
      }
    }

    console.log('\n🎉 Wallet Balance Agent Demo completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Tested Hedera account balance checking');
    console.log('✅ Tested Ethereum address balance checking');
    console.log('✅ Tested Polygon address balance checking');
    console.log('✅ Tested multi-network balance checking');
    console.log('✅ Tested specific network balance checking');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the Wallet Balance Agent is running on port 41252');
    console.log('2. Check that all dependencies are installed');
    console.log('3. Verify network connectivity');
    console.log('4. Check agent logs for any errors');
  }
}

// Additional utility function to test direct API access
async function testDirectAPI() {
  console.log('\n🔧 Testing Direct API Access...');
  
  try {
    const response = await fetch(`${WALLET_BALANCE_AGENT_URL}/api/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        networks: ['ethereum', 'polygon']
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Direct API test successful:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Direct API test failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Direct API test error:', error);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demoWalletBalanceAgent()
    .then(() => testDirectAPI())
    .then(() => {
      console.log('\n🏁 Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo failed:', error);
      process.exit(1);
    });
}
