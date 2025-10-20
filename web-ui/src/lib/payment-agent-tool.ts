import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Payment Agent Tool for processing payments for carbon credits and other transactions
 * This tool connects to the payment agent service to handle secure payment processing
 */
export const createPaymentAgentTool = () => {
  return tool(
    async ({
      request,
      amount,
      currency,
      recipient,
      paymentMethod,
      transactionType,
      projectId,
      description,
    }: {
      request: string;
      amount?: string;
      currency?: string;
      recipient?: string;
      paymentMethod?: string;
      transactionType?: string;
      projectId?: string;
      description?: string;
    }): Promise<string> => {
      /**
       * Process payments for carbon credits and other transactions
       *
       * This tool connects to the payment agent service to:
       * - Process carbon credit purchases
       * - Handle secure payment transactions
       * - Support multiple payment methods (crypto, fiat, credit cards)
       * - Generate payment confirmations and receipts
       * - Track transaction status
       *
       * Supported payment methods: Bitcoin, Ethereum, Credit Card, Bank Transfer, PayPal
       * Supported currencies: USD, EUR, BTC, ETH, HBAR
       */

      try {
        console.log(`Payment Agent Request: ${request}`);

        // Prepare the request payload
        const payload = {
          request: request,
          amount: amount || '0',
          currency: currency || 'USD',
          recipient: recipient || '',
          paymentMethod: paymentMethod || 'crypto',
          transactionType: transactionType || 'carbon_credit_purchase',
          projectId: projectId || '',
          description: description || '',
          timestamp: new Date().toISOString(),
        };

        // Call the payment agent service
        const response = await fetch(
          'http://localhost:41253/api/process-payment',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (response.ok) {
          // Format the response nicely
          let result = `💳 **Payment Processing Results**\n\n`;

          if (data.transaction) {
            const transaction = data.transaction;
            result += `**Transaction Details:**\n`;
            result += `- **Transaction ID:** \`${transaction.id || 'N/A'}\`\n`;
            result += `- **Amount:** ${transaction.amount || 'N/A'} ${transaction.currency || 'USD'}\n`;
            result += `- **Payment Method:** ${transaction.paymentMethod || 'N/A'}\n`;
            result += `- **Recipient:** ${transaction.recipient || 'N/A'}\n`;
            result += `- **Status:** ${transaction.status || 'Processing'}\n`;
            result += `- **Type:** ${transaction.type || 'N/A'}\n`;

            if (transaction.projectId) {
              result += `- **Project ID:** ${transaction.projectId}\n`;
            }

            if (transaction.description) {
              result += `- **Description:** ${transaction.description}\n`;
            }

            result += `- **Timestamp:** ${transaction.timestamp || new Date().toLocaleString()}\n\n`;

            // Add payment method specific information
            if (transaction.paymentDetails) {
              result += `**Payment Details:**\n`;
              Object.entries(transaction.paymentDetails).forEach(
                ([key, value]) => {
                  result += `- **${key}:** ${value}\n`;
                }
              );
              result += `\n`;
            }

            // Add blockchain transaction info if available
            if (transaction.blockchainTx) {
              result += `**Blockchain Transaction:**\n`;
              result += `- **Hash:** \`${transaction.blockchainTx.hash || 'N/A'}\`\n`;
              result += `- **Network:** ${transaction.blockchainTx.network || 'N/A'}\n`;
              result += `- **Confirmations:** ${transaction.blockchainTx.confirmations || '0'}\n`;
              result += `- **Gas Used:** ${transaction.blockchainTx.gasUsed || 'N/A'}\n\n`;
            }

            // Add next steps based on status
            if (transaction.status === 'completed') {
              result += `✅ **Payment Completed Successfully!**\n\n`;
              result += `**Next Steps:**\n`;
              result += `- Your payment has been processed and confirmed\n`;
              result += `- You will receive a receipt via email\n`;
              result += `- Carbon credits (if applicable) will be transferred to your account\n`;
              result += `- Transaction details are available in your payment history\n`;
            } else if (transaction.status === 'pending') {
              result += `⏳ **Payment Pending**\n\n`;
              result += `**Next Steps:**\n`;
              result += `- Complete the payment process using the provided details\n`;
              result += `- Monitor transaction status for updates\n`;
              result += `- Contact support if payment takes longer than expected\n`;
            } else if (transaction.status === 'failed') {
              result += `❌ **Payment Failed**\n\n`;
              result += `**Next Steps:**\n`;
              result += `- Review the error details above\n`;
              result += `- Try a different payment method if available\n`;
              result += `- Contact support for assistance\n`;
            }
          } else {
            result += `**Payment Request Received**\n\n`;
            result += `Your payment request has been submitted to the payment agent.\n\n`;
            result += `**Request Details:**\n`;
            result += `- Amount: ${payload.amount} ${payload.currency}\n`;
            result += `- Payment Method: ${payload.paymentMethod}\n`;
            result += `- Transaction Type: ${payload.transactionType}\n`;
            result += `- Timestamp: ${payload.timestamp}\n\n`;
            result += `**Next Steps:**\n`;
            result += `- Follow the payment instructions provided\n`;
            result += `- Complete the payment process\n`;
            result += `- Monitor for confirmation\n`;
          }

          result += `\n**Last Updated:** ${new Date().toLocaleString()}\n`;
          result += `**Data Source:** Payment Agent Service`;

          return result;
        } else {
          return `⚠️ **Payment Service Error**\n\nFailed to process payment request.\n\n**Error:** ${data.error || 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure the payment agent service is running on localhost:41253\n- Verify your payment details are correct\n- Check if the service endpoint is accessible\n- Try a different payment method if available`;
        }
      } catch (error) {
        console.error('Payment agent tool error:', error);
        return `❌ **Connection Error**\n\nFailed to connect to the payment agent service.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure the payment agent service is running on localhost:41253\n- Check your network connection\n- Verify the service endpoint is accessible\n- Try again in a few moments`;
      }
    },
    {
      name: 'payment_processor',
      description: `Process payments for carbon credits and other transactions with secure payment handling.

This tool handles various payment scenarios including:
- Carbon credit purchases and payments
- Multi-currency transactions (USD, EUR, BTC, ETH, HBAR)
- Multiple payment methods (Bitcoin, Ethereum, Credit Card, Bank Transfer, PayPal)
- Secure transaction processing and confirmation
- Payment status tracking and receipts
- Blockchain transaction monitoring

The tool provides:
- Secure payment processing
- Transaction confirmation and receipts
- Payment method flexibility
- Real-time status updates
- Blockchain transaction tracking
- Error handling and troubleshooting

Use this tool when users ask about:
- Making payments for carbon credits
- Processing transactions
- Payment confirmations
- Transaction status checks
- Payment method options
- Receipt generation

Examples:
- "Process payment for 100 carbon credits"
- "Pay $5,000 for the solar project"
- "Make payment using Bitcoin"
- "Check payment status for transaction 12345"`,
      schema: z.object({
        request: z
          .string()
          .describe('The payment request or transaction details'),
        amount: z.string().optional().describe('Payment amount').default('0'),
        currency: z
          .string()
          .optional()
          .describe('Currency for the payment (USD, EUR, BTC, ETH, HBAR)')
          .default('USD'),
        recipient: z
          .string()
          .optional()
          .describe('Payment recipient or merchant')
          .default(''),
        paymentMethod: z
          .string()
          .optional()
          .describe(
            'Payment method: bitcoin, ethereum, credit_card, bank_transfer, paypal'
          )
          .default('crypto'),
        transactionType: z
          .string()
          .optional()
          .describe(
            'Type of transaction: carbon_credit_purchase, project_payment, general_payment'
          )
          .default('carbon_credit_purchase'),
        projectId: z
          .string()
          .optional()
          .describe('Project ID if payment is for a specific project')
          .default(''),
        description: z
          .string()
          .optional()
          .describe('Additional description or notes for the payment')
          .default(''),
      }),
    }
  );
};
