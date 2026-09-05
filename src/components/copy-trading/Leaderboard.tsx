// ============================================================================
// Leaderboard Table Component
// ============================================================================

'use client';

import { TraderCard } from './TraderCard';
import type { LeaderboardTrader } from '@/types/trader';

interface LeaderboardProps {
  traders: LeaderboardTrader[];
  onFollowTrader?: (traderId: string) => void;
  followedTraders?: Set<string>;
  loading?: boolean;
}

export function Leaderboard({
  traders,
  onFollowTrader,
  followedTraders = new Set(),
  loading = false,
}: LeaderboardProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  // Ensure traders is always an array
  const tradersList = Array.isArray(traders) ? traders : [];

  if (tradersList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No traders found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tradersList.map((trader, index) => (
        <TraderCard
          key={trader.address}
          trader={trader}
          rank={index + 1}
          onFollow={() => onFollowTrader?.(trader.address)}
          isFollowing={followedTraders.has(trader.address)}
          showFollowButton={!!onFollowTrader}
        />
      ))}
    </div>
  );
}
