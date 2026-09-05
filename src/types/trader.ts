// ============================================================================
// Trader Types - Copy Trading System
// ============================================================================

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TraderStats {
  totalBets: number;
  winRate: number;
  totalProfit: bigint;
  totalVolume: bigint;
  avgReturn: number;
  streak: number;
  bestStreak: number;
  avgOdds: number;
  sharpeRatio: number;
  roi: number;
}

export interface TraderProfile {
  address: string;
  username: string;
  avatar?: string;
  bio?: string;
  verified: boolean;
  badge?: BadgeTier;

  // Stats
  stats: TraderStats;
  rank: number;
  followers: number;
  following: number;

  // Trading info
  joinedAt: number;
  lastActiveAt: number;
  specialties: string[];

  // Earnings
  monthlyEarnings: bigint;
  totalCopyFees: bigint;
}

export interface LeaderboardTrader extends TraderProfile {
  change24h: number; // Rank change in last 24h
  profit24h: bigint;
  profit7d: bigint;
  profit30d: bigint;
}

export interface CopyTradingSettings {
  traderId: string;
  enabled: boolean;
  allocation: number; // Percentage of trader's bet to copy (1-100)
  maxPerTrade: number; // Max amount in STT per trade
  stopLoss?: number; // Stop copying if down X%
  categories?: string[]; // Only copy specific categories
  minOdds?: number; // Only copy if odds >= X
  maxOdds?: number; // Only copy if odds <= X
}

export interface FollowedTrader {
  trader: TraderProfile;
  settings: CopyTradingSettings;
  performance: {
    totalCopied: number;
    wins: number;
    losses: number;
    profit: bigint;
    roi: number;
  };
  followedAt: number;
}

export interface TraderActivity {
  id: string;
  traderId: string;
  type: 'bet_placed' | 'bet_won' | 'bet_lost' | 'achievement';
  marketId?: string;
  amount?: bigint;
  odds?: number;
  profit?: bigint;
  timestamp: number;
  message: string;
}

export interface TraderInsight {
  traderId: string;
  insight: string;
  confidence: number;
  category: string;
  timestamp: number;
}
