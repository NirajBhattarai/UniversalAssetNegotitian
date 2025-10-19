'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Users, MessageSquare, Zap } from 'lucide-react';
import { a2aAgentService, AgentConfig, AgentMessage } from '@/services/A2AAgentService';

interface Agent extends AgentConfig {
  status: 'online' | 'offline' | 'connecting';
}

interface HederaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HederaChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

interface NegotiationStep {
  id: string;
  agent: string;
  message: string;
  timestamp: Date;
  type: 'request' | 'response' | 'status' | 'result';
}

export default function MultiAgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('carbon-credit-negotiation');
  const [chatMode, setChatMode] = useState<'agents' | 'hedera' | 'negotiation'>('agents');
  const [hederaMessages, setHederaMessages] = useState<HederaMessage[]>([]);
  const [isHederaLoading, setIsHederaLoading] = useState(false);
  const [isHederaConnected, setIsHederaConnected] = useState(false);
  const [hederaConnectionStatus, setHederaConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [negotiationSteps, setNegotiationSteps] = useState<NegotiationStep[]>([]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    initializeAgents();
    addWelcomeMessage();
    initializeHederaClient();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, hederaMessages, negotiationSteps]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeAgents = async () => {
    const agentConfigs = a2aAgentService.getAgents();
    const statuses = await a2aAgentService.checkAllAgentsStatus();
    
    const agentsWithStatus: Agent[] = agentConfigs.map(agent => ({
      ...agent,
      status: statuses[agent.id] ? 'online' : 'offline'
    }));
    
    setAgents(agentsWithStatus);
  };

  const addWelcomeMessage = () => {
    const welcomeMessage: AgentMessage = {
      id: 'welcome',
      role: 'agent',
      agentName: 'System',
      content: `🌱 Welcome to the Universal Asset Negotiation Platform!\n\nI can help you trade carbon credits with specialized agents:\n\n🌱 **Carbon Credit Negotiation Agent** - Find best carbon credit offers from marketplace\n💳 **Carbon Credit Payment Agent** - Process payments with USDC/USDT/HBAR\n\nTry asking: "Find 10,000 carbon credits at best price" or "Process payment for 5,000 carbon credits using USDC"`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const initializeHederaClient = async () => {
    try {
      setHederaConnectionStatus('connecting');
      const response = await fetch('/api/hedera/chat', { method: 'GET' });
      const data = await response.json();
      
      if (data.connected) {
        setIsHederaConnected(true);
        setHederaConnectionStatus('connected');
        addHederaMessage('assistant', '🔗 Connected to Hedera network! I can help you check your HBAR balance, query account information, and perform basic Hedera operations. How can I assist you?');
      } else {
        setIsHederaConnected(false);
        setHederaConnectionStatus('error');
        addHederaMessage('assistant', '❌ Failed to connect to Hedera network. Please check your configuration and try again.');
      }
    } catch (error) {
      console.error('Failed to initialize Hedera client:', error);
      setIsHederaConnected(false);
      setHederaConnectionStatus('error');
      addHederaMessage('assistant', '❌ Error initializing Hedera client. Please check your environment variables.');
    }
  };

  const addHederaMessage = (role: 'user' | 'assistant', content: string) => {
    const message: HederaMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    };
    setHederaMessages(prev => [...prev, message]);
  };

  const sendHederaMessage = async (message: string) => {
    if (!message.trim() || isHederaLoading) return;

    const userMessage = message.trim();
    setIsHederaLoading(true);

    // Add user message
    addHederaMessage('user', userMessage);

    try {
      const response = await fetch('/api/hedera/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data: HederaChatResponse = await response.json();
      
      if (data.success) {
        addHederaMessage('assistant', data.message);
      } else {
        addHederaMessage('assistant', `❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addHederaMessage('assistant', '❌ An unexpected error occurred. Please try again.');
    } finally {
      setIsHederaLoading(false);
    }
  };

  const checkAgentStatus = async () => {
    const statuses = await a2aAgentService.checkAllAgentsStatus();
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: statuses[agent.id] ? 'online' : 'offline'
    })));
  };

  const addMessage = (role: 'user' | 'agent', content: string, agentName?: string) => {
    const message: AgentMessage = {
      id: Date.now().toString(),
      role,
      content,
      agentName,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addNegotiationStep = (agent: string, message: string, type: NegotiationStep['type']) => {
    const step: NegotiationStep = {
      id: Date.now().toString(),
      agent,
      message,
      timestamp: new Date(),
      type
    };
    setNegotiationSteps(prev => [...prev, step]);
  };

  const addThinkingStep = (agent: string, duration: number) => {
    const thinkingStep: NegotiationStep = {
      id: `thinking-${Date.now()}`,
      agent,
      message: `🤔 ${agent} is processing...`,
      timestamp: new Date(),
      type: 'status'
    };
    setNegotiationSteps(prev => [...prev, thinkingStep]);
    
    // Remove thinking step after duration
    setTimeout(() => {
      setNegotiationSteps(prev => prev.filter(step => step.id !== thinkingStep.id));
    }, duration);
  };

  const simulateNegotiation = async (userRequest: string) => {
    setIsNegotiating(true);
    setNegotiationSteps([]);
    
    // Add initial user request
    addNegotiationStep('User', userRequest, 'request');
    
    try {
      // Phase 1: Carbon Credit Negotiation Agent Search
      addNegotiationStep('Carbon Credit Negotiation Agent', '🔍 Received your carbon credit request. Analyzing marketplace...', 'status');
      addThinkingStep('Carbon Credit Negotiation Agent', 2000);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const negotiationResponse = await a2aAgentService.sendMessageToAgent(userRequest, 'carbon-credit-negotiation');
      if (negotiationResponse.success && negotiationResponse.response) {
        addNegotiationStep('Carbon Credit Negotiation Agent', negotiationResponse.response, 'response');
      } else {
        addNegotiationStep('Carbon Credit Negotiation Agent', `❌ Error: ${negotiationResponse.error || 'No response from Negotiation Agent'}`, 'response');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Phase 2: Payment Agent Calculation
      addNegotiationStep('Carbon Credit Payment Agent', '🔄 Processing payment for carbon credits...', 'status');
      addThinkingStep('Carbon Credit Payment Agent', 2000);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const paymentResponse = await a2aAgentService.sendMessageToAgent(userRequest, 'carbon-credit-payment');
      if (paymentResponse.success && paymentResponse.response) {
        addNegotiationStep('Carbon Credit Payment Agent', paymentResponse.response, 'response');
      } else {
        addNegotiationStep('Carbon Credit Payment Agent', `❌ Error: ${paymentResponse.error || 'No response from Payment Agent'}`, 'response');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Phase 3: Final Summary
      addNegotiationStep('System', '🤝 Carbon credit transaction completed!\n\nAll agents have been contacted and responses received. Check individual agent responses above for detailed information.', 'result');
      
    } catch (error) {
      addNegotiationStep('System', `❌ Error during negotiation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'result');
    } finally {
      setIsNegotiating(false);
    }
  };

  const sendMessageToAgent = async (message: string, agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    try {
      const result = await a2aAgentService.sendMessageToAgent(message, agentId);
      
      if (result.success && result.response) {
        addMessage('agent', result.response, agent.name);
      } else {
        addMessage('agent', `❌ Error: ${result.error || 'Unknown error'}`, 'System');
      }
    } catch (error) {
      addMessage('agent', `❌ Error communicating with ${agent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'System');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || isHederaLoading || isNegotiating) return;

    const userMessage = input.trim();
    setInput('');

    if (chatMode === 'hedera') {
      await sendHederaMessage(userMessage);
    } else if (chatMode === 'negotiation') {
      await simulateNegotiation(userMessage);
    } else {
      setIsLoading(true);
      // Add user message
      addMessage('user', userMessage);

      try {
        await sendMessageToAgent(userMessage, selectedAgent);
      } catch (error) {
        addMessage('agent', '❌ Failed to send message to agent', 'System');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentIcon = (agentId: string) => {
    const icons = {
      'carbon-credit-negotiation': '🌱',
      'carbon-credit-payment': '💳'
    };
    return icons[agentId as keyof typeof icons] || '🤖';
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'offline':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'connecting':
        return <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  const getHederaConnectionIcon = () => {
    switch (hederaConnectionStatus) {
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

  const getHederaConnectionText = () => {
    switch (hederaConnectionStatus) {
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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full flex overflow-hidden">
      {/* Left Sidebar - Agents (ChatGPT Style) */}
      <div className="w-64 border-r border-gray-200 bg-gradient-to-b from-gray-50 to-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Unified Chat</h3>
              <p className="text-xs text-gray-600">Multi-Agent System</p>
            </div>
          </div>
        </div>


        {/* Agent List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Agents</div>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => { setSelectedAgent(agent.id); setChatMode('agents'); }}
              className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
                selectedAgent === agent.id && chatMode === 'agents'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{getAgentIcon(agent.id)}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{agent.name}</div>
                <div className={`text-xs ${selectedAgent === agent.id && chatMode === 'agents' ? 'text-white/80' : 'text-gray-500'}`}>
                  {agent.description}
                </div>
              </div>
              {getStatusIcon(agent.status)}
            </button>
          ))}
          
          <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 mt-4">Special Modes</div>
          <button
            onClick={() => setChatMode('negotiation')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
              chatMode === 'negotiation'
                ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            <div className="flex-1 text-left">
              <div className="font-medium">Live Negotiation</div>
              <div className={`text-xs ${chatMode === 'negotiation' ? 'text-white/80' : 'text-gray-500'}`}>
                Multi-agent streaming
              </div>
            </div>
            {isNegotiating ? <Loader2 className="w-4 h-4 animate-spin text-green-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
          </button>
          
          <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 mt-4">Assistant</div>
          <button
            onClick={() => setChatMode('hedera')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
              chatMode === 'hedera'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Zap className="w-5 h-5" />
            <div className="flex-1 text-left">
              <div className="font-medium">Hedera Assistant</div>
              <div className={`text-xs ${chatMode === 'hedera' ? 'text-white/80' : 'text-gray-500'}`}>
                Blockchain operations
              </div>
            </div>
            {getHederaConnectionIcon()}
          </button>
        </div>

        {/* Refresh Button */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={checkAgentStatus}
            className="w-full px-3 py-2 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center justify-center space-x-2 shadow-sm border border-gray-200 transition-all duration-200"
          >
            <Loader2 className="w-4 h-4" />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col">

      {/* Enhanced Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-gray-50 custom-scrollbar">
        {chatMode === 'agents' ? (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  {message.agentName && (
                    <div className="text-xs font-semibold mb-2 opacity-80">
                      {message.agentName}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white text-gray-900 px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm">Sending to {agents.find(a => a.id === selectedAgent)?.name}...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : chatMode === 'negotiation' ? (
          <>
            {negotiationSteps.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-xl font-semibold mb-3">Live Multi-Agent Carbon Credit Negotiation</p>
                <p className="text-sm">Watch agents negotiate carbon credit deals in real-time! Try: "Find 10,000 carbon credits at best price"</p>
              </div>
            ) : (
              negotiationSteps.map((step) => (
                <div key={step.id} className="animate-fadeIn">
                  <div className={`flex ${step.agent === 'User' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                        step.agent === 'User'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : step.type === 'status'
                          ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-gray-800 border border-yellow-200'
                          : step.type === 'result'
                          ? 'bg-gradient-to-r from-green-100 to-teal-100 text-gray-800 border border-green-200'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xs font-semibold opacity-80">{step.agent}</span>
                        {step.type === 'status' && <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />}
                        {step.type === 'result' && <CheckCircle className="w-3 h-3 text-green-600" />}
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{step.message}</p>
                      <p className={`text-xs mt-2 ${
                        step.agent === 'User' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {step.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isNegotiating && (
              <div className="flex justify-center animate-fadeIn">
                <div className="bg-gradient-to-r from-green-100 to-teal-100 text-gray-800 px-6 py-4 rounded-2xl shadow-sm border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                    <span className="text-sm font-medium">Agents are negotiating in real-time...</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    💬 Agents are communicating via A2A protocol
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {hederaMessages.map((message) => (
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
            ))}
            {isHederaLoading && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-white text-gray-900 px-4 py-3 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm">Processing...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input */}
      <div className={`border-t border-gray-200 p-6 ${
        chatMode === 'hedera' 
          ? 'bg-gradient-to-r from-gray-50 to-purple-50' 
          : chatMode === 'negotiation'
          ? 'bg-gradient-to-r from-gray-50 to-green-50'
          : 'bg-gradient-to-r from-gray-50 to-blue-50'
      }`}>
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              chatMode === 'hedera' 
                ? "Ask about your HBAR balance, account info, or Hedera operations..." 
                : chatMode === 'negotiation'
                ? "Start a carbon credit negotiation: 'Find 10,000 carbon credits at best price'..."
                : `Message ${agents.find(a => a.id === selectedAgent)?.name}...`
            }
            className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-white shadow-sm ${
              chatMode === 'hedera' 
                ? 'focus:ring-purple-500' 
                : chatMode === 'negotiation'
                ? 'focus:ring-green-500'
                : 'focus:ring-blue-500'
            }`}
            disabled={isLoading || isHederaLoading || isNegotiating}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || isHederaLoading || isNegotiating}
            className={`px-6 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg transition-all duration-200 hover:shadow-xl ${
              chatMode === 'hedera' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                : chatMode === 'negotiation'
                ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span className="font-medium">
              {isNegotiating ? 'Negotiating...' : 'Send'}
            </span>
          </button>
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-center space-x-2">
          <span>💡</span>
          <span>
            {chatMode === 'hedera' 
              ? 'Try: "What\'s my HBAR balance?" or "Show my account information"'
              : chatMode === 'negotiation'
              ? 'Try: "Find 10,000 carbon credits at best price" or "Buy 5,000 carbon credits using USDC"'
              : 'Try: "Find 10,000 carbon credits at best price" or "Process payment for 5,000 carbon credits using USDC"'
            }
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}
