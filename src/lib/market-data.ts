import { Market, MarketCategoryInfo } from '@/types/market';

/**
 * POLYMARKET-STYLE ODDS CALCULATION
 * 
 * How Polymarket works:
 * - Price represents probability (e.g., 65¢ = 65% chance)
 * - If you buy YES at $0.65 and win, you get $1.00 (profit = $0.35)
 * - Potential return = (1 / price) - 1 = (1 / 0.65) - 1 = 53.8% profit
 * 
 * In our parimutuel system:
 * - YES probability = totalNoPool / totalPool (opposite side determines your odds!)
 * - Why? If lots of people bet NO, YES becomes more likely to pay well
 * - This creates a proper prediction market dynamic
 * 
 * Example:
 * - $100 on YES, $300 on NO
 * - YES price = 100 / 400 = 25¢ (25% probability shown)
 * - If YES wins: $100 pool shares $400 total = 4x return (300% profit)
 * - NO price = 300 / 400 = 75¢ (75% probability shown)
 * - If NO wins: $300 pool shares $400 total = 1.33x return (33% profit)
 */
export const calculateMarketOdds = (
  totalYes: bigint,
  totalNo: bigint
): { yesOdds: number; noOdds: number; yesPrice: number; noPrice: number } => {
  const yesNum = Number(totalYes);
  const noNum = Number(totalNo);
  const total = yesNum + noNum;
  
  // Empty market = 50/50
  if (total === 0) {
    return { yesOdds: 50, noOdds: 50, yesPrice: 0.5, noPrice: 0.5 };
  }

  // Calculate prices (probability) - Polymarket style
  // YES price = proportion of pool on YES side
  const yesPrice = yesNum / total;
  const noPrice = noNum / total;
  
  // Convert to percentage odds (displayed as "65%" means 65% probability)
  const yesOdds = yesPrice * 100;
  const noOdds = noPrice * 100;

  return {
    yesOdds: Math.round(yesOdds * 10) / 10,
    noOdds: Math.round(noOdds * 10) / 10,
    yesPrice: Math.round(yesPrice * 100) / 100,
    noPrice: Math.round(noPrice * 100) / 100,
  };
};

/**
 * Calculate potential return Polymarket-style
 * 
 * @param betAmount - Amount to bet
 * @param position - true for YES, false for NO
 * @param totalYes - Total amount bet on YES
 * @param totalNo - Total amount bet on NO
 * @returns Potential profit and payout multiplier
 */
export const calculatePotentialReturn = (
  betAmount: number,
  position: boolean,
  totalYes: number,
  totalNo: number
): { profit: number; payout: number; multiplier: number; newOdds: number } => {
  if (betAmount <= 0) {
    return { profit: 0, payout: 0, multiplier: 1, newOdds: 50 };
  }

  // Calculate new pool after your bet
  const newYes = position ? totalYes + betAmount : totalYes;
  const newNo = position ? totalNo : totalNo + betAmount;
  const newTotal = newYes + newNo;
  
  // Your share of the winning pool
  const winningPool = position ? newYes : newNo;
  const _losingPool = position ? newNo : newYes;
  
  // If you win, you get: (your_bet / winning_pool) * total_pool
  const payout = (betAmount / winningPool) * newTotal;
  const profit = payout - betAmount;
  
  // Multiplier (e.g., 2x means you double your money)
  const multiplier = payout / betAmount;
  
  // Your new odds after betting (how the market moves)
  const newOdds = (winningPool / newTotal) * 100;
  
  return {
    profit: Math.round(profit * 10000) / 10000,
    payout: Math.round(payout * 10000) / 10000,
    multiplier: Math.round(multiplier * 100) / 100,
    newOdds: Math.round(newOdds * 10) / 10,
  };
};

// Format STT amount
export const formatSTT = (amount: bigint): string => {
  const bnb = Number(amount) / 1e18;
  return bnb.toFixed(4);
};

// Format USD amount (with dynamic STT price)
export const formatUSD = (amount: bigint, bnbPrice: number = 600): string => {
  const bnb = Number(amount) / 1e18;
  const usd = bnb * bnbPrice;
  return usd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// API functions to fetch dynamic data
export async function fetchMarketCategories(): Promise<MarketCategoryInfo[]> {
  // TODO: Implement API call to fetch categories from backend or blockchain
  const response = await fetch('/api/categories');
  if (!response.ok) {
    throw new Error('Failed to fetch market categories');
  }
  return response.json();
}

export async function fetchMarkets(
  category?: string,
  searchQuery?: string
): Promise<Market[]> {
  // TODO: Implement API call to fetch markets from blockchain or backend
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (searchQuery) params.append('search', searchQuery);

  const response = await fetch(`/api/markets?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch markets');
  }
  const data = await response.json();
  // API returns { markets: [...], total, page, limit }
  return data.markets || [];
}

export async function fetchMarketById(marketId: string): Promise<Market> {
  // TODO: Implement API call to fetch specific market from blockchain
  const response = await fetch(`/api/markets/${marketId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch market');
  }
  return response.json();
}
