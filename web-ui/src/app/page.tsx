'use client';

import React, { useState, useEffect } from 'react';
import MultiAgentChat from '@/components/MultiAgentChat';
import { WalletConnectButton, WalletStatus } from '@/components/WalletConnect';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center'>
          <div className='text-center p-8'>
            <div className='text-6xl mb-4'>⚠️</div>
            <h1 className='text-2xl font-bold text-red-600 mb-2'>
              Something went wrong
            </h1>
            <p className='text-gray-600 mb-4'>
              The application encountered an error
            </p>
            <button
              onClick={() => window.location.reload()}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Suppress extension errors in console
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0]?.toString() || '';
      if (
        errorMessage.includes('chrome-extension://') ||
        errorMessage.includes('Cannot read properties of null')
      ) {
        // Suppress extension errors
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden'>
        {/* Responsive Compact Header */}
        <header className='bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-10'>
          <div className='px-2 sm:px-4 md:px-6 lg:px-8'>
            <div className='flex justify-between items-center py-2 sm:py-3'>
              {/* Mobile Hamburger Menu */}
              <div className='flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1'>
                <button
                  onClick={toggleMobileMenu}
                  className='sm:hidden flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors'
                  aria-label='Toggle agents menu'
                >
                  <svg
                    className='w-6 h-6 text-gray-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 6h16M4 12h16M4 18h16'
                    />
                  </svg>
                </button>

                <div className='flex-shrink-0'>
                  <div className='w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center'>
                    <span className='text-sm sm:text-lg'>🤖</span>
                  </div>
                </div>
                <div className='min-w-0 flex-1'>
                  <h1 className='text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent truncate'>
                    Carbon Credit Trading Platform
                  </h1>
                  <p className='text-xs sm:text-xs text-gray-600 hidden sm:block truncate'>
                    Multi-Agent Carbon Credit Trading powered by A2A Protocol
                  </p>
                </div>
              </div>
              <div className='flex items-center space-x-2 sm:space-x-3 flex-shrink-0'>
                <div className='px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium'>
                  <span className='hidden sm:inline'>
                    🟢 All Systems Online
                  </span>
                  <span className='sm:hidden'>🟢</span>
                </div>
                <WalletConnectButton />
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Agents Sidebar */}
        {isMobileMenuOpen && (
          <div className='sm:hidden fixed inset-0 z-20'>
            {/* Backdrop */}
            <div
              className='absolute inset-0 bg-black bg-opacity-50'
              onClick={toggleMobileMenu}
            />

            {/* Sidebar */}
            <div className='absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl'>
              <div className='p-4 border-b border-gray-200'>
                <div className='flex items-center justify-between'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Agents
                  </h2>
                  <button
                    onClick={toggleMobileMenu}
                    className='p-1 rounded-md hover:bg-gray-100 transition-colors'
                    aria-label='Close menu'
                  >
                    <svg
                      className='w-6 h-6 text-gray-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className='p-4 space-y-3'>
                {/* Wallet Connect */}
                <WalletConnectButton />

                {/* Wallet Status */}
                <WalletStatus />

                {/* Carbon Credit Negotiation Agent */}
                <div className='flex items-center space-x-3 p-3 rounded-lg bg-green-50 border border-green-200'>
                  <div className='w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center'>
                    <span className='text-white text-lg'>🌱</span>
                  </div>
                  <div className='flex-1'>
                    <h3 className='font-medium text-gray-900'>
                      Carbon Credit Negotiation
                    </h3>
                    <p className='text-sm text-gray-600'>Port: 41251</p>
                    <div className='flex items-center mt-1'>
                      <div className='w-2 h-2 bg-green-500 rounded-full mr-2'></div>
                      <span className='text-xs text-green-600'>Online</span>
                    </div>
                  </div>
                </div>

                {/* Carbon Credit Payment Agent */}
                <div className='flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200'>
                  <div className='w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center'>
                    <span className='text-white text-lg'>💳</span>
                  </div>
                  <div className='flex-1'>
                    <h3 className='font-medium text-gray-900'>
                      Carbon Credit Payment
                    </h3>
                    <p className='text-sm text-gray-600'>Port: 41245</p>
                    <div className='flex items-center mt-1'>
                      <div className='w-2 h-2 bg-green-500 rounded-full mr-2'></div>
                      <span className='text-xs text-green-600'>Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className='w-full py-1 sm:py-2 md:py-4 px-1 sm:px-2 md:px-4 h-[calc(100vh-60px)] sm:h-[calc(100vh-80px)] md:h-[calc(100vh-100px)]'>
          <div className='w-full h-full'>
            {/* Responsive Full-Width Multi-Agent Chat */}
            <div className='w-full h-full'>
              <MultiAgentChat />
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
