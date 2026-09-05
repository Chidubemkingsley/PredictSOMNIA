// ============================================================================
// TraderCard Component - Display trader info with follow button
// ============================================================================

'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TraderProfile } from '@/types/trader';
import { formatBigInt, formatPercentage } from '@/lib/utils';

interface TraderCardProps {
  trader: TraderProfile;
  rank?: number;
  onFollow?: () => void;
  isFollowing?: boolean;
  showFollowButton?: boolean;
  compact?: boolean;
}

export function TraderCard({
  trader,
  rank,
  onFollow,
  isFollowing = false,
  showFollowButton = true,
  compact = false,
}: TraderCardProps) {
  const badgeColors = {
    bronze: 'bg-orange-600',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-500',
    platinum: 'bg-purple-500',
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {rank && (
            <div className="text-2xl font-bold text-gray-400">#{rank}</div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">
                {trader.username ||
                  `${trader.address.slice(0, 6)}...${trader.address.slice(-4)}`}
              </h3>

              {trader.verified && (
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}

              {trader.badge && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${badgeColors[trader.badge]}`}
                >
                  {trader.badge.toUpperCase()}
                </span>
              )}
            </div>

            {!compact && trader.bio && (
              <p className="text-sm text-gray-600 mt-1">{trader.bio}</p>
            )}
          </div>
        </div>

        {showFollowButton && onFollow && (
          <Button
            onClick={onFollow}
            variant={isFollowing ? 'outline' : 'default'}
            size="sm"
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-gray-500">Win Rate</div>
          <div className="text-lg font-bold text-green-600">
            {formatPercentage(trader.stats.winRate)}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Total Profit</div>
          <div className="text-lg font-bold">
            {formatBigInt(trader.stats.totalProfit)} STT
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Followers</div>
          <div className="text-lg font-bold">
            {trader.followers.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Streak</div>
          <div className="text-lg font-bold flex items-center gap-1">
            {trader.stats.streak > 0 && <span>🔥</span>}
            {trader.stats.streak}
          </div>
        </div>
      </div>

      {/* Specialties */}
      {!compact && trader.specialties && trader.specialties.length > 0 && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {trader.specialties.map(specialty => (
            <span
              key={specialty}
              className="px-2 py-1 bg-gray-100 rounded text-xs font-medium"
            >
              {specialty}
            </span>
          ))}
        </div>
      )}

      {/* ROI */}
      {!compact && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Average ROI</span>
            <span
              className={`font-semibold ${trader.stats.roi > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {trader.stats.roi > 0 ? '+' : ''}
              {trader.stats.roi.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
