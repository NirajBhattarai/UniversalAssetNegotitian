import fetch from 'node-fetch';

const PAYMENT_AGENT_URL = 'http://localhost:41245';

interface MockPaymentAgent {
  processCarbonCreditPayment(request: string): Promise<any>;
}

class MockCarbonCreditPaymentAgent implements MockPaymentAgent {
  private paymentMethods = [
    { id: 'hbar', name: 'Hedera Token (HBAR)', rate: 0.05, blockchain: 'Hedera' },
    { id: 'usdc', name: 'USD Coin (USDC)', rate: 1.0, blockchain: 'Ethereum/Polygon' },
    { id: 'usdt', name: 'Tether (USDT)', rate: 1.0, blockchain: 'Ethereum/Tron' }
  ];

  async processCarbonCreditPayment(request: string): Promise<any> {
    console.log(`🌱 [Carbon Credit Payment Agent] Processing: "${request}"`);
    
    // Parse carbon credit payment details
    const creditMatch = request.match(/(\d+)\s*carbon\s*credits?/i);
    const costMatch = request.match(/\$(\d+(?:\.\d{2})?)/);
    const companyMatch = request.match(/company\s*(\d+)/i);
    
    const creditAmount = creditMatch ? parseInt(creditMatch[1]) : 1000;
    const totalCost = costMatch ? parseFloat(costMatch[1]) : creditAmount * 15;
    const companyId = companyMatch ? parseInt(companyMatch[1]) : 1;
    const pricePerCredit = totalCost / creditAmount;
    
    // Select payment method
    const lowerText = request.toLowerCase();
    let selectedMethod = this.paymentMethods[1]; // Default to USDC
    
    if (lowerText.includes('hbar') || lowerText.includes('hedera')) {
      selectedMethod = this.paymentMethods[0];
    } else if (lowerText.includes('usdt')) {
      selectedMethod = this.paymentMethods[2];
    }
    
    // Simulate payment processing steps
    const steps = [
      `🔍 Analyzing carbon credit payment for ${creditAmount} credits...`,
      `💱 Converting $${totalCost} to ${selectedMethod.name}...`,
      `🔐 Validating payment credentials and company availability...`,
      `⛓️ Executing blockchain transaction on ${selectedMethod.blockchain}...`,
      `📊 Updating carbon credit database for company ${companyId}...`,
      `✅ Carbon credit payment settled successfully!`
    ];
    
    // Simulate processing time
    for (const step of steps) {
      console.log(`   ${step}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Generate payment result
    const paymentResult = {
      success: true,
      transactionId: `tx_${Math.random().toString(36).substr(2, 9)}`,
      paymentId: `pay_${Math.random().toString(36).substr(2, 9)}`,
      creditsPurchased: creditAmount,
      totalCost: totalCost,
      paymentMethod: selectedMethod.name,
      companyId: companyId,
      companyName: `Company ${companyId}`,
      blockchainDetails: {
        network: selectedMethod.blockchain,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        gasUsed: Math.floor(Math.random() * 1000) + 500,
        status: 'confirmed'
      }
    };
    
    return paymentResult;
  }
}

async function testPaymentAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PAYMENT_AGENT_URL}/.well-known/agent-card.json`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function runDemo(): Promise<void> {
  console.log('💳 Carbon Credit Payment Agent Demo\n');
  console.log('=' .repeat(50));

  // Test agent health
  const isHealthy = await testPaymentAgentHealth();
  if (!isHealthy) {
    console.log('❌ Payment agent is not running. Please start the agent first:');
    console.log('   npm run agents:payment-agent');
    console.log('\n🔄 Running mock demo instead...\n');
  } else {
    console.log('✅ Payment agent is running!');
    console.log('\n📊 Running demo requests...\n');
  }

  const mockAgent = new MockCarbonCreditPaymentAgent();
  
  const demoRequests = [
    "Pay for 1000 carbon credits from company 1 for $15000 using USDC",
    "Process carbon credit payment of 500 credits using HBAR tokens",
    "Settle carbon credit purchase with USDT for 2000 credits",
    "Complete payment for 10000 carbon credits using Hedera tokens",
    "Pay for 2500 carbon credits from company 2 for $37500 using USDC",
    "Process payment for 5000 carbon credits using USDT tokens"
  ];

  for (let i = 0; i < demoRequests.length; i++) {
    const request = demoRequests[i];
    console.log(`${i + 1}. ${request}`);
    
    try {
      const result = await mockAgent.processCarbonCreditPayment(request);
      
      console.log(`   ✅ Payment completed successfully!`);
      console.log(`   📋 Payment Details:`);
      console.log(`   🌿 Credits Purchased: ${result.creditsPurchased} credits`);
      console.log(`   🏢 Company: ${result.companyName}`);
      console.log(`   💰 Total Cost: $${result.totalCost} USD`);
      console.log(`   💱 Payment Method: ${result.paymentMethod}`);
      console.log(`   🔄 Converted Amount: ${(result.totalCost / (result.paymentMethod.includes('HBAR') ? 0.05 : 1)).toFixed(2)} ${result.paymentMethod.includes('HBAR') ? 'HBAR' : result.paymentMethod.includes('USDC') ? 'USDC' : 'USDT'}`);
      console.log(`   ⛓️ Blockchain: ${result.blockchainDetails.network}`);
      console.log(`   🔗 Transaction Hash: ${result.blockchainDetails.transactionHash}`);
      console.log(`   ⛽ Gas Used: ${result.blockchainDetails.gasUsed}`);
      console.log(`   ✅ Status: ${result.blockchainDetails.status}`);
      console.log(`   🆔 Transaction ID: ${result.transactionId}`);
      
    } catch (error) {
      console.log(`   ❌ Payment failed: ${error}`);
    }
    
    console.log('   ' + '-'.repeat(50));
  }

  console.log('\n🎉 Demo completed!');
  console.log('\nTo interact with the payment agent manually:');
  console.log(`   Agent Card: ${PAYMENT_AGENT_URL}/.well-known/agent-card.json`);
  console.log('\n💡 To start the real payment agent: npm run agents:payment-agent');
}

// Run the demo
runDemo().catch(console.error);
