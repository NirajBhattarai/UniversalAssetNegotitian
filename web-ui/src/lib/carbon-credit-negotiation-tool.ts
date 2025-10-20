import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Carbon Credit Negotiation Tool for finding and negotiating carbon credit deals
 * This tool connects to the carbon credit negotiation agent service to find and negotiate carbon credit deals
 */
export const createCarbonCreditNegotiationTool = () => {
  return tool(
    async ({
      request,
      projectType,
      location,
      budget,
      timeframe,
    }: {
      request: string;
      projectType?: string;
      location?: string;
      budget?: string;
      timeframe?: string;
    }): Promise<string> => {
      /**
       * Find and negotiate carbon credit deals
       *
       * This tool connects to the carbon credit negotiation agent service to:
       * - Find available carbon credit projects
       * - Negotiate deals and pricing
       * - Provide project details and verification
       * - Calculate carbon offset potential
       *
       * Supported project types: Renewable Energy, Reforestation, Energy Efficiency,
       * Carbon Capture, Methane Reduction, Sustainable Agriculture
       */

      try {
        console.log(`Carbon Credit Negotiation Request: ${request}`);

        // Prepare the request payload
        const payload = {
          request: request,
          projectType: projectType || 'any',
          location: location || 'global',
          budget: budget || 'flexible',
          timeframe: timeframe || 'flexible',
        };

        // Call the carbon credit negotiation agent service
        const response = await fetch('http://localhost:41251/api/negotiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          // Format the response nicely
          let result = `🌱 **Carbon Credit Negotiation Results**\n\n`;

          if (data.projects && data.projects.length > 0) {
            result += `**Found ${data.projects.length} Available Projects:**\n\n`;

            data.projects.forEach((project: any, index: number) => {
              result += `**Project ${index + 1}: ${project.name || 'Unnamed Project'}**\n`;
              result += `- **Type:** ${project.type || 'Not specified'}\n`;
              result += `- **Location:** ${project.location || 'Not specified'}\n`;
              result += `- **Carbon Credits:** ${project.creditsAvailable || 'N/A'} tons CO2e\n`;
              result += `- **Price:** $${project.pricePerCredit || 'N/A'} per credit\n`;
              result += `- **Total Cost:** $${project.totalCost || 'N/A'}\n`;
              result += `- **Verification:** ${project.verification || 'Not specified'}\n`;
              result += `- **Status:** ${project.status || 'Available'}\n`;

              if (project.description) {
                result += `- **Description:** ${project.description}\n`;
              }

              if (project.contact) {
                result += `- **Contact:** ${project.contact}\n`;
              }

              result += `\n`;
            });

            // Add summary information
            if (data.summary) {
              result += `**Summary:**\n`;
              result += `- Total Projects Found: ${data.summary.totalProjects || data.projects.length}\n`;
              result += `- Average Price: $${data.summary.averagePrice || 'N/A'} per credit\n`;
              result += `- Total Credits Available: ${data.summary.totalCredits || 'N/A'} tons CO2e\n`;
              result += `- Estimated Total Value: $${data.summary.totalValue || 'N/A'}\n\n`;
            }

            result += `**Next Steps:**\n`;
            result += `- Review the available projects above\n`;
            result += `- Contact project developers for detailed negotiations\n`;
            result += `- Verify project credentials and carbon credit standards\n`;
            result += `- Consider your budget and timeline requirements\n`;
          } else {
            result += `**No Projects Found**\n\n`;
            result += `No carbon credit projects were found matching your criteria.\n\n`;
            result += `**Suggestions:**\n`;
            result += `- Try broadening your search criteria\n`;
            result += `- Consider different project types or locations\n`;
            result += `- Adjust your budget or timeframe requirements\n`;
            result += `- Contact the carbon credit agent for personalized recommendations\n`;
          }

          result += `\n**Last Updated:** ${new Date().toLocaleString()}\n`;
          result += `**Data Source:** Carbon Credit Negotiation Agent`;

          return result;
        } else {
          return `⚠️ **Carbon Credit Service Error**\n\nFailed to retrieve carbon credit projects.\n\n**Error:** ${data.error || 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure the carbon credit negotiation agent service is running on localhost:41251\n- Verify your request parameters are valid\n- Check if the service endpoint is accessible\n- Try simplifying your request or adjusting search criteria`;
        }
      } catch (error) {
        console.error('Carbon credit negotiation tool error:', error);
        return `❌ **Connection Error**\n\nFailed to connect to the carbon credit negotiation agent service.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure the carbon credit negotiation agent service is running on localhost:41251\n- Check your network connection\n- Verify the service endpoint is accessible\n- Try again in a few moments`;
      }
    },
    {
      name: 'carbon_credit_negotiation',
      description: `Find and negotiate carbon credit deals for environmental projects.

This tool helps you discover and negotiate carbon credit projects including:
- Renewable Energy Projects (Solar, Wind, Hydro)
- Reforestation and Afforestation Projects
- Energy Efficiency Initiatives
- Carbon Capture and Storage Projects
- Methane Reduction Projects
- Sustainable Agriculture Projects

The tool provides:
- Available project listings with detailed information
- Pricing and cost calculations
- Project verification and certification details
- Contact information for negotiations
- Carbon offset potential calculations

Use this tool when users ask about:
- Finding carbon credit projects
- Carbon offset opportunities
- Environmental project investments
- Carbon credit pricing and negotiations
- Sustainable project opportunities

Examples:
- "Find carbon credit projects in Brazil"
- "Show me renewable energy projects under $10,000"
- "I need carbon credits for my company's offset program"
- "Find reforestation projects in Africa"`,
      schema: z.object({
        request: z
          .string()
          .describe('The carbon credit request or search criteria'),
        projectType: z
          .string()
          .optional()
          .describe(
            'Type of project: renewable-energy, reforestation, energy-efficiency, carbon-capture, methane-reduction, sustainable-agriculture, or any'
          )
          .default('any'),
        location: z
          .string()
          .optional()
          .describe('Geographic location or region for the project')
          .default('global'),
        budget: z
          .string()
          .optional()
          .describe('Budget range or maximum investment amount')
          .default('flexible'),
        timeframe: z
          .string()
          .optional()
          .describe('Project timeline or delivery timeframe')
          .default('flexible'),
      }),
    }
  );
};
