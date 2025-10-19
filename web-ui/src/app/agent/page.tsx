'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, Wallet } from 'lucide-react';
// import { requestTransactionSignature } from '../../lib/a2a'; // Temporarily disabled

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentResponse {
  output: string;
  error?: string;
}

export default function AgentPage() {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (role: 'user' | 'assistant', content: string): void => {
    const message: AgentMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!prompt.trim() || isLoading) return;

    const userPrompt = prompt.trim();
    setPrompt('');
    setIsLoading(true);

    addMessage('user', userPrompt);

    try {
      const apiRes = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      const response: AgentResponse = await apiRes.json();

      if (response.error) {
        addMessage('assistant', `❌ Error: ${response.error}`);
      } else {
        addMessage('assistant', response.output);
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

        <div className='max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden'>
          <div className='h-96 overflow-y-auto p-6 space-y-4'>
            {messages.length === 0 ? (
              <div className='text-center text-gray-500 py-8'>
                <Bot className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                <p>Start a conversation with the Hedera AI Agent!</p>
                <p className='text-sm mt-2'>Try asking:</p>
                <div className='text-xs mt-2 space-y-1'>
                  <p>• "Check balance for account 0.0.7093677"</p>
                  <p>• "What tokens does account 0.0.123456 have?"</p>
                  <p>• "Get account info for 0.0.789012"</p>
                </div>
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
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className='flex justify-start'>
                <div className='bg-gray-100 text-gray-900 px-4 py-2 rounded-lg flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className='border-t bg-gray-50 p-4'>
            <div className='flex gap-3'>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about Hedera accounts... (e.g., 'Check balance for account 0.0.7093677')"
                className='flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
                className='bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Send className='h-4 w-4' />
                )}
                Send
              </button>
            </div>
          </div>
        </div>

        <div className='max-w-4xl mx-auto mt-6 flex justify-center gap-6'>
          <div className='flex items-center gap-2 text-sm text-gray-600'>
            <Bot className='h-4 w-4 text-blue-500' />
            <span>AI Agent Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
