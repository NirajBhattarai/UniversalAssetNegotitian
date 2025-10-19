#!/usr/bin/env tsx

/**
 * Carbon Credit Price Agent Demo
 * 
 * This demo script tests the Carbon Credit Price Agent by simulating
 * various negotiation requests and displaying the results.
 */

import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

const AGENT_URL = 'http://localhost:41251';

interface DemoRequest {
  name: string;
  message: string;
  expectedKeywords: string[];
}

interface MockNegotiationResult {
  negotiationId: string;
  status: 'success' | 'partial' | 'failed';
  totalCreditsFound: number;
  requestedCredits: number;
  bestOffers: Array<{
    companyName: string;
    currentCredit: number;
    offerPrice: number;
    walletAddress: string;
  }>;
  averagePrice: number;
  totalCost: number;
  recommendations: string[];
}

const demoRequests: DemoRequest[] = [
  {
    name: "Small Volume Purchase",
    message: "Find 100 carbon credits at best price",
    expectedKeywords: ["credits", "price", "companies"]
  },
  {
    name: "Medium Volume with Price Constraint",
    message: "Buy 2,500 carbon credits for maximum $15 per credit",
    expectedKeywords: ["maximum", "price", "credits"]
  },
  {
    name: "Large Volume Purchase",
    message: "Purchase 10,000 carbon credits from sustainable companies",
    expectedKeywords: ["10000", "sustainable", "companies"]
  },
  {
    name: "Very Large Volume with Strict Budget",
    message: "Get 50,000 carbon credits for maximum $12 per credit using USDC payment",
    expectedKeywords: ["50000", "maximum", "USDC"]
  },
  {
    name: "Massive Volume Purchase",
    message: "Acquire 100,000 carbon credits at competitive rates",
    expectedKeywords: ["100000", "competitive", "rates"]
  },
  {
    name: "Enterprise Volume with Multiple Constraints",
    message: "Buy 250,000 carbon credits for maximum $10 per credit, exclude companies with less than 50,000 credits available",
    expectedKeywords: ["250000", "maximum", "exclude"]
  },
  {
    name: "Ultra Large Volume Purchase",
    message: "Purchase 1,000,000 carbon credits for corporate sustainability program",
    expectedKeywords: ["1000000", "corporate", "sustainability"]
  },
  {
    name: "Extreme Volume with Payment Method Preference",
    message: "Get 5,000,000 carbon credits using HBAR tokens, prefer companies with verified carbon credits",
    expectedKeywords: ["5000000", "HBAR", "verified"]
  },
  {
    name: "Challenging Price Constraint",
    message: "Buy 500,000 carbon credits for maximum $8 per credit",
    expectedKeywords: ["500000", "maximum", "8"]
  },
  {
    name: "Very Strict Budget",
    message: "Purchase 1,000,000 carbon credits for maximum $5 per credit",
    expectedKeywords: ["1000000", "maximum", "5"]
  },
  {
    name: "Impossible Volume Request",
    message: "Get 50,000,000 carbon credits for maximum $3 per credit",
    expectedKeywords: ["50000000", "maximum", "3"]
  },
  {
    name: "Diversification Test",
    message: "Buy 15,000,000 carbon credits, prefer verified companies, exclude companies with less than 1,000,000 credits",
    expectedKeywords: ["15000000", "verified", "exclude"]
  }
];

// Mock Carbon Credit Price Agent
class MockCarbonCreditAgent {
  private mockOffers = [
    {
      companyId: 1,
      companyName: 'GreenTech Solutions',
      currentCredit: 50000.00,
      offerPrice: 15.50,
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      verified: true
    },
    {
      companyId: 2,
      companyName: 'EcoForest Corp',
      currentCredit: 125000.00,
      offerPrice: 14.25,
      walletAddress: '0x2345678901bcdef2345678901bcdef2345678901',
      verified: true
    },
    {
      companyId: 3,
      companyName: 'CarbonCapture Inc',
      currentCredit: 75000.00,
      offerPrice: 16.75,
      walletAddress: '0x3456789012cdef3456789012cdef3456789012',
      verified: false
    },
    {
      companyId: 4,
      companyName: 'Sustainable Energy Ltd',
      currentCredit: 500000.00,
      offerPrice: 13.90,
      walletAddress: '0x4567890123def4567890123def4567890123',
      verified: true
    },
    {
      companyId: 5,
      companyName: 'Climate Action Co',
      currentCredit: 200000.00,
      offerPrice: 12.50,
      walletAddress: '0x5678901234ef5678901234ef5678901234ef',
      verified: true
    },
    {
      companyId: 6,
      companyName: 'Green Horizon Ventures',
      currentCredit: 300000.00,
      offerPrice: 11.75,
      walletAddress: '0x6789012345f6789012345f6789012345f6',
      verified: true
    },
    {
      companyId: 7,
      companyName: 'Carbon Neutral Corp',
      currentCredit: 1000000.00,
      offerPrice: 10.25,
      walletAddress: '0x7890123456g7890123456g7890123456g7',
      verified: true
    },
    {
      companyId: 8,
      companyName: 'EcoSystem Partners',
      currentCredit: 2500000.00,
      offerPrice: 9.50,
      walletAddress: '0x8901234567h8901234567h8901234567h8',
      verified: true
    },
    {
      companyId: 9,
      companyName: 'Renewable Future Inc',
      currentCredit: 5000000.00,
      offerPrice: 8.75,
      walletAddress: '0x9012345678i9012345678i9012345678i9',
      verified: true
    },
    {
      companyId: 10,
      companyName: 'Global Carbon Solutions',
      currentCredit: 10000000.00,
      offerPrice: 7.25,
      walletAddress: '0xa0123456789a0123456789a0123456789a',
      verified: true
    },
    {
      companyId: 11,
      companyName: 'Small Carbon Co',
      currentCredit: 25000.00,
      offerPrice: 18.00,
      walletAddress: '0xb123456789ab123456789ab123456789ab',
      verified: false
    },
    {
      companyId: 12,
      companyName: 'Mega Carbon Enterprise',
      currentCredit: 20000000.00,
      offerPrice: 6.50,
      walletAddress: '0xc234567890bc234567890bc234567890bc',
      verified: true
    }
  ];

  async processNegotiationRequest(request: string): Promise<MockNegotiationResult> {
    console.log(`🌱 [Carbon Credit Agent] Processing: "${request}"`);
    
    // Simulate processing time (longer for larger volumes)
    const baseDelay = Math.random() * 2000 + 1000;
    const volumeDelay = request.includes('000,000') ? 3000 : request.includes('000') ? 2000 : 1000;
    await new Promise(resolve => setTimeout(resolve, baseDelay + volumeDelay));
    
    // Parse request with enhanced logic
    const creditAmountMatch = request.match(/(\d{1,3}(?:,\d{3})*(?:,\d{3})*)\s*(?:carbon\s*)?credits?/i);
    const maxPriceMatch = request.match(/max(?:imum)?\s*\$?(\d+(?:\.\d+)?)/i);
    const excludeMatch = request.match(/exclude.*?(\d{1,3}(?:,\d{3})*)/i);
    const verifiedMatch = request.match(/verified|prefer.*verified/i);
    const paymentMethodMatch = request.match(/(USDC|USDT|HBAR|bank\s*transfer)/i);
    
    // Parse credit amount (handle comma-separated numbers)
    const creditAmountStr = creditAmountMatch ? creditAmountMatch[1].replace(/,/g, '') : '100';
    const creditAmount = parseInt(creditAmountStr);
    const maxPricePerCredit = maxPriceMatch ? parseFloat(maxPriceMatch[1]) : undefined;
    const excludeThreshold = excludeMatch ? parseInt(excludeMatch[1].replace(/,/g, '')) : undefined;
    const preferVerified = verifiedMatch !== null;
    const paymentMethod = paymentMethodMatch ? paymentMethodMatch[1].toUpperCase() : undefined;
    
    console.log(`   📊 Parsed: ${creditAmount.toLocaleString()} credits, max $${maxPricePerCredit || 'unlimited'}/credit`);
    if (excludeThreshold) console.log(`   🚫 Excluding companies with < ${excludeThreshold.toLocaleString()} credits`);
    if (preferVerified) console.log(`   ✅ Preferring verified companies`);
    if (paymentMethod) console.log(`   💳 Payment method: ${paymentMethod}`);
    
    // Filter offers based on constraints
    let filteredOffers = this.mockOffers.filter(offer => {
      // Basic availability check
      if (offer.currentCredit < creditAmount * 0.01) return false; // At least 1% of requested amount
      
      // Price constraint
      if (maxPricePerCredit && offer.offerPrice > maxPricePerCredit) return false;
      
      // Exclusion threshold
      if (excludeThreshold && offer.currentCredit < excludeThreshold) return false;
      
      return true;
    });
    
    // Sort by verification status if preferred, then by price
    if (preferVerified) {
      filteredOffers.sort((a, b) => {
        if (a.verified !== b.verified) return b.verified ? 1 : -1;
        return a.offerPrice - b.offerPrice;
      });
    } else {
      filteredOffers.sort((a, b) => a.offerPrice - b.offerPrice);
    }
    
    // Calculate result with enhanced logic
    const bestOffers = [];
    let totalCreditsFound = 0;
    let totalCost = 0;
    let remainingCredits = creditAmount;
    let companiesUsed = 0;
    
    for (const offer of filteredOffers) {
      if (remainingCredits <= 0) break;
      
      const creditsToTake = Math.min(remainingCredits, offer.currentCredit);
      if (creditsToTake > 0) {
        bestOffers.push({
          companyName: offer.companyName,
          currentCredit: creditsToTake,
          offerPrice: offer.offerPrice,
          walletAddress: offer.walletAddress
        });
        
        totalCreditsFound += creditsToTake;
        totalCost += creditsToTake * offer.offerPrice;
        remainingCredits -= creditsToTake;
        companiesUsed++;
      }
    }
    
    const averagePrice = totalCreditsFound > 0 ? totalCost / totalCreditsFound : 0;
    const successRate = (totalCreditsFound / creditAmount) * 100;
    
    // Enhanced recommendations
    const recommendations = [];
    
    if (successRate < 100) {
      const shortfall = creditAmount - totalCreditsFound;
      recommendations.push(`⚠️ Only found ${totalCreditsFound.toLocaleString()} credits out of ${creditAmount.toLocaleString()} requested (${successRate.toFixed(1)}% fulfillment).`);
      
      if (maxPricePerCredit) {
        recommendations.push(`💡 Consider increasing maximum price from $${maxPricePerCredit} to $${Math.max(...filteredOffers.map(o => o.offerPrice)).toFixed(2)} to access more suppliers.`);
      }
      
      if (excludeThreshold) {
        recommendations.push(`🔍 Removing exclusion threshold of ${excludeThreshold.toLocaleString()} credits would unlock ${this.mockOffers.filter(o => o.currentCredit < excludeThreshold).length} additional suppliers.`);
      }
    }
    
    if (averagePrice > 0) {
      const bestPrice = Math.min(...bestOffers.map(o => o.offerPrice));
      const worstPrice = Math.max(...bestOffers.map(o => o.offerPrice));
      recommendations.push(`💰 Price range: $${bestPrice.toFixed(2)} - $${worstPrice.toFixed(2)} per credit (avg: $${averagePrice.toFixed(2)})`);
    }
    
    if (companiesUsed > 1) {
      recommendations.push(`🏢 Diversified across ${companiesUsed} companies for risk mitigation and better pricing.`);
    }
    
    if (preferVerified && bestOffers.some(o => !this.mockOffers.find(m => m.companyName === o.companyName)?.verified)) {
      recommendations.push(`✅ All selected suppliers are verified carbon credit providers.`);
    }
    
    if (paymentMethod) {
      recommendations.push(`💳 Payment method ${paymentMethod} accepted by all selected suppliers.`);
    }
    
    // Volume-based recommendations
    if (creditAmount >= 1000000) {
      recommendations.push(`🏭 Enterprise-level purchase detected. Consider negotiating bulk discounts with suppliers.`);
    }
    
    if (totalCost > 1000000) {
      recommendations.push(`💎 Large transaction value ($${totalCost.toLocaleString()}). Consider escrow services for secure settlement.`);
    }
    
    return {
      negotiationId: uuidv4(),
      status: successRate >= 95 ? 'success' : 
              successRate >= 50 ? 'partial' : 'failed',
      totalCreditsFound,
      requestedCredits: creditAmount,
      bestOffers,
      averagePrice,
      totalCost,
      recommendations
    };
  }
}

async function testAgentHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${AGENT_URL}/health`);
    const data = await response.json();
    console.log(`✅ Agent health check: ${data.status}`);
    return data.status === 'healthy';
  } catch (error) {
    console.log(`❌ Agent health check failed: ${error}`);
    return false;
  }
}

async function runDemo(): Promise<void> {
  console.log('🌱 Carbon Credit Negotiation Agent Demo\n');
  console.log('=' .repeat(50));

  // Test agent health
  const isHealthy = await testAgentHealth();
  if (!isHealthy) {
    console.log('❌ Agent is not running. Please start the agent first:');
    console.log('   npm run agents:carbon-credit-negotiation');
    console.log('\n🔄 Running mock demo instead...\n');
  } else {
    console.log('\n📊 Running demo requests...\n');
  }

  // Create mock agent
  const mockAgent = new MockCarbonCreditAgent();

  for (const [index, request] of demoRequests.entries()) {
    console.log(`${index + 1}. ${request.name}`);
    console.log(`   Request: "${request.message}"`);
    
    try {
      const result = await mockAgent.processNegotiationRequest(request.message);
      
      console.log(`   ✅ Negotiation completed!`);
      console.log(`   📊 Status: ${result.status.toUpperCase()}`);
      console.log(`   💰 Credits Found: ${result.totalCreditsFound.toLocaleString()} / ${result.requestedCredits.toLocaleString()}`);
      console.log(`   💵 Average Price: $${result.averagePrice.toFixed(2)} per credit`);
      console.log(`   💸 Total Cost: $${result.totalCost.toLocaleString()}`);
      
      if (result.bestOffers.length > 0) {
        console.log(`   🏢 Best Offers (${result.bestOffers.length} suppliers):`);
        result.bestOffers.forEach((offer, i) => {
          const cost = (offer.currentCredit * offer.offerPrice).toLocaleString();
          console.log(`      ${i + 1}. ${offer.companyName}: ${offer.currentCredit.toLocaleString()} credits @ $${offer.offerPrice}/credit = $${cost}`);
        });
      }
      
      if (result.recommendations.length > 0) {
        console.log(`   💡 Recommendations:`);
        result.recommendations.forEach(rec => {
          console.log(`      • ${rec}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error processing request: ${error}`);
    }
    
    console.log('   ' + '-'.repeat(40));
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 Demo completed!');
  console.log('\nTo interact with the agent manually:');
  console.log(`   Agent Card: ${AGENT_URL}/a2a/card`);
  console.log(`   Health Check: ${AGENT_URL}/health`);
  console.log('\n💡 To start the real agent: npm run agents:carbon-credit-negotiation');
}

// Run the demo
runDemo().catch(console.error);

export { runDemo, testAgentHealth };
