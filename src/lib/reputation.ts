/**
 * Shared helpers for on-chain TraderReputation stats (Somnia Shannon).
 * getTraderStats returns:
 * [totalBets, totalWins, totalLosses, totalVolume, totalProfit, winRate, currentStreak, bestStreak, reputationScore]
 */

export type ParsedTraderStats = {
  totalBets: bigint;
  totalWins: bigint;
  totalLosses: bigint;
  totalVolume: bigint;
  totalProfit: bigint;
  winRate: number;
  currentStreak: bigint;
  bestStreak: bigint;
  reputationScore: number;
};

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;
export const TIER_THRESHOLDS = [100, 300, 600, 900, 1000] as const;

/** Map reputation score → UI tier index (0=Bronze … 4=Diamond). */
export function tierFromReputationScore(score: number): number {
  if (score >= 1000) return 4;
  if (score >= 900) return 3;
  if (score >= 600) return 2;
  if (score >= 300) return 1;
  if (score >= 100) return 0;
  return 0;
}

export function nextTierProgress(score: number): { label: string; nextScore: number } {
  const tier = tierFromReputationScore(score);
  if (tier >= TIER_NAMES.length - 1) {
    return { label: 'Maximum tier reached!', nextScore: 1000 };
  }
  // Unranked (<100) still shows Bronze as entry; progress to full Bronze then Silver
  if (score < 100) {
    return { label: `${100 - score} points until Bronze`, nextScore: 100 };
  }
  const nextScore = TIER_THRESHOLDS[tier + 1];
  return {
    label: `${nextScore - score} points until ${TIER_NAMES[tier + 1]}`,
    nextScore,
  };
}

export function parseTraderStats(data: unknown): ParsedTraderStats | null {
  if (data == null) return null;

  let values: unknown[];
  if (Array.isArray(data)) {
    values = data;
  } else if (typeof data === 'object' && data !== null && Symbol.iterator in data) {
    values = Array.from(data as Iterable<unknown>);
  } else {
    return null;
  }

  if (values.length < 9) return null;

  const toBig = (v: unknown) => (typeof v === 'bigint' ? v : BigInt(Number(v ?? 0)));
  const toNum = (v: unknown) =>
    typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : Number(v ?? 0);

  return {
    totalBets: toBig(values[0]),
    totalWins: toBig(values[1]),
    totalLosses: toBig(values[2]),
    totalVolume: toBig(values[3]),
    totalProfit: toBig(values[4]),
    winRate: toNum(values[5]),
    currentStreak: toBig(values[6]),
    bestStreak: toBig(values[7]),
    reputationScore: toNum(values[8]),
  };
}

/** ROI as percent of volume (0 if no volume). */
export function calculateRoiPercent(totalProfit: bigint, totalVolume: bigint): number {
  if (totalVolume <= 0n) return 0;
  return Number((totalProfit * 10000n) / totalVolume) / 100;
}

export function badgeNameFromScore(score: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (score >= 900) return 'platinum';
  if (score >= 600) return 'gold';
  if (score >= 300) return 'silver';
  return 'bronze';
}
