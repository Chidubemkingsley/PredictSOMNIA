// ============================================================================
// Trader Profile Page - On-chain reputation from TraderReputation
// ============================================================================

'use client';

import { use } from 'react';
import { isAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WalletConnect } from '@/components/WalletConnect';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Award,
  Target,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { formatEther } from 'viem';
import {
  useTraderReputation,
  useTraderFollowers,
  useFollowTrader,
} from '@/hooks/useContracts';
import {
  parseTraderStats,
  tierFromReputationScore,
  nextTierProgress,
  calculateRoiPercent,
  badgeNameFromScore,
  TIER_NAMES,
} from '@/lib/reputation';

interface TraderProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function TraderProfilePage({ params }: TraderProfilePageProps) {
  const { id } = use(params);
  const address = isAddress(id) ? id : undefined;

  const { data: reputationData, isLoading, error } = useTraderReputation(address);
  const { data: followersData } = useTraderFollowers(address);
  const { followTrader, isPending } = useFollowTrader();

  const stats = parseTraderStats(reputationData);
  const followerCount = followersData
    ? (followersData as unknown as string[]).length
    : 0;

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Invalid trader address</p>
          <Button asChild>
            <Link href="/leaderboard">Back to Leaderboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading trader profile...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load trader profile</p>
          <Button asChild>
            <Link href="/leaderboard">Back to Leaderboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const totalBets = stats ? Number(stats.totalBets) : 0;
  const totalWins = stats ? Number(stats.totalWins) : 0;
  const winRate = stats ? stats.winRate : 0;
  const reputationScore = stats?.reputationScore ?? 0;
  const totalVolume = stats?.totalVolume ?? 0n;
  const totalProfit = stats?.totalProfit ?? 0n;
  const currentStreak = stats ? Number(stats.currentStreak) : 0;
  const bestStreak = stats ? Number(stats.bestStreak) : 0;
  const roi = calculateRoiPercent(totalProfit, totalVolume);
  const currentTier = tierFromReputationScore(reputationScore);
  const tierProgress = nextTierProgress(reputationScore);
  const badge = badgeNameFromScore(reputationScore);

  const badgeColors = {
    bronze: 'bg-orange-600',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-500',
    platinum: 'bg-purple-500',
  };

  const handleFollow = async () => {
    try {
      await followTrader(address, '0.1', 100);
    } catch {
      // wagmi surfaces errors
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/leaderboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leaderboard
              </Link>
            </Button>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Card className="p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {address.slice(2, 4).toUpperCase()}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-3xl font-bold">
                    {`${address.slice(0, 6)}...${address.slice(-4)}`}
                  </h1>
                  {reputationScore >= 100 && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${badgeColors[badge]}`}
                    >
                      {TIER_NAMES[currentTier].toUpperCase()}
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-4 font-mono text-sm break-all">
                  {address}
                </p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{followerCount} followers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    <span>
                      Score {reputationScore} · {tierProgress.label}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  size="lg"
                  className="w-full md:w-auto"
                  onClick={handleFollow}
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Following...
                    </>
                  ) : (
                    'Follow & Auto-Copy'
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Reputation Score</div>
                  <div className="text-2xl font-bold">{reputationScore}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Win Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {winRate}%
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Trades</div>
                  <div className="text-2xl font-bold">{totalBets}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">ROI</div>
                  <div
                    className={`text-2xl font-bold ${roi > 0 ? 'text-green-600' : roi < 0 ? 'text-red-600' : ''}`}
                  >
                    {roi > 0 ? '+' : ''}
                    {roi.toFixed(1)}%
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold mb-6">Performance Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Winning Trades</span>
                  <span className="font-semibold">{totalWins}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Total Volume</span>
                  <span className="font-semibold">
                    {formatEther(totalVolume)} STT
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Total Profit</span>
                  <span className="font-semibold">
                    {formatEther(totalProfit)} STT
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Current Streak</span>
                  <span className="font-semibold">{currentStreak}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Best Streak</span>
                  <span className="font-semibold">{bestStreak} wins</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Tier</span>
                  <span className="font-semibold">
                    {reputationScore >= 100
                      ? TIER_NAMES[currentTier]
                      : 'Unranked'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-gray-600">Followers</span>
                  <span className="font-semibold">{followerCount}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Next Tier</span>
                  <span className="font-semibold text-sm">{tierProgress.label}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">Ready to Follow?</h3>
              <p className="mb-6 text-blue-100">
                Auto-copy this trader&apos;s predictions on Somnia Shannon
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={handleFollow}
                disabled={isPending}
              >
                Follow & Start Copying
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
