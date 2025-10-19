import { Client, PrivateKey } from '@hashgraph/sdk';
import {
  HederaLangchainToolkit,
  coreAccountQueryPlugin,
  coreTokenQueryPlugin,
  coreConsensusQueryPlugin,
} from 'hedera-agent-kit';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates and configures a Hedera LangChain toolkit for AI agent operations
 * @returns Configured HederaLangchainToolkit instance
 */
export function createHederaToolkit(): HederaLangchainToolkit {
  const client = Client.forTestnet().setOperator(
    process.env.HEDERA_ACCOUNT_ID!,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!)
  );

  return new HederaLangchainToolkit({
    client,
    configuration: {
      // Use default configuration
      plugins: [
        coreAccountQueryPlugin,
        coreTokenQueryPlugin,
        coreConsensusQueryPlugin,
      ],
    },
  });
}

/**
 * Gets the Hedera client instance
 * @returns Configured Hedera Client instance
 */
export function getHederaClient(): Client {
  return Client.forTestnet().setOperator(
    process.env.HEDERA_ACCOUNT_ID!,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!)
  );
}
