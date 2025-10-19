'use client';

import { wagmiAdapter, wagmiConfig, projectId, networks, defaultNetwork } from '@/config/reown-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import React, { type ReactNode } from 'react';
import { cookieToInitialState, WagmiProvider } from 'wagmi';

// Set up queryClient
const queryClient = new QueryClient();

if (!projectId) {
  throw new Error('Project ID is not defined');
}

// Set up metadata
const metadata = {
  name: 'Universal Asset Negotiation',
  description:
    'Multi-agent platform for automated asset trading, verification, and settlement',
  url: 'https://universal-asset-negotiation.io', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
};

// Create the modal
const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: networks as any,
  defaultNetwork: defaultNetwork as any,
  metadata: metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

interface ContextProviderProps {
  children: ReactNode;
  cookies: string | null;
}

function ContextProvider({ children, cookies }: ContextProviderProps) {
  const initialState = cookieToInitialState(wagmiConfig, cookies);

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
        <appkit-modal />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
