// ============================================================================
// Leaderboard Page - Full trader rankings
// ============================================================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Leaderboard } from '@/components/copy-trading/Leaderboard';
import { useTopTraders, useFollowTrader, useFollowedTraders } from '@/hooks/use-copy-trading';
import { useFollowTraderGasless, useUnfollowTraderGasless } from '@/hooks/useX402Extended';
import { WalletConnect } from '@/components/WalletConnect';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react';

type TimePeriod = '24h' | '7d' | '30d' | 'all';
type Category = 'all' | 'crypto' | 'sports' | 'politics' | 'entertainment';

export default function LeaderboardPage() {
  const { isConnected } = useAccount();
  const [period, setPeriod] = useState<TimePeriod>('7d');
  const [category, setCategory] = useState<Category>('all');

  const { data: traders, isLoading } = useTopTraders({
    period,
    category: category === 'all' ? undefined : category,
    limit: 50,
  });
  
  const { mutate: followTrader } = useFollowTrader();
  const { data: followedTraders } = useFollowedTraders();
  const { followTraderGasless } = useFollowTraderGasless();
  const { unfollowTraderGasless: _unfollowTraderGasless } = useUnfollowTraderGasless();
  
  const handleFollowTrader = async (traderId: string) => {
    if (!isConnected) {
      alert('Connect your wallet to follow traders');
      return;
    }
    
    // Try gasless first
    const result = await followTraderGasless(traderId, '100', 0.1);
    
    if (!result.success) {
      // Fallback to regular follow
      followTrader(
        { 
          traderId, 
          settings: { 
            traderId,
            enabled: true, 
            allocation: 100,
            maxPerTrade: 0.1
          } 
        },
        {
          onError: (_error) => {
            alert('Failed to follow trader. Please try again.');
          },
        }
      );
    }
  };

  const periods: { value: TimePeriod; label: string }[] = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const categories: { value: Category; label: string; icon: string }[] = [
    { value: 'all', label: 'All Markets', icon: '🌐' },
    { value: 'crypto', label: 'Crypto', icon: '₿' },
    { value: 'sports', label: 'Sports', icon: '⚽' },
    { value: 'politics', label: 'Politics', icon: '🗳️' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>

              <div>
                <h1 className="text-2xl font-bold">Leaderboard</h1>
                <p className="text-sm text-gray-600">Top performing traders</p>
              </div>
            </div>

            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Traders</div>
                  <div className="text-2xl font-bold">
                    {traders?.length || 0}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg Win Rate</div>
                  <div className="text-2xl font-bold">
                    {traders && traders.length > 0
                      ? `${(traders.reduce((sum, t) => sum + t.stats.winRate, 0) / traders.length).toFixed(1)}%`
                      : '0%'}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Volume</div>
                  <div className="text-2xl font-bold">$2.4M+</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-6 mb-6">
            {/* Time Period Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Time Period
              </label>
              <div className="flex flex-wrap gap-2">
                {periods.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      period === p.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      category === cat.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6">
              Top Traders - {periods.find(p => p.value === period)?.label}
            </h2>

            <Leaderboard
              traders={traders || []}
              loading={isLoading}
              onFollowTrader={handleFollowTrader}
              followedTraders={new Set(Array.isArray(followedTraders) ? followedTraders.map(t => t.traderId) : [])}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
