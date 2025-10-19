import type { NextApiRequest, NextApiResponse } from 'next';
import { submitSignedTransaction } from '../../lib/a2a';
import { getHederaClient } from '../../lib/hedera';

interface A2ACallbackRequest {
  signature: string;
  transactionBytes: string;
}

interface A2ACallbackResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * API endpoint for handling A2A callback after transaction signing
 * Submits the signed transaction to the Hedera network
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<A2ACallbackResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { signature, transactionBytes }: A2ACallbackRequest = req.body;

    if (!signature || !transactionBytes) {
      return res.status(400).json({
        success: false,
        error: 'Missing signature or transaction bytes',
      });
    }

    // Get Hedera client instance
    const client = getHederaClient();

    // Submit the signed transaction
    const response = await submitSignedTransaction(
      transactionBytes,
      signature,
      client
    );

    res.status(200).json({
      success: true,
      transactionId: response.transactionId || response.id,
    });
  } catch (error) {
    console.error('A2A callback error:', error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to submit transaction',
    });
  }
}
