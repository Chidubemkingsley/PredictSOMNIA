import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { getContractAddress } from '@/lib/contracts/addresses';
import { TRADER_REPUTATION_ABI } from '@/lib/contracts/abis';
import { parseTraderStats, calculateRoiPercent, badgeNameFromScore } from '@/lib/reputation';
import { getDiscoveredTraders } from '@/lib/trader-registry';

const CHAIN_ID = 50312;
const RPC = process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const leaderboardCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 20_000;

/**
 * GET /api/traders/leaderboard
 * Live rankings for every discovered trader (registry + Shannon explorer logs).
 * Shared across all users — not per-wallet. Consistent across all timeframes.
 * period/category are echoed for UI but do NOT filter (all-time reputationScore sorted).
 * Cached 20s server-side, no-store client-side.
 * New wallets appear after they place bets / emit reputation events.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const period = (searchParams.get('period') || 'all') as string;
  const category = (searchParams.get('category') || 'all') as string;
  const cacheKey = `${period}:${category}:${limit}`;
  const cached = leaderboardCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    const res = NextResponse.json(cached.data);
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
    res.headers.set('X-Cache', 'HIT');
    return res;
  }
  try {
    const client = createPublicClient({ transport: http(RPC, { timeout: 8000 }) });
    const repAddress = getContractAddress(CHAIN_ID, 'TRADER_REPUTATION') as `0x${string}`;
    const addresses = await Promise.race([
      getDiscoveredTraders(),
      new Promise<string[]>((_, rej) => setTimeout(() => rej(new Error('discovery timeout')), 6000)),
    ]).catch((e) => {
      console.warn('[leaderboard] discovery fallback', e);
      return [] as string[];
    });
    const addrs = addresses.length ? addresses : ['0x90356CF97B3BF1749A604d3F89b3DF3602A459E3'];
    const rows = await Promise.all(
      addrs.map(async (address) => {
        try {
          const [rawStats, rawFull, followers] = await Promise.all([
            client.readContract({ address: repAddress, abi: TRADER_REPUTATION_ABI, functionName: 'getTraderStats', args: [address as `0x${string}`] }),
            client.readContract({ address: repAddress, abi: TRADER_REPUTATION_ABI, functionName: 'traderStats', args: [address as `0x${string}`] }).catch(() => null),
            client.readContract({ address: repAddress, abi: TRADER_REPUTATION_ABI, functionName: 'getFollowers', args: [address as `0x${string}`] }).catch(() => [] as string[]),
          ]);
          const stats = parseTraderStats(rawStats);
          if (!stats || stats.totalBets === 0n) return null;
          let lastActiveMs = Date.now();
          if (rawFull && Array.isArray(rawFull) && (rawFull as unknown[]).length >= 9) {
            try {
              const ts = Number((rawFull as unknown[])[8]);
              if (ts > 1000000) lastActiveMs = ts * 1000;
            } catch {}
          }
          const reputationScore = stats.reputationScore;
          const roi = calculateRoiPercent(stats.totalProfit, stats.totalVolume);
          const volumeEth = formatEther(stats.totalVolume);
          const badge = reputationScore >= 100 ? badgeNameFromScore(reputationScore) : undefined;
          return {
            id: address,
            address,
            username: `${address.slice(0, 6)}...${address.slice(-4)}`,
            avatar: null,
            verified: false,
            badge,
            stats: {
              totalBets: Number(stats.totalBets),
              totalWins: Number(stats.totalWins),
              totalLosses: Number(stats.totalLosses),
              winRate: stats.winRate,
              totalVolume: volumeEth,
              totalProfit: formatEther(stats.totalProfit),
              avgReturn: roi,
              streak: Number(stats.currentStreak),
              bestStreak: Number(stats.bestStreak),
              avgOdds: 0,
              sharpeRatio: 0,
              roi,
              currentStreak: Number(stats.currentStreak),
              reputationScore,
              averageBetSize: stats.totalBets > 0n ? formatEther(stats.totalVolume / stats.totalBets) : '0',
            },
            badges: badge ? [{ name: `${badge} Trader`, tier: reputationScore >= 900 ? 4 : reputationScore >= 600 ? 3 : reputationScore >= 300 ? 2 : 1, unlockedAt: Date.now() }] : [],
            specialties: [],
            followers: (followers as string[]).length,
            following: 0,
            isVerified: false,
            joinedAt: lastActiveMs,
            lastActiveAt: lastActiveMs,
            change24h: 0,
            profit24h: '0',
            profit7d: '0',
            profit30d: '0',
            rank: 0,
            monthlyEarnings: '0',
            totalCopyFees: '0',
          };
        } catch (e) {
          console.warn('[leaderboard] skip', address, e);
          return null;
        }
      })
    );
    const topTraders = rows.filter((r): r is NonNullable<typeof r> => r != null).sort((a, b) => b.stats.reputationScore - a.stats.reputationScore).slice(0, limit).map((t, i) => ({ ...t, rank: i + 1 }));
    const payload = { success: true, data: topTraders, count: topTraders.length, discovered: addrs.length, period, category, timestamp: Date.now() };
    leaderboardCache.set(cacheKey, { data: payload, expires: Date.now() + CACHE_TTL_MS });
    const res = NextResponse.json(payload);
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
    res.headers.set('X-Cache', 'MISS');
    return res;
  } catch (error) {
    console.error('[api/traders/leaderboard]', error);
    const stale = leaderboardCache.get(cacheKey);
    if (stale) {
      const res = NextResponse.json(stale.data);
      res.headers.set('Cache-Control', 'no-store, must-revalidate');
      res.headers.set('X-Cache', 'STALE');
      return res;
    }
    if (leaderboardCache.size) {
      const any = leaderboardCache.values().next().value as { data: unknown };
      const res = NextResponse.json(any.data);
      res.headers.set('Cache-Control', 'no-store, must-revalidate');
      res.headers.set('X-Cache', 'STALE-ANY');
      return res;
    }
    const fallback = {
      success: true,
      data: [{ id: '0x90356CF97B3BF1749A604d3F89b3DF3602A459E3', address: '0x90356CF97B3BF1749A604d3F89b3DF3602A459E3', username: '0x9035...59E3', avatar: null, verified: false, badge: 'bronze', stats: { totalBets: 1, totalWins: 0, totalLosses: 0, winRate: 0, totalVolume: '0.1', totalProfit: '0', avgReturn: 0, streak: 0, bestStreak: 0, avgOdds: 0, sharpeRatio: 0, roi: 0, currentStreak: 0, reputationScore: 100, averageBetSize: '0.1' }, badges: [{ name: 'bronze Trader', tier: 1, unlockedAt: Date.now() }], specialties: [], followers: 0, following: 0, isVerified: false, joinedAt: Date.now(), lastActiveAt: Date.now(), change24h: 0, profit24h: '0', profit7d: '0', profit30d: '0', rank: 1, monthlyEarnings: '0', totalCopyFees: '0' }],
      count: 1, discovered: 1, period, category, timestamp: Date.now(), fallback: true,
    };
    const res = NextResponse.json(fallback);
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
    res.headers.set('X-Cache', 'FALLBACK');
    return res;
  }
}
