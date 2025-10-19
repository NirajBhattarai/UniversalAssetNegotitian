import { A2AClient } from '@a2a-js/sdk';

/**
 * A2A Client instance for Hedera Account-to-Account protocol
 * Handles secure transaction signing in browser environment
 */
export const a2aClient = new A2AClient({
  network: 'testnet',
  providerUrl: 'https://a2a-portal.testnet.hedera.com', // Hedera A2A portal URL
});

/**
 * Request signature for a Hedera transaction using A2A protocol
 * @param transactionBytes - The transaction bytes to be signed
 * @param callbackUrl - URL to redirect after signing
 * @returns Promise with signature result
 */
export async function requestTransactionSignature(
  transactionBytes: string,
  callbackUrl: string
): Promise<any> {
  return await a2aClient.requestSignature({
    transactionBytes,
    callbackUrl,
  });
}

/**
 * Submit a signed transaction to Hedera network
 * @param transactionBytes - The original transaction bytes
 * @param signature - The signature from A2A protocol
 * @param client - Hedera client instance
 * @returns Promise with submission result
 */
export async function submitSignedTransaction(
  transactionBytes: string,
  signature: string,
  client: any
): Promise<any> {
  return await a2aClient.submitTransaction({
    transactionBytes,
    signature,
    client,
  });
}
