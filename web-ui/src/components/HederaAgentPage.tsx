'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  Bot,
  Wallet,
} from 'lucide-react';
import { requestTransactionSignature } from '../lib/a2a';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  transactionBytes?: string;
}

interface AgentResponse {
  output: string;
  transactionBytes?: string;
  error?: string;
}

/**
 * Hedera AI Agent Interface Component
 * Provides natural language interface for Hedera blockchain operations
 */
export default function HederaAgentPage(): JSX.Element {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (
    role: 'user' | 'assistant',
    content: string,
    transactionBytes?: string
  ): void => {
    const message: AgentMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      transactionBytes,
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim() || isLoading) return;

    const userPrompt = prompt.trim();
    setPrompt('');
    setIsLoading(true);

    // Add user message
    addMessage('user', userPrompt);

    try {
      // Send prompt to agent API
      const apiRes = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      const response: AgentResponse = await apiRes.json();

      if (response.error) {
        addMessage('assistant', `❌ Error: ${response.error}`);
      } else {
        // Add assistant response
        addMessage('assistant', response.output, response.transactionBytes);

        // If the agent returned a transaction to sign, handle A2A signing
        if (response.transactionBytes) {
          await handleTransactionSigning(response.transactionBytes);
        }
      }
    } catch (error) {
      console.error('Agent request error:', error);
      addMessage(
        'assistant',
        '❌ Failed to communicate with the Hedera agent. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionSigning = async (
    transactionBytes: string
  ): Promise<void> => {
    setIsSigning(true);

    try {
      // Launch A2A portal for signing
      const result = await requestTransactionSignature(
        transactionBytes,
        `${window.location.origin}/api/a2a-callback`
      );

      if (result.success) {
        addMessage(
          'assistant',
          `✅ Transaction signed and submitted successfully! Transaction ID: ${result.transactionId}`
        );
      } else {
        addMessage(
          'assistant',
          `❌ Transaction signing failed: ${result.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Transaction signing error:', error);
      addMessage(
        'assistant',
        '❌ Failed to sign transaction. Please try again.'
      );
    } finally {
      setIsSigning(false);
    }
  };

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='flex items-center justify-center gap-3 mb-4'>
            <Bot className='h-8 w-8 text-indigo-600' />
            <h1 className='text-3xl font-bold text-gray-900'>
              Hedera AI Agent
            </h1>
            <Wallet className='h-8 w-8 text-indigo-600' />
          </div>
          <p className='text-gray-600 max-w-2xl mx-auto'>
            Interact with the Hedera blockchain using natural language. Ask me
            to check balances, create tokens, transfer HBAR, or perform any
            Hedera operations.
          </p>
        </div>

        {/* Chat Container */}
        <div className='max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden'>
          {/* Messages */}
          <div className='h-96 overflow-y-auto p-6 space-y-4'>
            {messages.length === 0 ? (
              <div className='text-center text-gray-500 py-8'>
                <Bot className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                <p>Start a conversation with the Hedera AI Agent!</p>
                <p className='text-sm mt-2'>
                  Try asking: "Check my HBAR balance" or "Create a new token"
                </p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className='whitespace-pre-wrap'>{message.content}</div>
                    {message.transactionBytes && (
                      <div className='mt-2 text-xs opacity-75'>
                        Transaction ready for signing
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {(isLoading || isSigning) && (
              <div className='flex justify-start'>
                <div className='bg-gray-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  {isSigning ? 'Signing transaction...' : 'Thinking...'}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className='border-t bg-gray-50 p-4'>
            <div className='flex gap-3'>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask the Hedera agent anything... (e.g., 'Check my balance', 'Create a token')"
                className='flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                rows={2}
                disabled={isLoading || isSigning}
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading || isSigning}
                className='bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {isLoading || isSigning ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Send className='h-4 w-4' />
                )}
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className='max-w-4xl mx-auto mt-6 flex justify-center gap-6'>
          <div className='flex items-center gap-2 text-sm text-gray-600'>
            <CheckCircle className='h-4 w-4 text-green-500' />
            <span>Hedera Testnet Connected</span>
          </div>
          <div className='flex items-center gap-2 text-sm text-gray-600'>
            <Bot className='h-4 w-4 text-blue-500' />
            <span>AI Agent Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
