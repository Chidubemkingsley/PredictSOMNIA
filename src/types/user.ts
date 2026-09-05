// ============================================================================
// User Types - Profile, Portfolio, Achievements
// ============================================================================

export type UserTier = 'free' | 'premium';
export type AchievementId = string;

export interface UserProfile {
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  tier: UserTier;

  // Stats
  totalBets: number;
  winRate: number;
  totalProfit: bigint;
  level: number;
  xp: number;

  // Social
  followers: number;
  following: number;

  // Settings
  notifications: boolean;
  emailNotifications: boolean;
  copyTradingEnabled: boolean;

  createdAt: number;
  lastActiveAt: number;
}

export interface UserPortfolio {
  totalValue: bigint;
  availableBalance: bigint;
  lockedInBets: bigint;

  // Copy trading
  followedTraders: number;
  totalCopied: bigint;
  copyTradingProfit: bigint;

  // Direct trading
  directBetsProfit: bigint;

  // Performance
  profitLoss: bigint;
  profitLossPercentage: number;
  roi: number;

  // Recent activity
  recentBets: number;
  activeBets: number;

  // Breakdown
  breakdown: {
    crypto: { bets: number; profit: bigint };
    sports: { bets: number; profit: bigint };
    politics: { bets: number; profit: bigint };
    other: { bets: number; profit: bigint };
  };
}

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  reward: number;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  total?: number;
}

export interface UserAchievements {
  achievements: Achievement[];
  totalUnlocked: number;
  totalRewards: number;
  nextAchievement?: Achievement;
}

export interface Notification {
  id: string;
  type:
    | 'bet_won'
    | 'bet_lost'
    | 'achievement'
    | 'follower'
    | 'copy_trade'
    | 'market_update';
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  link?: string;
  data?: Record<string, unknown>;
}

export interface ReferralStats {
  code: string;
  referrals: number;
  totalEarned: bigint;
  pendingRewards: bigint;
  claimedRewards: bigint;
  referralList: Array<{
    address: string;
    username?: string;
    joinedAt: number;
    totalVolume: bigint;
    earnings: bigint;
  }>;
}
