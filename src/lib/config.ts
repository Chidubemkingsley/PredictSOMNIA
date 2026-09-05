// ============================================================================
// Site Configuration - Somnia Shannon Exclusive Prediction Markets (DreamDEX Event Contracts)
// ============================================================================
//
// 🟡 NETWORK SUPPORT: Somnia Shannon (50312) + Somnia Mainnet (5031) — DreamDEX Event Contracts
// Supported: Somnia Mainnet 5031 (STT), Somnia Shannon Testnet 50312 (STT + tUSDC 0x70a86D88... collateral)
// NOT Supported: Ethereum, Polygon, Arbitrum, Somnia 5031/50312 (legacy) or other chains
//
// Why Somnia? 100ms blocks, sub-cent STT gas, EIP-3009 WSOMNIA3009 gasless, DreamDEX CLOB + OracleHub 0xe40db387...
// Collateral: tUSDC 0x70a86D88... (6d Shannon, faucet cap 10k) / USDso 0x00000022... (18d Mainnet)
// See: /docs/SOMNIA_SHANNON_GUIDE.md + docs.dreamdex.io/developers/event-contracts
// Legacy STT docs: /docs/STT_CHAIN_EXCLUSIVE.md (deprecated)
// ============================================================================

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'PredictSOMNIA',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Somnia Network Exclusive - Follow Top Traders. Auto-Copy Their Predictions. Earn While You Learn.',
  tagline: 'Copy Trading for Prediction Markets on Somnia Network',
  url: process.env.NEXT_PUBLIC_SITE_URL || '',
  ogImage: process.env.NEXT_PUBLIC_OG_IMAGE || '',

  // Network Configuration - Somnia Shannon + Mainnet (DreamDEX Event Contracts)
  network: {
    name: 'Somnia Network',
    mainnet: {
      chainId: 5031,
      name: 'Somnia Mainnet',
      nativeCurrency: 'STT',
      rpcUrl: 'https://api.infra.mainnet.somnia.network',
      explorer: 'https://explorer.somnia.network',
    },
    testnet: {
      chainId: 50312,
      name: 'Somnia Shannon Testnet',
      nativeCurrency: 'STT',
      rpcUrl: 'https://dream-rpc.somnia.network',
      explorer: 'https://shannon-explorer.somnia.network',
      faucet: 'https://shannon-explorer.somnia.network', // + tUSDC faucet via CollateralRouter 0x70a86D... cap 10k
    },
    // DreamDEX Event Contracts addresses (CREATE3, same on 50312 + 5031)
    dreamDEX: {
      BinaryMarketsModule: '0x3ecC694Cef705358864a646142ac17A90E29e388' as const,
      OutcomeToken6909: '0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9' as const,
      OracleHub: '0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b' as const,
      CollateralRouterShannon: '0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C' as const,
      tUSDCShannon: '0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E' as const,
      USDsoMainnet: '0x00000022dA000002656c64D9eA6011ea952D008A' as const,
    },
  },

  links: {
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || '',
    github: process.env.NEXT_PUBLIC_GITHUB_URL || '',
    discord: process.env.NEXT_PUBLIC_DISCORD_URL || '',
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || '',
  },

  social: {
    twitterHandle: '@PredictSOMNIA',
    discordInvite: 'https://discord.gg/somnia',
  },
} as const;

// ============================================================================
// API Configuration
// ============================================================================

export const apiConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',

  endpoints: {
    // Copy Trading
    topTraders: '/traders/leaderboard',
    traderProfile: (id: string) => `/traders/${id}`,
    followTrader: (id: string) => `/traders/${id}/follow`,
    unfollowTrader: (id: string) => `/traders/${id}/unfollow`,
    copySettings: '/user/copy-settings',
    traderStats: (id: string) => `/traders/${id}/stats`,

    // Markets
    markets: '/markets',
    marketById: (id: string) => `/markets/${id}`,
    trendingMarkets: '/markets/trending',

    // User
    profile: '/user/profile',
    portfolio: '/user/portfolio',
    followedTraders: '/user/following',
    followers: '/user/followers',
    achievements: '/user/achievements',

    // Analytics
    marketStats: (id: string) => `/analytics/market/${id}`,
    userStats: '/analytics/user',
  },

  // External APIs
  oracleApiUrl: process.env.NEXT_PUBLIC_ORACLE_API_URL || '',
  marketDataUrl: process.env.NEXT_PUBLIC_MARKET_DATA_URL || '',
} as const;

// ============================================================================
// Copy Trading Configuration
// ============================================================================

export const copyTradingConfig = {
  fees: {
    copyFee: 5, // 5% of follower profits go to trader
    platformFee: 5, // 5% platform fee on copy trades
    standardTradeFee: 2, // 2% on direct trades
  },

  limits: {
    free: {
      maxFollowedTraders: 3,
      maxCopyAmount: 1, // 1 STT max per copy
      dailyLimit: 10, // 10 STT daily
    },
    premium: {
      maxFollowedTraders: 20,
      maxCopyAmount: 10,
      dailyLimit: 100,
    },
  },

  defaults: {
    copyPercentage: 50, // Default 50% of trader's bet size
    maxPerTrade: 0.1, // Default max 0.1 STT per trade
    stopLoss: 20, // Default 20% stop loss
  },

  verification: {
    minTradesForLeaderboard: 50,
    minDaysHistory: 30,
    kycRequiredForTop10: true,
  },

  badges: {
    bronze: { minFollowers: 10, color: '#CD7F32', title: 'Bronze Trader' },
    silver: { minFollowers: 100, color: '#C0C0C0', title: 'Silver Trader' },
    gold: { minFollowers: 500, color: '#FFD700', title: 'Gold Trader' },
    platinum: {
      minFollowers: 1000,
      color: '#E5E4E2',
      title: 'Platinum Trader',
    },
  },
} as const;

// ============================================================================
// Premium Susomniaription
// ============================================================================

export const premiumConfig = {
  price: {
    monthly: {
      usd: 19,
      stt: 0.05, // Approximate STT on Somnia Shannon (was STT)
    },
    yearly: {
      usd: 190, // 2 months free
      stt: 0.5,
    },
  },

  features: [
    'Follow unlimited traders',
    'Zero copy trading fees',
    'Advanced analytics dashboard',
    'Custom alerts & notifications',
    'Early access to new markets',
    'Priority customer support',
    'API access',
    'Exclusive trader insights',
  ],
} as const;

// ============================================================================
// Gamification Configuration
// ============================================================================

export const gamificationConfig = {
  achievements: [
    { id: 'first_follow', name: 'First Follow', reward: 5, icon: '👥' },
    { id: 'first_win', name: 'First Win', reward: 10, icon: '🎯' },
    { id: 'streak_5', name: '5 Win Streak', reward: 25, icon: '🔥' },
    { id: 'streak_10', name: '10 Win Streak', reward: 50, icon: '⚡' },
    { id: 'follower_10', name: '10 Followers', reward: 50, icon: '⭐' },
    { id: 'follower_100', name: '100 Followers', reward: 200, icon: '💎' },
    { id: 'profit_1000', name: '$1K Profit', reward: 100, icon: '💰' },
    { id: 'profit_10000', name: '$10K Profit', reward: 500, icon: '🏆' },
  ],

  referralProgram: {
    referrerBonus: 10, // 10% of referee's copy fees (lifetime)
    refereeBonus: 5, // $5 signup bonus
    lifetime: true,
  },

  levels: {
    novice: { min: 0, max: 100, title: 'Novice Predictor' },
    trader: { min: 100, max: 500, title: 'Skilled Trader' },
    expert: { min: 500, max: 2000, title: 'Expert Trader' },
    master: { min: 2000, max: 10000, title: 'Master Trader' },
    legend: { min: 10000, max: Infinity, title: 'Legendary Oracle' },
  },
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const featureFlags = {
  copyTrading: true,
  premiumSusomniaription: true,
  achievements: true,
  referrals: true,
  aiInsights: false, // Coming soon
  liveMarkets: false, // Coming soon
  socialFeed: false, // Coming soon
} as const;
