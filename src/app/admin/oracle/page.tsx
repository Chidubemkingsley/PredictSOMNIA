/**
 * Admin Oracle Dashboard
 * Monitor AI oracle service, resolutions, and performance
 */

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Brain,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Database,
  Zap,
  ExternalLink,
  RefreshCw,
  Loader2,
  Eye,
  Shield,
  Server,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ResolutionRecord {
  marketId: number;
  question: string;
  outcome: boolean;
  confidence: number;
  timestamp: number;
  evidenceCid: string;
  sources: string[];
  processingTime: number;
}

interface ServiceMetrics {
  uptime: number;
  totalResolutions: number;
  avgConfidence: number;
  avgProcessingTime: number;
  successRate: number;
  apiCalls24h: number;
  ipfsUploads: number;
  gasSpent: number;
}

export default function OracleDashboard() {
  const { address: _address, isConnected } = useAccount();
  const [_isAuthorized, setIsAuthorized] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<
    'running' | 'stopped' | 'unknown'
  >('unknown');
  const [metrics, setMetrics] = useState<ServiceMetrics>({
    uptime: 0,
    totalResolutions: 0,
    avgConfidence: 0,
    avgProcessingTime: 0,
    successRate: 0,
    apiCalls24h: 0,
    ipfsUploads: 0,
    gasSpent: 0,
  });
  const [recentResolutions, setRecentResolutions] = useState<
    ResolutionRecord[]
  >([]);
  const [pendingMarkets, setPendingMarkets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In production, check if user is authorized oracle operator
    // For now, allow access if connected
    setIsAuthorized(isConnected);

    if (isConnected) {
      loadDashboardData();
    }
  }, [isConnected]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    // Simulated data - in production, fetch from oracle service API
    setTimeout(() => {
      setServiceStatus('running');
      setMetrics({
        uptime: 172800, // 2 days in seconds
        totalResolutions: 47,
        avgConfidence: 87.5,
        avgProcessingTime: 12.3,
        successRate: 95.7,
        apiCalls24h: 234,
        ipfsUploads: 47,
        gasSpent: 0.0234,
      });

      setRecentResolutions([
        {
          marketId: 5,
          question: 'Will Bitcoin reach $50,000 by end of January 2024?',
          outcome: true,
          confidence: 92.5,
          timestamp: Date.now() - 3600000,
          evidenceCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
          sources: ['CoinGecko', 'Binance', 'GPT-4'],
          processingTime: 8.7,
        },
        {
          marketId: 4,
          question: 'Will Ethereum price be above $2,500 on January 1st?',
          outcome: false,
          confidence: 88.3,
          timestamp: Date.now() - 7200000,
          evidenceCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          sources: ['CoinGecko', 'Binance', 'GPT-4'],
          processingTime: 11.2,
        },
        {
          marketId: 3,
          question: 'Will Somnia Network process over 5M transactions this week?',
          outcome: true,
          confidence: 95.8,
          timestamp: Date.now() - 14400000,
          evidenceCid: 'QmPZ9gcCEpqKTo6aq61g4nZq6Wfm1iMwskY93zqw2rMHDf',
          sources: ['BscScan API', 'GPT-4'],
          processingTime: 15.4,
        },
      ]);

      setPendingMarkets([
        {
          id: 6,
          question: 'Will Solana price exceed $100 by February 2024?',
          endTime: Date.now() + 3600000,
          aiOracleEnabled: true,
        },
        {
          id: 7,
          question: 'Will NFT trading volume increase this month?',
          endTime: Date.now() + 7200000,
          aiOracleEnabled: true,
        },
      ]);

      setIsLoading(false);
    }, 1000);
  };

  if (!isConnected) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Authorization Required</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to access the oracle dashboard
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-purple-500" />
            AI Oracle Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage the AI oracle service
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Service Status */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${
                serviceStatus === 'running'
                  ? 'bg-green-500/10'
                  : 'bg-red-500/10'
              }`}
            >
              <Server
                className={`w-6 h-6 ${
                  serviceStatus === 'running'
                    ? 'text-green-500'
                    : 'text-red-500'
                }`}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Status</p>
              <p className="text-2xl font-bold">
                {serviceStatus === 'running' ? 'Running' : 'Stopped'}
              </p>
              <p className="text-sm text-muted-foreground">
                Uptime: {Math.floor(metrics.uptime / 3600)}h{' '}
                {Math.floor((metrics.uptime % 3600) / 60)}m
              </p>
            </div>
          </div>
          <div className="text-right">
            <Button variant="outline" className="gap-2">
              <Activity className="w-4 h-4" />
              View Logs
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-muted-foreground">Total Resolutions</p>
          </div>
          <p className="text-3xl font-bold">{metrics.totalResolutions}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <p className="text-sm text-muted-foreground">Avg Confidence</p>
          </div>
          <p className="text-3xl font-bold">{metrics.avgConfidence}%</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <p className="text-sm text-muted-foreground">Avg Processing</p>
          </div>
          <p className="text-3xl font-bold">{metrics.avgProcessingTime}s</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </div>
          <p className="text-3xl font-bold">{metrics.successRate}%</p>
        </Card>
      </div>

      {/* API & Resource Usage */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-blue-500" />
            <p className="text-sm font-medium">API Calls (24h)</p>
          </div>
          <p className="text-2xl font-bold mb-2">{metrics.apiCalls24h}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              CoinGecko: {Math.floor(metrics.apiCalls24h * 0.4)}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Binance: {Math.floor(metrics.apiCalls24h * 0.35)}
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              GPT-4: {Math.floor(metrics.apiCalls24h * 0.25)}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-cyan-500" />
            <p className="text-sm font-medium">IPFS Uploads</p>
          </div>
          <p className="text-2xl font-bold mb-2">{metrics.ipfsUploads}</p>
          <p className="text-xs text-muted-foreground">
            Avg size: {(Math.random() * 50 + 20).toFixed(1)} KB
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            <p className="text-sm font-medium">Gas Spent</p>
          </div>
          <p className="text-2xl font-bold mb-2">
            {metrics.gasSpent.toFixed(4)} STT
          </p>
          <p className="text-xs text-muted-foreground">
            ~${(metrics.gasSpent * 300).toFixed(2)} USD
          </p>
        </Card>
      </div>

      {/* Pending Markets */}
      <Card className="p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pending Markets ({pendingMarkets.length})
        </h3>
        <div className="space-y-3">
          {pendingMarkets.length > 0 ? (
            pendingMarkets.map(market => (
              <div
                key={market.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium mb-1">{market.question}</p>
                  <p className="text-sm text-muted-foreground">
                    Ends{' '}
                    {formatDistanceToNow(new Date(market.endTime), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Monitor
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No pending markets
            </p>
          )}
        </div>
      </Card>

      {/* Recent Resolutions */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Recent Resolutions
        </h3>
        <div className="space-y-4">
          {recentResolutions.map(resolution => (
            <div
              key={resolution.marketId}
              className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      Market #{resolution.marketId}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        resolution.outcome
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {resolution.outcome ? 'YES' : 'NO'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(resolution.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="font-medium mb-2">{resolution.question}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${resolution.confidence}%` }}
                      />
                    </div>
                    <span className="font-medium">
                      {resolution.confidence}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Processing Time</p>
                  <p className="font-medium">{resolution.processingTime}s</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Sources</p>
                  <p className="font-medium">
                    {resolution.sources.length} sources
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Evidence</p>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${resolution.evidenceCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    View IPFS
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>Sources:</span>
                {resolution.sources.map((source, i) => (
                  <span key={i} className="px-2 py-0.5 bg-muted rounded">
                    {source}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
