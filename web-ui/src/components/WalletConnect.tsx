'use client';

import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export function WalletConnectButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only showing wallet state after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Always show connect button during SSR and initial client render
  if (!isMounted) {
    return (
      <button
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Connect Wallet</span>
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="px-3 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <span>Connect Wallet</span>
    </button>
  );
}

export function WalletStatus() {
  const { address, isConnected } = useAccount();
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by only showing wallet state after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isConnected || !address) {
    return null;
  }

  return (
    <div className="px-3 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
      </div>
    </div>
  );
}
