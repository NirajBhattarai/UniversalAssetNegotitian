'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { HederaClientService, HederaMessage } from '@/services/HederaClient';

interface HederaChatProps {
  className?: string;
}

export default function HederaChat({ className = '' }: HederaChatProps) {
  const [messages, setMessages] = useState<HederaMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hederaClient = useRef<HederaClientService | null>(null);

  useEffect(() => {
    initializeHederaClient();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeHederaClient = async () => {
    try {
      setConnectionStatus('connecting');
      hederaClient.current = new HederaClientService();
      const connected = await hederaClient.current.checkConnection();
      
      if (connected) {
        setIsConnected(true);
        setConnectionStatus('connected');
        addMessage('assistant', '🔗 Connected to Hedera network! I can help you check your HBAR balance, query account information, and perform basic Hedera operations. How can I assist you?');
      } else {
        setIsConnected(false);
        setConnectionStatus('error');
        addMessage('assistant', '❌ Failed to connect to Hedera network. Please check your configuration and try again.');
      }
    } catch (error) {
      console.error('Failed to initialize Hedera client:', error);
      setIsConnected(false);
      setConnectionStatus('error');
      addMessage('assistant', '❌ Error initializing Hedera client. Please check your environment variables.');
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: HederaMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !hederaClient.current) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    addMessage('user', userMessage);

    try {
      const response = await hederaClient.current.sendMessage(userMessage);
      
      if (response.success) {
        addMessage('assistant', response.message);
      } else {
        addMessage('assistant', `❌ Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('assistant', '❌ An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to Hedera...';
      case 'connected':
        return 'Connected to Hedera';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full flex flex-col overflow-hidden">
      {/* Enhanced Header */}
      <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Hedera AI Assistant</h3>
              <p className="text-sm text-gray-600">Blockchain operations & queries</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            {getConnectionIcon()}
            <span className={`font-medium ${
              connectionStatus === 'connected' ? 'text-green-600' : 
              connectionStatus === 'error' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {getConnectionText()}
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-purple-50 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-purple-600 text-3xl">🔗</span>
            </div>
            <p className="text-xl font-semibold mb-3">Welcome to Hedera AI Assistant</p>
            <p className="text-sm">Ask me about your HBAR balance, account info, or any Hedera operations!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white text-gray-900 px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input */}
      <div className="border-t border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-purple-50">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your HBAR balance, account info, or Hedera operations..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
            disabled={isLoading || !isConnected}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || !isConnected}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            <Send className="w-4 h-4" />
            <span className="font-medium">Send</span>
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-center space-x-2">
          <span>💡</span>
          <span>Try: "What's my HBAR balance?" or "Show my account information"</span>
        </div>
      </div>
    </div>
  );
}
