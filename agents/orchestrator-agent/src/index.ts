/**
 * Universal Asset Negotiation Orchestrator Agent (ADK + AG-UI Protocol)
 * 
 * Main entry point for the orchestrator agent
 */

import { config, validateConfig, getEnvironmentInfo } from './config/index.js';
import { ServerManager } from './server/ServerManager.js';

/**
 * Main function to start the orchestrator agent
 */
async function main(): Promise<void> {
  try {
    // Validate configuration
    validateConfig();

    // Display environment info
    const envInfo = getEnvironmentInfo();
    console.log('🔧 Environment Configuration:');
    Object.entries(envInfo).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    console.log('');

    // Check for Llama service availability
    console.log('🦙 Llama Configuration:');
    console.log(`   Model: ${config.llamaModel}`);
    console.log(`   Host: ${config.llamaHost}`);
    console.log(`   Port: ${config.llamaPort}`);
    console.log('');

    // Create and start server
    const serverManager = new ServerManager();
    await serverManager.start(config.port);

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down orchestrator...');
      await serverManager.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down orchestrator...');
      await serverManager.stop();
      process.exit(0);
    });

  } catch (error: any) {
    console.error('❌ Failed to start orchestrator:', error.message);
    process.exit(1);
  }
}

// Start the orchestrator
main().catch(console.error);