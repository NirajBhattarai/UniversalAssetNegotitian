import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc, and, or, asc, sql, gte, lte } from 'drizzle-orm';

import {
  AgentCard,
  Task,
  TaskState,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  TextPart,
  Message,
  DataPart
} from "@a2a-js/sdk";
import {
  InMemoryTaskStore,
  TaskStore,
  AgentExecutor,
  RequestContext,
  ExecutionEventBus,
  DefaultRequestHandler,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";

// Load environment variables
dotenv.config();

// Database schema definitions (matching carbon-credit-marketplace)
import {
  pgTable,
  text,
  timestamp,
  boolean,
  json,
  integer,
  pgEnum,
  serial,
  decimal,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Enums
export const deviceTypeEnum = pgEnum('device_type', ['SEQUESTER']);
export const transactionTypeEnum = pgEnum('transaction_type', ['MINT', 'BURN']);
export const transactionStatusEnum = pgEnum('transaction_status', [
  'PENDING',
  'CONFIRMED',
  'FAILED',
]);

// Company Table
export const company = pgTable('company', {
  companyId: serial('company_id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  address: varchar('address', { length: 255 }),
  website: varchar('website', { length: 255 }),
  location: varchar('location', { length: 255 }),
  walletAddress: varchar('wallet_address', { length: 255 }).unique(),
});

// Company Credit Table
export const companyCredit = pgTable('company_credit', {
  creditId: serial('credit_id').primaryKey(),
  companyId: integer('company_id').notNull(),
  totalCredit: decimal('total_credit', { precision: 10, scale: 2 }).notNull(),
  currentCredit: decimal('current_credit', { precision: 10, scale: 2 }).notNull(),
  soldCredit: decimal('sold_credit', { precision: 10, scale: 2 }).notNull().default('0.00'),
  offerPrice: decimal('offer_price', { precision: 10, scale: 2 }),
});

// Database connection setup
const connectionString = process.env.CARBON_MARKETPLACE_DATABASE_URL || 
  'postgresql://postgres:password@localhost:5432/carbon_credit_iot?schema=public';

const cleanConnectionString = connectionString.replace(/\?schema=.*$/, '');
const client = postgres(cleanConnectionString, { prepare: false });
const db = drizzle(client, { schema: { company, companyCredit } });
interface Company {
  companyId: number;
  companyName: string;
  address?: string;
  website?: string;
  location?: string;
  walletAddress?: string;
}

interface CompanyCredit {
  creditId: number;
  companyId: number;
  totalCredit: string;
  currentCredit: string;
  soldCredit: string;
  offerPrice?: string;
}

interface CreditOffer {
  companyId: number;
  companyName: string;
  currentCredit: number;
  offerPrice?: number;
  totalCredit: number;
  soldCredit: number;
  walletAddress?: string;
}

// Carbon credit negotiation request
interface CarbonCreditNegotiationRequest {
  creditAmount: number;
  maxPricePerCredit?: number;
  minPricePerCredit?: number;
  preferredCompanies?: number[];
  excludeCompanies?: number[];
  paymentMethod: 'USDC' | 'USDT' | 'HBAR' | 'BANK_TRANSFER';
  requirements: {
    verificationLevel: 'basic' | 'standard' | 'premium';
    complianceChecks: string[];
    settlementMethod: 'immediate' | 'escrow' | 'conditional';
  };
}

// Carbon credit negotiation result
interface CarbonCreditNegotiationResult {
  negotiationId: string;
  status: 'success' | 'partial' | 'failed';
  totalCreditsFound: number;
  requestedCredits: number;
  bestOffers: CreditOffer[];
  averagePrice: number;
  totalCost: number;
  recommendations: string[];
  settlementDetails?: {
    paymentMethod: string;
    estimatedSettlementTime: string;
    transactionFees: number;
  };
}

// Simple store for contexts and negotiations
const contexts: Map<string, Message[]> = new Map();

class CarbonCreditNegotiationAgentExecutor implements AgentExecutor {
  private cancelledTasks = new Set<string>();

  public cancelTask = async (
    taskId: string,
    eventBus: ExecutionEventBus,
  ): Promise<void> => {
    this.cancelledTasks.add(taskId);
    console.log(`[Carbon Credit Price Agent] Cancelling task ${taskId}`);
  };

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const userMessage = requestContext.userMessage;
    const existingTask = requestContext.task;

    const taskId = existingTask?.id || uuidv4();
    const contextId = userMessage.contextId || existingTask?.contextId || uuidv4();

    console.log(`[Carbon Credit Price Agent] Processing message ${userMessage.messageId} for task ${taskId} (context: ${contextId})`);

    // Check if task was cancelled
    if (this.cancelledTasks.has(taskId)) {
      console.log(`[Carbon Credit Price Agent] Task ${taskId} was cancelled, skipping execution`);
      return;
    }

    // 1. Publish initial Task event if it's a new task
    if (!existingTask) {
      const initialTask: Task = {
        kind: 'task',
        id: taskId,
        contextId: contextId,
        status: {
          state: 'submitted',
          timestamp: new Date().toISOString(),
        },
        history: [userMessage],
        metadata: userMessage.metadata,
        artifacts: [],
      };
      eventBus.publish(initialTask);
    }

    // Extract user text from message
    const userText = userMessage.parts
      .filter(part => part.kind === 'text')
      .map(part => (part as TextPart).text)
      .join(' ');

    console.log(`[Carbon Credit Price Agent] User request: ${userText}`);

    // Store context
    if (!contexts.has(contextId)) {
      contexts.set(contextId, []);
    }
    contexts.get(contextId)!.push(userMessage);

    try {
      // Parse negotiation request from user text
      const negotiationRequest = this.parseNegotiationRequest(userText);
      
      // Process carbon credit negotiation
      await this.processCarbonCreditNegotiation(
        negotiationRequest,
        taskId,
        contextId,
        eventBus
      );

    } catch (error) {
      console.error(`[Carbon Credit Price Agent] Error processing task ${taskId}:`, error);
      
      const errorUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'failed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `Error processing carbon credit negotiation: ${error instanceof Error ? error.message : 'Unknown error'}` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(errorUpdate);
    }
  }

  private parseNegotiationRequest(userText: string): CarbonCreditNegotiationRequest {
    // Simple parsing logic - in production, use more sophisticated NLP
    const creditAmountMatch = userText.match(/(\d{1,3}(?:,\d{3})*)\s*(?:carbon\s*)?credits?/i);
    const priceMatch = userText.match(/\$?(\d+(?:\.\d+)?)\s*(?:per\s*credit|each)/i);
    const maxPriceMatch = userText.match(/max(?:imum)?\s*\$?(\d+(?:\.\d+)?)/i);
    
    // Parse credit amount, handling commas
    let creditAmount = 100; // default
    if (creditAmountMatch) {
      const amountStr = creditAmountMatch[1].replace(/,/g, ''); // Remove commas
      creditAmount = parseInt(amountStr);
    }
    
    const maxPricePerCredit = maxPriceMatch ? parseFloat(maxPriceMatch[1]) : undefined;
    const pricePerCredit = priceMatch ? parseFloat(priceMatch[1]) : undefined;

    // Determine payment method
    let paymentMethod: 'USDC' | 'USDT' | 'HBAR' | 'BANK_TRANSFER' = 'USDC';
    if (userText.toLowerCase().includes('usdt')) paymentMethod = 'USDT';
    else if (userText.toLowerCase().includes('hbar')) paymentMethod = 'HBAR';
    else if (userText.toLowerCase().includes('bank')) paymentMethod = 'BANK_TRANSFER';

    return {
      creditAmount,
      maxPricePerCredit,
      minPricePerCredit: pricePerCredit,
      paymentMethod,
      requirements: {
        verificationLevel: 'standard',
        complianceChecks: ['carbon_verification', 'company_verification'],
        settlementMethod: 'immediate'
      }
    };
  }

  private async processCarbonCreditNegotiation(
    request: CarbonCreditNegotiationRequest,
    taskId: string,
    contextId: string,
    eventBus: ExecutionEventBus
  ): Promise<void> {
    
    // Update status: Searching for credits
    const searchUpdate: TaskStatusUpdateEvent = {
      kind: 'status-update',
      taskId,
      contextId,
      status: {
        state: 'working',
        message: {
          kind: 'message',
          role: 'agent',
          messageId: uuidv4(),
          parts: [{ kind: 'text', text: `🌱 Searching for ${request.creditAmount} carbon credits in the marketplace...` }],
          taskId: taskId,
          contextId: contextId,
        },
        timestamp: new Date().toISOString(),
      },
      final: false,
    };
    eventBus.publish(searchUpdate);

    try {
      // Fetch available carbon credit offers from database
      const availableOffers = await this.fetchCarbonCreditOffers(request);
      
      // Update status: Analyzing offers
      const analyzeUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'working',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `📊 Found ${availableOffers.length} companies with available credits. Analyzing best offers...` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: false,
      };
      eventBus.publish(analyzeUpdate);

      // Filter and sort offers based on criteria
      const filteredOffers = this.filterOffers(availableOffers, request);
      const sortedOffers = this.sortOffersByPrice(filteredOffers);
      
      // Calculate negotiation result
      const result = this.calculateNegotiationResult(sortedOffers, request);
      
      // Update status: Negotiation complete
      const completeUpdate: TaskStatusUpdateEvent = {
        kind: 'status-update',
        taskId,
        contextId,
        status: {
          state: 'completed',
          message: {
            kind: 'message',
            role: 'agent',
            messageId: uuidv4(),
            parts: [{ kind: 'text', text: `✅ Negotiation complete! Found ${result.totalCreditsFound} credits at average price $${result.averagePrice.toFixed(2)} per credit.` }],
            taskId: taskId,
            contextId: contextId,
          },
          timestamp: new Date().toISOString(),
        },
        final: true,
      };
      eventBus.publish(completeUpdate);

      // Publish detailed result as artifact
      const resultArtifact: TaskArtifactUpdateEvent = {
        kind: 'artifact-update',
        taskId,
        contextId,
        artifact: {
          artifactId: uuidv4(),
          name: "Carbon Credit Negotiation Results",
          parts: [
            {
              kind: 'data',
              data: result as unknown as { [k: string]: unknown }
            }
          ]
        }
      };
      eventBus.publish(resultArtifact);

      // Add response to context
      const context = contexts.get(contextId)!;
      const responseMessage: Message = {
        kind: 'message',
        role: 'agent',
        messageId: uuidv4(),
        parts: [
          { kind: 'text', text: this.formatNegotiationResponse(result) },
          { kind: 'data', data: result as unknown as { [k: string]: unknown } }
        ],
        taskId: taskId,
        contextId: contextId,
      };
      context.push(responseMessage);

    } catch (error) {
      throw new Error(`Failed to process carbon credit negotiation: ${error}`);
    }
  }

  private async fetchCarbonCreditOffers(request: CarbonCreditNegotiationRequest): Promise<CreditOffer[]> {
    try {
      console.log(`[Carbon Credit Negotiation Agent] Fetching offers for ${request.creditAmount} credits`);
      
      // Query the database for companies with available credits
      const offers = await db
        .select({
          companyId: company.companyId,
          companyName: company.companyName,
          walletAddress: company.walletAddress,
          currentCredit: companyCredit.currentCredit,
          offerPrice: companyCredit.offerPrice,
          totalCredit: companyCredit.totalCredit,
          soldCredit: companyCredit.soldCredit,
        })
        .from(company)
        .innerJoin(companyCredit, eq(company.companyId, companyCredit.companyId))
        .where(
          and(
            gte(companyCredit.currentCredit, (request.creditAmount * 0.01).toString()), // At least 1% of requested amount
            request.maxPricePerCredit ? lte(companyCredit.offerPrice, request.maxPricePerCredit.toString()) : undefined,
            request.minPricePerCredit ? gte(companyCredit.offerPrice, request.minPricePerCredit.toString()) : undefined
          )
        )
        .orderBy(asc(companyCredit.offerPrice));

      console.log(`[Carbon Credit Negotiation Agent] Found ${offers.length} companies with available credits`);

      // Convert database results to CreditOffer format
      const creditOffers: CreditOffer[] = offers.map(offer => ({
        companyId: offer.companyId,
        companyName: offer.companyName,
        currentCredit: parseFloat(offer.currentCredit || '0'),
        offerPrice: offer.offerPrice ? parseFloat(offer.offerPrice) : undefined,
        totalCredit: parseFloat(offer.totalCredit || '0'),
        soldCredit: parseFloat(offer.soldCredit || '0'),
        walletAddress: offer.walletAddress || undefined,
      }));

      return creditOffers;
      
    } catch (error) {
      console.error('[Carbon Credit Negotiation Agent] Error fetching carbon credit offers from database:', error);
      throw new Error(`Failed to fetch carbon credit offers from database: ${error instanceof Error ? error.message : 'Database connection failed'}`);
    }
  }


  private filterOffers(offers: CreditOffer[], request: CarbonCreditNegotiationRequest): CreditOffer[] {
    return offers.filter(offer => {
      // Filter by price constraints
      if (request.maxPricePerCredit && offer.offerPrice && offer.offerPrice > request.maxPricePerCredit) {
        return false;
      }
      if (request.minPricePerCredit && offer.offerPrice && offer.offerPrice < request.minPricePerCredit) {
        return false;
      }
      
      // Filter by preferred/excluded companies
      if (request.preferredCompanies && !request.preferredCompanies.includes(offer.companyId)) {
        return false;
      }
      if (request.excludeCompanies && request.excludeCompanies.includes(offer.companyId)) {
        return false;
      }
      
      return true;
    });
  }

  private sortOffersByPrice(offers: CreditOffer[]): CreditOffer[] {
    return offers.sort((a, b) => {
      if (!a.offerPrice && !b.offerPrice) return 0;
      if (!a.offerPrice) return 1;
      if (!b.offerPrice) return -1;
      return a.offerPrice - b.offerPrice;
    });
  }

  private calculateNegotiationResult(offers: CreditOffer[], request: CarbonCreditNegotiationRequest): CarbonCreditNegotiationResult {
    const bestOffers: CreditOffer[] = [];
    let totalCreditsFound = 0;
    let totalCost = 0;
    let remainingCredits = request.creditAmount;

    // Select best offers to fulfill the request
    for (const offer of offers) {
      if (remainingCredits <= 0) break;
      
      const creditsToTake = Math.min(remainingCredits, offer.currentCredit);
      if (creditsToTake > 0 && offer.offerPrice) {
        bestOffers.push({
          ...offer,
          currentCredit: creditsToTake
        });
        
        totalCreditsFound += creditsToTake;
        totalCost += creditsToTake * offer.offerPrice;
        remainingCredits -= creditsToTake;
      }
    }

    const averagePrice = totalCreditsFound > 0 ? totalCost / totalCreditsFound : 0;
    
    const recommendations: string[] = [];
    if (totalCreditsFound < request.creditAmount) {
      recommendations.push(`Only found ${totalCreditsFound} credits out of ${request.creditAmount} requested. Consider increasing your maximum price per credit.`);
    }
    if (averagePrice > 0) {
      recommendations.push(`Average price: $${averagePrice.toFixed(2)} per credit. Best deal: $${Math.min(...bestOffers.map(o => o.offerPrice || Infinity)).toFixed(2)} per credit.`);
    }
    if (bestOffers.length > 1) {
      recommendations.push(`Diversified across ${bestOffers.length} companies for risk mitigation.`);
    }

    return {
      negotiationId: uuidv4(),
      status: totalCreditsFound >= request.creditAmount * 0.8 ? 'success' : 
              totalCreditsFound > 0 ? 'partial' : 'failed',
      totalCreditsFound,
      requestedCredits: request.creditAmount,
      bestOffers,
      averagePrice,
      totalCost,
      recommendations,
      settlementDetails: {
        paymentMethod: request.paymentMethod,
        estimatedSettlementTime: '2-4 business days',
        transactionFees: request.paymentMethod === 'BANK_TRANSFER' ? 25 : 5
      }
    };
  }

  private formatNegotiationResponse(result: CarbonCreditNegotiationResult): string {
    let response = `## Carbon Credit Negotiation Results\n\n`;
    
    response += `**Status:** ${result.status.toUpperCase()}\n`;
    response += `**Credits Found:** ${result.totalCreditsFound} / ${result.requestedCredits}\n`;
    response += `**Average Price:** $${result.averagePrice.toFixed(2)} per credit\n`;
    response += `**Total Cost:** $${result.totalCost.toFixed(2)}\n\n`;
    
    if (result.bestOffers.length > 0) {
      response += `## Best Offers:\n\n`;
      result.bestOffers.forEach((offer, index) => {
        response += `${index + 1}. **${offer.companyName}**\n`;
        response += `   - Credits: ${offer.currentCredit}\n`;
        response += `   - Price: $${offer.offerPrice?.toFixed(2)} per credit\n`;
        response += `   - Total: $${((offer.currentCredit || 0) * (offer.offerPrice || 0)).toFixed(2)}\n`;
        response += `   - Wallet: ${offer.walletAddress}\n\n`;
      });
    }
    
    if (result.recommendations.length > 0) {
      response += `## Recommendations:\n\n`;
      result.recommendations.forEach(rec => {
        response += `- ${rec}\n`;
      });
    }
    
    if (result.settlementDetails) {
      response += `\n## Settlement Details:\n`;
      response += `- Payment Method: ${result.settlementDetails.paymentMethod}\n`;
      response += `- Estimated Time: ${result.settlementDetails.estimatedSettlementTime}\n`;
      response += `- Transaction Fees: $${result.settlementDetails.transactionFees}\n`;
    }
    
    return response;
  }
}

// --- Server Setup ---

const carbonCreditNegotiationAgentCard: AgentCard = {
  name: 'Carbon Credit Negotiation Agent',
  description: 'An AI agent that negotiates carbon credit purchases by analyzing marketplace offers from the database and finding the best deals.',
  url: 'http://localhost:41251/',
  provider: {
    organization: 'Universal Asset Negotiation',
    url: 'https://github.com/universal-asset-negotiation'
  },
  version: '1.0.0',
  protocolVersion: '0.1.0',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  securitySchemes: undefined,
  security: undefined,
  defaultInputModes: ['text'],
  defaultOutputModes: ['text', 'data'],
  skills: [
    {
      id: 'carbon_credit_negotiation',
      name: 'Carbon Credit Price Negotiation',
      description: 'Finds and negotiates the best carbon credit deals from marketplace companies.',
      tags: ['carbon', 'credits', 'negotiation', 'environment', 'sustainability'],
      examples: [
        'Find 100 carbon credits at best price',
        'Buy 500 carbon credits for maximum $15 per credit',
        'Get carbon credits from sustainable companies',
        'Negotiate carbon credit purchase with USDC payment'
      ],
      inputModes: ['text'],
      outputModes: ['text', 'data'],
    },
  ],
  supportsAuthenticatedExtendedCard: false,
};

async function main() {
  // 1. Create TaskStore
  const taskStore: TaskStore = new InMemoryTaskStore();

  // 2. Create Agent Executor
  const executor: AgentExecutor = new CarbonCreditNegotiationAgentExecutor();

  // 3. Create Request Handler
  const requestHandler = new DefaultRequestHandler(
    carbonCreditNegotiationAgentCard,
    taskStore,
    executor
  );

  // 4. Create Express App
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 5. Setup A2A routes
  const appBuilder = new A2AExpressApp(requestHandler);
  appBuilder.setupRoutes(app, '');

  // 6. Add health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      agent: 'Carbon Credit Price Agent',
      timestamp: new Date().toISOString()
    });
  });

  // 7. Start server
  const port = 41251;
  app.listen(port, () => {
    console.log(`🚀 Carbon Credit Negotiation Agent running on port ${port}`);
    console.log(`📊 Agent Card available at: http://localhost:${port}/a2a/card`);
    console.log(`🔍 Health check: http://localhost:${port}/health`);
  });
}

// Start the server
main().catch(console.error);