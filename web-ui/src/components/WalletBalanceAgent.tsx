import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, Network, Coins, AlertTriangle, CheckCircle } from 'lucide-react';

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

interface WalletBalanceAgentProps {
  onMessage?: (message: string) => void;
}

const WalletBalanceAgent: React.FC<WalletBalanceAgentProps> = ({ onMessage }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const networks = [
    { id: 'all', name: 'All Networks', description: 'Check all supported networks' },
    { id: 'hedera', name: 'Hedera Network', description: 'HBAR (Native Token)' },
    { id: 'ethereum', name: 'Ethereum Mainnet', description: 'ETH (Native), USDC/USDT (ERC20)' },
    { id: 'polygon', name: 'Polygon Network', description: 'MATIC (Native), USDC/USDT (ERC20)' }
  ];

  useEffect(() => {
    checkAgentStatus();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const response = await fetch('http://localhost:41252/health');
      if (response.ok) {
        setAgentStatus('online');
      } else {
        setAgentStatus('offline');
      }
    } catch (error) {
      setAgentStatus('offline');
    }
  };

  const handleBalanceCheck = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setBalanceResult(null);

    try {
      const response = await fetch('http://localhost:41252/api/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: walletAddress.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setBalanceResult(data);
        if (onMessage) {
          onMessage(`Checked balance for ${walletAddress} - Total: $${data.totalUsdValue.toFixed(2)}`);
        }
      } else {
        setError(data.error || 'Failed to fetch balance');
      }
    } catch (error) {
      setError('Failed to connect to wallet balance agent');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBalance = (balance: string, decimals: number) => {
    const num = parseFloat(balance);
    return num.toFixed(6);
  };

  const getTokenTypeIcon = (isNative: boolean) => {
    return isNative ? <Coins className="w-4 h-4 text-yellow-500" /> : <Network className="w-4 h-4 text-blue-500" />;
  };

  const getTokenTypeBadge = (isNative: boolean) => {
    return (
      <Badge variant={isNative ? 'default' : 'secondary'} className="ml-2">
        {isNative ? 'Native Token' : 'ERC20 Token'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Multi-Network Wallet Balance Agent
            {agentStatus === 'online' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {agentStatus === 'offline' && <AlertTriangle className="w-4 h-4 text-red-500" />}
            {agentStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Input Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="walletAddress">Wallet Address</Label>
                <Input
                  id="walletAddress"
                  placeholder="0x... or 0.0.123456"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map((network) => (
                      <SelectItem key={network.id} value={network.id}>
                        <div>
                          <div className="font-medium">{network.name}</div>
                          <div className="text-sm text-muted-foreground">{network.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleBalanceCheck} 
              disabled={isLoading || agentStatus !== 'online'}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Balance...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Check Balance
                </>
              )}
            </Button>

            {/* Example Addresses */}
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Example addresses:</p>
              <div className="space-y-1 font-mono text-xs">
                <div>Ethereum: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045</div>
                <div>Polygon: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6</div>
                <div>Hedera: 0.0.123456</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Balance Results */}
      {balanceResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Balance Report</span>
              <Badge variant="outline" className="text-lg font-bold">
                ${balanceResult.totalUsdValue.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Wallet:</span>
                  <span className="ml-2 font-mono">{balanceResult.walletAddress}</span>
                </div>
                <div>
                  <span className="font-medium">Networks:</span>
                  <span className="ml-2">{Object.keys(balanceResult.networks).length}</span>
                </div>
              </div>

              {/* Network Results */}
              {Object.entries(balanceResult.networks).map(([networkId, networkData]) => (
                <div key={networkId} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{networkData.networkName}</h3>
                    <Badge variant="outline" className="text-base font-bold">
                      ${networkData.totalUsdValue.toFixed(2)}
                    </Badge>
                  </div>

                  {/* Native Token Balance */}
                  {networkData.nativeBalance && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getTokenTypeIcon(networkData.nativeBalance.token.isNative)}
                        <span className="font-medium">{networkData.nativeBalance.token.name}</span>
                        {getTokenTypeBadge(networkData.nativeBalance.token.isNative)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Balance:</span>
                          <span className="ml-2 font-mono">
                            {formatBalance(networkData.nativeBalance.balanceFormatted, networkData.nativeBalance.token.decimals)} {networkData.nativeBalance.token.symbol}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">USD Value:</span>
                          <span className="ml-2 font-semibold">${networkData.nativeBalance.usdValue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ERC20 Token Balances */}
                  {networkData.tokenBalances && networkData.tokenBalances.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-muted-foreground">ERC20 Tokens:</h4>
                      {networkData.tokenBalances.map((tokenBalance, index) => (
                        <div key={index} className="border-l-2 border-blue-200 pl-4 space-y-2">
                          <div className="flex items-center gap-2">
                            {getTokenTypeIcon(tokenBalance.token.isNative)}
                            <span className="font-medium">{tokenBalance.token.name}</span>
                            {getTokenTypeBadge(tokenBalance.token.isNative)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Balance:</span>
                              <span className="ml-2 font-mono">
                                {formatBalance(tokenBalance.balanceFormatted, tokenBalance.token.decimals)} {tokenBalance.token.symbol}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">USD Value:</span>
                              <span className="ml-2 font-semibold">${tokenBalance.usdValue.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
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
                    <Badge variant="default" className="flex items-center gap-1">
                      <Coins className="w-3 h-3" />
                      Native Tokens
                    </Badge>
                  )}
                  {Object.values(balanceResult.networks).some(network => network.tokenBalances && network.tokenBalances.length > 0) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Network className="w-3 h-3" />
                      ERC20 Tokens
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WalletBalanceAgent;
