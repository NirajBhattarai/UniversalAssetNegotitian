'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  MessageSquare,
  Zap,
  Wallet,
  Bot,
  Shield,
} from 'lucide-react';

interface HederaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  requiresSigning?: boolean;
  transactionDetails?: {
    type: string;
    amount?: string;
    recipient?: string;
    tokenName?: string;
  };
}

function ChatInterface() {
  const [hederaAgentMessages, setHederaAgentMessages] = useState<
    HederaMessage[]
  >([]);
  const [isHederaAgentLoading, setIsHederaAgentLoading] = useState(false);
  const [isHederaAgentSigning, setIsHederaAgentSigning] = useState(false);
  const [input, setInput] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [hederaAgentMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addHederaAgentMessage = (
    role: 'user' | 'assistant',
    content: string,
    requiresSigning?: boolean,
    transactionDetails?: any
  ) => {
    const message: HederaMessage = {
      id: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      requiresSigning,
      transactionDetails,
    };
    setHederaAgentMessages(prev => [...prev, message]);
  };

  const handleHederaAgentSubmit = async (prompt: string): Promise<void> => {
    if (!prompt.trim() || isHederaAgentLoading) return;

    const userPrompt = prompt.trim();
    setIsHederaAgentLoading(true);

    addHederaAgentMessage('user', userPrompt);

    // Add a streaming message placeholder
    const currentStreamingId = `assistant-streaming-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setStreamingMessageId(currentStreamingId);
    const streamingMessage: HederaMessage = {
      id: currentStreamingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setHederaAgentMessages(prev => [...prev, streamingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                setHederaAgentMessages(prev =>
                  prev.map(msg =>
                    msg.id === currentStreamingId
                      ? { ...msg, content: `❌ Error: ${data.error}` }
                      : msg
                  )
                );
                break;
              }

              if (data.content) {
                console.log('Received content chunk:', data.content);
                console.log('Updating message with ID:', currentStreamingId);
                setHederaAgentMessages(prev => {
                  const updated = prev.map(msg => {
                    if (msg.id === currentStreamingId) {
                      console.log('Found streaming message, updating content from:', msg.content, 'to:', msg.content + data.content);
                      return { ...msg, content: msg.content + data.content };
                    }
                    return msg;
                  });
                  console.log('Updated messages:', updated);
                  return updated;
                });
              }

              if (data.done) {
                break;
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Hedera Agent request error:', error);
      setHederaAgentMessages(prev =>
        prev.map(msg =>
          msg.id === currentStreamingId
            ? {
                ...msg,
                content:
                  '❌ Failed to communicate with the Hedera agent. Please try again.',
              }
            : msg
        )
      );
    } finally {
      setIsHederaAgentLoading(false);
      setStreamingMessageId(null);
    }
  };

  const handleA2ASigning = async (transactionDetails: any): Promise<void> => {
    try {
      // For now, show a placeholder message since A2A is temporarily disabled
      addHederaAgentMessage(
        'assistant',
        `🔐 **A2A Signing Placeholder**

**Transaction Type:** ${transactionDetails.type}
**Details:** ${JSON.stringify(transactionDetails, null, 2)}

**Note:** A2A signing is currently disabled. In a full implementation, this would:
1. Prepare the transaction bytes
2. Launch A2A portal for signing
3. Handle the callback with signed transaction
4. Submit to Hedera network

**To enable:** Uncomment the A2A import and implement the signing flow.`
      );
    } catch (error) {
      console.error('A2A signing error:', error);
      addHederaAgentMessage(
        'assistant',
        '❌ Failed to initiate A2A signing. Please try again.'
      );
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isHederaAgentLoading) return;

    const userMessage = input.trim();
    setInput('');
    await handleHederaAgentSubmit(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className='bg-white rounded-2xl shadow-xl border border-gray-200 h-full flex overflow-hidden'>
      {/* Left Sidebar - Agents (ChatGPT Style) */}
      <div className='w-64 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white flex flex-col'>
        {/* Header */}
        <div className='p-4 border-b border-gray-200'>
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center'>
              <Users className='w-5 h-5 text-white' />
            </div>
            <div>
              <h3 className='font-bold text-gray-900'>Hedera AI Chat</h3>
              <p className='text-xs text-gray-600'>Blockchain Assistant</p>
            </div>
          </div>
        </div>

        {/* Agent List */}
        <div className='flex-1 overflow-y-auto p-3 space-y-2'>
          <div className='text-xs font-semibold text-gray-500 uppercase px-3 py-2'>
            Available Agents
          </div>
          
          {/* Wallet Balance Agent */}
          <button
            className='w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
          >
            <span className='text-lg'>💰</span>
            <div className='flex-1 text-left'>
              <div className='font-medium'>Wallet Balance Agent</div>
              <div className='text-xs text-white/80'>
                Port: 41252
              </div>
            </div>
            <CheckCircle className='w-4 h-4 text-green-500' />
          </button>

          {/* Carbon Credit Negotiation Agent */}
          <button
            className='w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
          >
            <span className='text-lg'>🌱</span>
            <div className='flex-1 text-left'>
              <div className='font-medium'>Carbon Credit Negotiation</div>
              <div className='text-xs text-white/80'>
                Port: 41251
              </div>
            </div>
            <CheckCircle className='w-4 h-4 text-green-500' />
          </button>

          {/* Payment Agent */}
          <button
            className='w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
          >
            <span className='text-lg'>💳</span>
            <div className='flex-1 text-left'>
              <div className='font-medium'>Payment Agent</div>
              <div className='text-xs text-white/80'>
                Port: 41253
              </div>
            </div>
            <CheckCircle className='w-4 h-4 text-green-500' />
          </button>

          {/* Communication Agent */}
          <button
            className='w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
          >
            <span className='text-lg'>🤖</span>
            <div className='flex-1 text-left'>
              <div className='font-medium'>Communication Agent</div>
              <div className='text-xs text-white/80'>
                Port: 41254
              </div>
            </div>
            <CheckCircle className='w-4 h-4 text-green-500' />
          </button>

          {/* Hedera AI Agent */}
          <button
            className='w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-md'
          >
            <span className='text-lg'>🔗</span>
            <div className='flex-1 text-left'>
              <div className='font-medium'>Hedera AI Agent</div>
              <div className='text-xs text-white/80'>
                Natural language interface
              </div>
            </div>
            <CheckCircle className='w-4 h-4 text-green-500' />
          </button>
        </div>

        {/* Status */}
        <div className='p-3 border-t border-gray-200'>
          <div className='w-full px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm flex items-center justify-center space-x-2'>
            <CheckCircle className='w-4 h-4' />
            <span>All Agents Online</span>
          </div>
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className='flex-1 flex flex-col'>
        {/* Enhanced Messages */}
        <div className='flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-gray-50 custom-scrollbar'>
          {hederaAgentMessages.length === 0 ? (
            <div className='text-center text-gray-500 py-12'>
              <div className='w-20 h-20 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                <Bot className='w-10 h-10 text-indigo-600' />
              </div>
              <p className='text-xl font-semibold mb-3'>Multi-Agent Carbon Credit Platform</p>
              <p className='text-sm'>
                Interact with our comprehensive carbon credit trading platform using natural language.
                Check wallet balances, find carbon credit projects, process payments, and coordinate workflows.
              </p>
              <div className='text-xs mt-4 space-y-1'>
                <p className='font-medium'>Try asking:</p>
                <p>• "Check my wallet balance across all networks"</p>
                <p>• "Find carbon credit projects in Brazil"</p>
                <p>• "Process payment for 100 carbon credits"</p>
                <p>• "Help me buy carbon credits for my company"</p>
                <p>• "Check status of all agent services"</p>
              </div>
            </div>
          ) : (
            hederaAgentMessages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <div className='whitespace-pre-wrap'>
                    {message.content}
                    {message.id === streamingMessageId && isHederaAgentLoading && (
                      <span className='animate-pulse text-blue-500'>▋</span>
                    )}
                  </div>
                  {message.requiresSigning && (
                    <div className='mt-3 pt-3 border-t border-gray-300'>
                      <button
                        onClick={() =>
                          handleA2ASigning(message.transactionDetails)
                        }
                        className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm'
                      >
                        <Shield className='h-4 w-4' />
                        Sign Transaction
                      </button>
                    </div>
                  )}
                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user'
                        ? 'text-indigo-200'
                        : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          {isHederaAgentLoading && (
            <div className='flex justify-start animate-fadeIn'>
              <div className='bg-white text-gray-900 px-4 py-3 rounded-2xl shadow-sm border border-gray-200'>
                <div className='flex items-center space-x-3'>
                  <Loader2 className='w-4 h-4 animate-spin text-indigo-600' />
                  <span className='text-sm'>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input */}
        <div className='border-t border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-indigo-50'>
          <div className='flex space-x-3'>
            <input
              type='text'
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about carbon credits, wallet balances, payments... (e.g., 'Check my wallet balance' or 'Find carbon credit projects')"
              className='flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm'
              disabled={isHederaAgentLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isHederaAgentLoading}
              className='px-6 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transition-all duration-200 hover:shadow-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700'
            >
              <Send className='w-4 h-4' />
              <span className='font-medium'>Send</span>
            </button>
          </div>
          <div className='mt-3 text-xs text-gray-500 flex items-center space-x-2'>
            <span>💡</span>
            <span>
              Try: "Check my wallet balance" or "Find carbon credit projects in Brazil"
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
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
                  All Agents
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
              {/* Wallet Balance Agent */}
              <div className='flex items-center space-x-3 p-3 rounded-lg bg-purple-50 border border-purple-200'>
                <div className='w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center'>
                  <span className='text-white text-lg'>💰</span>
                </div>
                <div className='flex-1'>
                  <h3 className='font-medium text-gray-900'>
                    Wallet Balance Agent
                  </h3>
                  <p className='text-sm text-gray-600'>Port: 41252</p>
                  <div className='flex items-center mt-1'>
                    <div className='w-2 h-2 bg-green-500 rounded-full mr-2'></div>
                    <span className='text-xs text-green-600'>Online</span>
                  </div>
                </div>
              </div>

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

              {/* Payment Agent */}
              <div className='flex items-center space-x-3 p-3 rounded-lg bg-blue-50 border border-blue-200'>
                <div className='w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center'>
                  <span className='text-white text-lg'>💳</span>
                </div>
                <div className='flex-1'>
                  <h3 className='font-medium text-gray-900'>
                    Payment Agent
                  </h3>
                  <p className='text-sm text-gray-600'>Port: 41253</p>
                  <div className='flex items-center mt-1'>
                    <div className='w-2 h-2 bg-green-500 rounded-full mr-2'></div>
                    <span className='text-xs text-green-600'>Online</span>
                  </div>
                </div>
              </div>

              {/* Communication Agent */}
              <div className='flex items-center space-x-3 p-3 rounded-lg bg-orange-50 border border-orange-200'>
                <div className='w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center'>
                  <span className='text-white text-lg'>🤖</span>
                </div>
                <div className='flex-1'>
                  <h3 className='font-medium text-gray-900'>
                    Communication Agent
                  </h3>
                  <p className='text-sm text-gray-600'>Port: 41254</p>
                  <div className='flex items-center mt-1'>
                    <div className='w-2 h-2 bg-green-500 rounded-full mr-2'></div>
                    <span className='text-xs text-green-600'>Online</span>
                  </div>
                </div>
              </div>

              {/* Hedera AI Agent */}
              <div className='flex items-center space-x-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200'>
                <div className='w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center'>
                  <span className='text-white text-lg'>🔗</span>
                </div>
                <div className='flex-1'>
                  <h3 className='font-medium text-gray-900'>
                    Hedera AI Agent
                  </h3>
                  <p className='text-sm text-gray-600'>Natural language interface</p>
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
          {/* Responsive Full-Width Chat Interface */}
          <div className='w-full h-full'>
            <ChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
}