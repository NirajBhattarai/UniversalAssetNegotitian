'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle, Users, MessageSquare, Zap, Wallet } from 'lucide-react';
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

interface BalanceResult {
  walletAddress: string;
  networks: {
    [networkId: string]: {
      networkId: string;
      networkName: string;
      nativeBalance?: {
        token: {
          id: string;
          name: string;
          symbol: string;
          address: string;
          decimals: number;
          blockchain: string;
          network: string;
          isNative: boolean;
        };
        balance: string;
        balanceFormatted: string;
        usdValue: number;
        network: string;
        blockchain: string;
      };
      tokenBalances: Array<{
        token: {
          id: string;
          name: string;
          symbol: string;
          address: string;
          decimals: number;
          blockchain: string;
          network: string;
          isNative: boolean;
        };
        balance: string;
        balanceFormatted: string;
        usdValue: number;
        network: string;
        blockchain: string;
      }>;
      totalUsdValue: number;
    };
  };
  timestamp: string;
  totalUsdValue: number;
}

export default function MultiAgentChat() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('carbon-credit-negotiation');
  const [chatMode, setChatMode] = useState<'agents' | 'hedera' | 'negotiation' | 'wallet-balance'>('agents');
  const [hederaMessages, setHederaMessages] = useState<HederaMessage[]>([]);
  const [isHederaLoading, setIsHederaLoading] = useState(false);
  const [isHederaConnected, setIsHederaConnected] = useState(false);
  const [hederaConnectionStatus, setHederaConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [negotiationSteps, setNegotiationSteps] = useState<NegotiationStep[]>([]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  
  // Wallet Balance state
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [walletAgentStatus, setWalletAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    initializeAgents();
    addWelcomeMessage();
    initializeHederaClient();
    checkWalletAgentStatus();
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
      content: `🌱 Welcome to the Universal Asset Negotiation Platform!\n\nI can help you with asset trading and wallet management:\n\n🌱 **Carbon Credit Negotiation Agent** - Find best carbon credit offers from marketplace\n💳 **Carbon Credit Payment Agent** - Process payments with USDC/USDT/HBAR\n💰 **Multi-Network Wallet Balance Agent** - Check balances across multiple networks with token type detection\n\n**New Wallet Balance Features:**\n• 🌐 **Network-Specific Queries** - Specify network (Hedera/Ethereum/Polygon)\n• 🔍 **Token Type Detection** - Identifies Native vs ERC20 tokens\n• 🚧 **Unsupported Network Handling** - Graceful handling of unsupported networks\n• 📊 **Enhanced Reporting** - Detailed balance breakdowns with USD values\n\n**Example Requests:**\n• "Find 10,000 carbon credits at best price"\n• "Process payment for 5,000 carbon credits using USDC"\n• "Check balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Ethereum"\n• "Show balance for 0.0.123456 on Hedera"\n• "Get balance for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6 on Polygon"\n• "Check my Bitcoin wallet" (will show unsupported network message)`,
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

  // Wallet Balance functions
  const checkWalletAgentStatus = async () => {
    try {
      const response = await fetch('http://localhost:41252/health');
      if (response.ok) {
        setWalletAgentStatus('online');
      } else {
        setWalletAgentStatus('offline');
      }
    } catch (error) {
      setWalletAgentStatus('offline');
    }
  };

  const handleWalletBalanceCheck = async () => {
    if (!walletAddress.trim()) {
      setWalletError('Please enter a wallet address');
      return;
    }

    setIsWalletLoading(true);
    setWalletError(null);
    setBalanceResult(null);

    try {
      const response = await fetch('http://localhost:41252/api/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: walletAddress.trim(),
          network: selectedNetwork !== 'all' ? selectedNetwork : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBalanceResult(data);
        addMessage('agent', `💰 Checked balance for ${walletAddress} - Total: $${data.totalUsdValue.toFixed(2)}`, 'Wallet Balance Agent');
      } else {
        setWalletError(data.error || 'Failed to fetch balance');
      }
    } catch (error) {
      setWalletError('Failed to connect to wallet balance agent');
    } finally {
      setIsWalletLoading(false);
    }
  };

  const formatBalance = (balance: string, decimals: number) => {
    const num = parseFloat(balance);
    return num.toFixed(6);
  };

  const getTokenTypeIcon = (isNative: boolean) => {
    return isNative ? '🪙' : '🔗';
  };

  const getTokenTypeBadge = (isNative: boolean) => {
    return isNative ? 'Native Token' : 'ERC20 Token';
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
          
          <button
            onClick={() => setChatMode('wallet-balance')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
              chatMode === 'wallet-balance'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <div className="flex-1 text-left">
              <div className="font-medium">Wallet Balance</div>
              <div className={`text-xs ${chatMode === 'wallet-balance' ? 'text-white/80' : 'text-gray-500'}`}>
                Multi-network balances
              </div>
            </div>
            {walletAgentStatus === 'online' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {walletAgentStatus === 'offline' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {walletAgentStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
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
        ) : chatMode === 'wallet-balance' ? (
          <>
            <div className="space-y-6">
              {/* Wallet Balance Input Form */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-orange-500" />
                  <h3 className="text-lg font-semibold">Multi-Network Wallet Balance</h3>
                  {walletAgentStatus === 'online' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {walletAgentStatus === 'offline' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {walletAgentStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wallet Address</label>
                    <input
                      type="text"
                      placeholder="0x... or 0.0.123456"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                    <select
                      value={selectedNetwork}
                      onChange={(e) => setSelectedNetwork(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    >
                      <option value="all">All Networks</option>
                      <option value="hedera">Hedera Network (HBAR)</option>
                      <option value="ethereum">Ethereum Mainnet (ETH, USDC, USDT)</option>
                      <option value="polygon">Polygon Network (MATIC, USDC, USDT)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleWalletBalanceCheck}
                  disabled={isWalletLoading || walletAgentStatus !== 'online'}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200"
                >
                  {isWalletLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Balance...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Check Balance
                    </>
                  )}
                </button>

                <div className="mt-4 text-xs text-gray-500">
                  <p className="font-medium mb-1">Example addresses:</p>
                  <div className="space-y-1 font-mono">
                    <div>Ethereum: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045</div>
                    <div>Polygon: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6</div>
                    <div>Hedera: 0.0.123456</div>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {walletError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 font-medium">Error</span>
                  </div>
                  <p className="text-red-600 text-sm mt-1">{walletError}</p>
                </div>
              )}

              {/* Balance Results */}
              {balanceResult && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Balance Report</h3>
                    <div className="bg-gradient-to-r from-orange-100 to-red-100 px-3 py-1 rounded-full">
                      <span className="text-lg font-bold text-orange-600">
                        ${balanceResult.totalUsdValue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <span className="font-medium text-gray-600">Wallet:</span>
                      <span className="ml-2 font-mono text-gray-900">{balanceResult.walletAddress}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Networks:</span>
                      <span className="ml-2 text-gray-900">{Object.keys(balanceResult.networks).length}</span>
                    </div>
                  </div>

                  {/* Network Results */}
                  {Object.entries(balanceResult.networks).map(([networkId, networkData]) => (
                    <div key={networkId} className="border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">{networkData.networkName}</h4>
                        <div className="bg-gray-100 px-3 py-1 rounded-full">
                          <span className="text-base font-bold text-gray-700">
                            ${networkData.totalUsdValue.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Native Token Balance */}
                      {networkData.nativeBalance && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getTokenTypeIcon(networkData.nativeBalance.token.isNative)}</span>
                            <span className="font-medium">{networkData.nativeBalance.token.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              networkData.nativeBalance.token.isNative 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {getTokenTypeBadge(networkData.nativeBalance.token.isNative)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Balance:</span>
                              <span className="ml-2 font-mono">
                                {formatBalance(networkData.nativeBalance.balanceFormatted, networkData.nativeBalance.token.decimals)} {networkData.nativeBalance.token.symbol}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">USD Value:</span>
                              <span className="ml-2 font-semibold">${networkData.nativeBalance.usdValue.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ERC20 Token Balances */}
                      {networkData.tokenBalances && networkData.tokenBalances.length > 0 && (
                        <div className="space-y-3">
                          <h5 className="font-medium text-gray-600">ERC20 Tokens:</h5>
                          {networkData.tokenBalances.map((tokenBalance, index) => (
                            <div key={index} className="border-l-2 border-blue-200 pl-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getTokenTypeIcon(tokenBalance.token.isNative)}</span>
                                <span className="font-medium">{tokenBalance.token.name}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  tokenBalance.token.isNative 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {getTokenTypeBadge(tokenBalance.token.isNative)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Balance:</span>
                                  <span className="ml-2 font-mono">
                                    {formatBalance(tokenBalance.balanceFormatted, tokenBalance.token.decimals)} {tokenBalance.token.symbol}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">USD Value:</span>
                                  <span className="ml-2 font-semibold">${tokenBalance.usdValue.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                Contract: {tokenBalance.token.address}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Token Type Summary */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Token Types Detected:</h4>
                    <div className="flex gap-2">
                      {Object.values(balanceResult.networks).some(network => network.nativeBalance?.token.isNative) && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium flex items-center gap-1">
                          🪙 Native Tokens
                        </span>
                      )}
                      {Object.values(balanceResult.networks).some(network => network.tokenBalances && network.tokenBalances.length > 0) && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center gap-1">
                          🔗 ERC20 Tokens
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
          : chatMode === 'wallet-balance'
          ? 'bg-gradient-to-r from-gray-50 to-orange-50'
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
                : chatMode === 'wallet-balance'
                ? "Use the form above to check wallet balances..."
                : `Message ${agents.find(a => a.id === selectedAgent)?.name}...`
            }
            className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-white shadow-sm ${
              chatMode === 'hedera' 
                ? 'focus:ring-purple-500' 
                : chatMode === 'negotiation'
                ? 'focus:ring-green-500'
                : chatMode === 'wallet-balance'
                ? 'focus:ring-orange-500'
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
                : chatMode === 'wallet-balance'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
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
              : chatMode === 'wallet-balance'
              ? 'Use the form above to check balances across multiple networks'
              : 'Try: "Find 10,000 carbon credits at best price" or "Process payment for 5,000 carbon credits using USDC"'
            }
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}
