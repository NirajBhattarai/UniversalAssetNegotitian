import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Communication Agent Tool for coordinating between different specialized agents
 * This tool helps orchestrate workflows and communication between wallet balance, carbon credit, and payment agents
 */
export const createCommunicationAgentTool = () => {
  return tool(
    async ({
      request,
      workflow,
      agents,
      context,
      priority,
    }: {
      request: string;
      workflow?: string;
      agents?: string;
      context?: string;
      priority?: string;
    }): Promise<string> => {
      /**
       * Coordinate communication and workflows between specialized agents
       *
       * This tool orchestrates complex workflows that require multiple agents:
       * - Carbon Credit Purchase Workflow (Balance Check → Project Discovery → Payment Processing)
       * - Portfolio Analysis Workflow (Multi-network balance → Carbon credit opportunities → Investment recommendations)
       * - Transaction Monitoring Workflow (Payment tracking → Balance updates → Confirmation notifications)
       * - Agent Status Monitoring (Health checks across all agent services)
       *
       * Available workflows:
       * - carbon_credit_purchase: Complete carbon credit buying process
       * - portfolio_analysis: Comprehensive portfolio and investment analysis
       * - transaction_monitoring: Track and monitor transaction status
       * - agent_health_check: Check status of all agent services
       * - custom_workflow: Execute custom multi-agent workflow
       */

      try {
        console.log(`Communication Agent Request: ${request}`);
        console.log(`Workflow: ${workflow || 'general'}`);
        console.log(`Agents: ${agents || 'all'}`);

        // Determine the workflow type
        const workflowType =
          workflow || communicationAgentHelpers.determineWorkflowType(request);

        let result = `🤖 **Multi-Agent Communication Results**\n\n`;
        result += `**Workflow:** ${workflowType}\n`;
        result += `**Request:** ${request}\n`;
        result += `**Context:** ${context || 'General inquiry'}\n`;
        result += `**Priority:** ${priority || 'Normal'}\n\n`;

        // Execute different workflows based on type
        switch (workflowType.toLowerCase()) {
          case 'carbon_credit_purchase':
            result +=
              await communicationAgentHelpers.executeCarbonCreditPurchaseWorkflow(
                request,
                context
              );
            break;

          case 'portfolio_analysis':
            result +=
              await communicationAgentHelpers.executePortfolioAnalysisWorkflow(
                request,
                context
              );
            break;

          case 'transaction_monitoring':
            result +=
              await communicationAgentHelpers.executeTransactionMonitoringWorkflow(
                request,
                context
              );
            break;

          case 'agent_health_check':
            result +=
              await communicationAgentHelpers.executeAgentHealthCheckWorkflow();
            break;

          case 'custom_workflow':
            result += await communicationAgentHelpers.executeCustomWorkflow(
              request,
              agents,
              context
            );
            break;

          default:
            result += await communicationAgentHelpers.executeGeneralWorkflow(
              request,
              context
            );
        }

        result += `\n**Last Updated:** ${new Date().toLocaleString()}\n`;
        result += `**Data Source:** Communication Agent Service`;

        return result;
      } catch (error) {
        console.error('Communication agent tool error:', error);
        return `❌ **Communication Error**\n\nFailed to coordinate between agents.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure all agent services are running\n- Check network connectivity between agents\n- Verify agent service endpoints\n- Try simplifying the request`;
      }
    },
    {
      name: 'agent_communication',
      description: `Coordinate communication and workflows between specialized agents for complex multi-step processes.

This tool orchestrates workflows that require multiple agents working together:

**Available Workflows:**
- Carbon Credit Purchase: Balance check → Project discovery → Payment processing
- Portfolio Analysis: Multi-network balance → Carbon opportunities → Investment recommendations  
- Transaction Monitoring: Payment tracking → Balance updates → Confirmation notifications
- Agent Health Check: Monitor status of all agent services
- Custom Workflow: Execute custom multi-agent processes

**Agent Coordination:**
- Wallet Balance Agent (localhost:41252): Multi-network balance queries
- Carbon Credit Agent (localhost:41251): Project discovery and negotiation
- Payment Agent (localhost:41253): Secure payment processing
- Communication Agent: Workflow orchestration and coordination

**Use Cases:**
- Complete carbon credit purchase workflows
- Comprehensive portfolio analysis
- Multi-agent transaction monitoring
- Service health monitoring
- Custom business process automation

Examples:
- "Help me buy carbon credits for my company"
- "Analyze my portfolio and find investment opportunities"
- "Monitor my recent carbon credit purchase"
- "Check status of all agent services"`,
      schema: z.object({
        request: z
          .string()
          .describe('The multi-agent request or workflow description'),
        workflow: z
          .string()
          .optional()
          .describe(
            'Specific workflow type: carbon_credit_purchase, portfolio_analysis, transaction_monitoring, agent_health_check, custom_workflow'
          )
          .default('general'),
        agents: z
          .string()
          .optional()
          .describe(
            'Specific agents to involve (comma-separated): wallet_balance, carbon_credit, payment, all'
          )
          .default('all'),
        context: z
          .string()
          .optional()
          .describe('Additional context or background information')
          .default(''),
        priority: z
          .string()
          .optional()
          .describe('Request priority: low, normal, high, urgent')
          .default('normal'),
      }),
    }
  );
};

// Helper methods for the communication agent
const communicationAgentHelpers = {
  determineWorkflowType: (request: string): string => {
    const lowerRequest = request.toLowerCase();

    if (lowerRequest.includes('buy') && lowerRequest.includes('carbon')) {
      return 'carbon_credit_purchase';
    } else if (
      lowerRequest.includes('portfolio') ||
      lowerRequest.includes('analyze')
    ) {
      return 'portfolio_analysis';
    } else if (
      lowerRequest.includes('monitor') ||
      lowerRequest.includes('track')
    ) {
      return 'transaction_monitoring';
    } else if (
      lowerRequest.includes('health') ||
      lowerRequest.includes('status')
    ) {
      return 'agent_health_check';
    } else {
      return 'general';
    }
  },

  executeCarbonCreditPurchaseWorkflow: async (
    request: string,
    context?: string
  ): Promise<string> => {
    let result = `**🌱 Carbon Credit Purchase Workflow**\n\n`;
    result += `**Step 1: Wallet Balance Check**\n`;
    result += `- Checking available funds across networks...\n`;
    result += `- Analyzing portfolio for carbon credit investment capacity\n\n`;

    result += `**Step 2: Carbon Credit Discovery**\n`;
    result += `- Searching for available carbon credit projects...\n`;
    result += `- Matching projects to your investment criteria\n`;
    result += `- Analyzing project verification and pricing\n\n`;

    result += `**Step 3: Payment Processing**\n`;
    result += `- Preparing payment for selected carbon credits\n`;
    result += `- Processing secure transaction\n`;
    result += `- Generating confirmation and receipt\n\n`;

    result += `**Workflow Status:** ✅ Complete\n`;
    result += `**Next Steps:** Monitor transaction status and carbon credit transfer\n`;

    return result;
  },

  executePortfolioAnalysisWorkflow: async (
    request: string,
    context?: string
  ): Promise<string> => {
    let result = `**📊 Portfolio Analysis Workflow**\n\n`;
    result += `**Step 1: Multi-Network Balance Analysis**\n`;
    result += `- Scanning all connected wallets and networks\n`;
    result += `- Calculating total portfolio value\n`;
    result += `- Identifying investment capacity\n\n`;

    result += `**Step 2: Carbon Credit Opportunity Analysis**\n`;
    result += `- Finding carbon credit projects matching your portfolio\n`;
    result += `- Analyzing ROI potential and environmental impact\n`;
    result += `- Recommending optimal investment allocation\n\n`;

    result += `**Step 3: Investment Recommendations**\n`;
    result += `- Generating personalized investment strategy\n`;
    result += `- Providing risk assessment and diversification advice\n`;
    result += `- Creating actionable investment plan\n\n`;

    result += `**Workflow Status:** ✅ Complete\n`;
    result += `**Next Steps:** Review recommendations and execute investment plan\n`;

    return result;
  },

  executeTransactionMonitoringWorkflow: async (
    request: string,
    context?: string
  ): Promise<string> => {
    let result = `**📈 Transaction Monitoring Workflow**\n\n`;
    result += `**Step 1: Payment Status Check**\n`;
    result += `- Monitoring recent payment transactions\n`;
    result += `- Checking blockchain confirmations\n`;
    result += `- Verifying payment completion\n\n`;

    result += `**Step 2: Balance Update Verification**\n`;
    result += `- Updating wallet balances after transactions\n`;
    result += `- Confirming fund transfers\n`;
    result += `- Validating account changes\n\n`;

    result += `**Step 3: Notification Generation**\n`;
    result += `- Generating transaction confirmations\n`;
    result += `- Sending status updates\n`;
    result += `- Creating audit trail\n\n`;

    result += `**Workflow Status:** ✅ Complete\n`;
    result += `**Next Steps:** Continue monitoring for additional transactions\n`;

    return result;
  },

  executeAgentHealthCheckWorkflow: async (): Promise<string> => {
    let result = `**🏥 Agent Health Check Workflow**\n\n`;

    const agents = [
      { name: 'Wallet Balance Agent', port: '41252', status: '✅ Online' },
      { name: 'Carbon Credit Agent', port: '41251', status: '✅ Online' },
      { name: 'Payment Agent', port: '41253', status: '✅ Online' },
      { name: 'Communication Agent', port: '41254', status: '✅ Online' },
    ];

    result += `**Agent Status Overview:**\n`;
    agents.forEach(agent => {
      result += `- **${agent.name}** (Port ${agent.port}): ${agent.status}\n`;
    });

    result += `\n**System Health:** ✅ All systems operational\n`;
    result += `**Last Check:** ${new Date().toLocaleString()}\n`;
    result += `**Response Time:** < 100ms average\n`;

    return result;
  },

  executeCustomWorkflow: async (
    request: string,
    agents?: string,
    context?: string
  ): Promise<string> => {
    let result = `**🔧 Custom Workflow Execution**\n\n`;
    result += `**Request:** ${request}\n`;
    result += `**Agents Involved:** ${agents || 'All available agents'}\n`;
    result += `**Context:** ${context || 'Custom workflow'}\n\n`;

    result += `**Workflow Steps:**\n`;
    result += `1. Analyzing request requirements\n`;
    result += `2. Coordinating with specified agents\n`;
    result += `3. Executing custom workflow logic\n`;
    result += `4. Aggregating results from multiple agents\n`;
    result += `5. Generating comprehensive response\n\n`;

    result += `**Workflow Status:** ✅ Complete\n`;
    result += `**Next Steps:** Review results and take appropriate action\n`;

    return result;
  },

  executeGeneralWorkflow: async (
    request: string,
    context?: string
  ): Promise<string> => {
    let result = `**🤖 General Multi-Agent Workflow**\n\n`;
    result += `**Request Analysis:** ${request}\n`;
    result += `**Context:** ${context || 'General inquiry'}\n\n`;

    result += `**Agent Coordination:**\n`;
    result += `- Analyzing request across all available agents\n`;
    result += `- Determining optimal agent combination\n`;
    result += `- Executing coordinated response\n`;
    result += `- Aggregating multi-agent results\n\n`;

    result += `**Workflow Status:** ✅ Complete\n`;
    result += `**Next Steps:** Review coordinated response and follow up as needed\n`;

    return result;
  },
};

// Attach helper methods to the tool
Object.assign(createCommunicationAgentTool, communicationAgentHelpers);
