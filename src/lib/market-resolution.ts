/**
 * Past-year market soft-resolution fallback.
 * On the 2026-09-04 Shannon redeploy, markets #1–#3 are already force-resolved on-chain.
 * This map covers any leftover IDs / old deployment UX if needed.
 */

export type SoftResolution = {
  marketId: number;
  outcome: boolean;
  reason: string;
  resolvedAt: number;
};

export function contentYear(): number {
  return new Date().getFullYear();
}

/** Legacy soft maps (old PM). New PM settles #1–3 on-chain via forceResolve. */
const PAST_YEAR_RESOLUTIONS: SoftResolution[] = [];

const byId = new Map(PAST_YEAR_RESOLUTIONS.map((r) => [r.marketId, r]));

export function getSoftResolution(marketId: number): SoftResolution | undefined {
  if (contentYear() < 2026) return undefined;
  return byId.get(marketId);
}

export function isSoftResolved(marketId: number): boolean {
  return !!getSoftResolution(marketId);
}

export function isStale2025Question(question: string): boolean {
  const q = question.toLowerCase();
  if (!q.includes('2025')) return false;
  if (q.includes('2025-2026') || q.includes('2025/2026')) return false;
  if (q.includes('2026') || q.includes('2027')) return false;
  return true;
}

export type MarketLike = {
  id: number;
  question: string;
  resolved: boolean;
  outcome: boolean;
  resolvedAt?: number;
  endTime?: number;
};

export function applySoftResolution<T extends MarketLike>(market: T): T & {
  softResolved: boolean;
  resolutionNote?: string;
  bettingClosed: boolean;
} {
  const soft = getSoftResolution(market.id);
  const chainEnded =
    typeof market.endTime === 'number' &&
    market.endTime > 0 &&
    Date.now() / 1000 >= market.endTime;

  if (market.resolved) {
    return {
      ...market,
      softResolved: false,
      bettingClosed: true,
    };
  }

  if (soft) {
    return {
      ...market,
      resolved: true,
      outcome: soft.outcome,
      resolvedAt: soft.resolvedAt,
      softResolved: true,
      resolutionNote: soft.reason,
      bettingClosed: true,
    };
  }

  // Past-year wording still open on-chain → close betting in app
  const staleOpen = isStale2025Question(market.question);
  return {
    ...market,
    softResolved: false,
    bettingClosed: chainEnded || staleOpen,
  };
}
