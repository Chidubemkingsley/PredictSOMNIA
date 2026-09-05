import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, isAddress } from 'viem';
import { getContractAddress } from '@/lib/contracts/addresses';
import { TRADER_REPUTATION_ABI } from '@/lib/contracts/abis';
import {
  parseTraderStats,
  calculateRoiPercent,
  badgeNameFromScore,
  tierFromReputationScore,
  TIER_NAMES,
} from '@/lib/reputation';

const CHAIN_ID = 50312;
const RPC =
  process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL ||
  process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ||
  'https://dream-rpc.somnia.network';

/**
 * GET /api/traders/[id]
 * Live on-chain trader profile from TraderReputation
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!isAddress(id)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    const client = createPublicClient({
      transport: http(RPC),
    });

    const repAddress = getContractAddress(CHAIN_ID, 'TRADER_REPUTATION') as `0x${string}`;

    const [rawStats, followers] = await Promise.all([
      client.readContract({
        address: repAddress,
        abi: TRADER_REPUTATION_ABI,
        functionName: 'getTraderStats',
        args: [id as `0x${string}`],
      }),
      client.readContract({
        address: repAddress,
        abi: TRADER_REPUTATION_ABI,
        functionName: 'getFollowers',
        args: [id as `0x${string}`],
      }),
    ]);

    const stats = parseTraderStats(rawStats);
    if (!stats) {
      return NextResponse.json({ error: 'Failed to parse stats' }, { status: 500 });
    }

    const reputationScore = stats.reputationScore;
    const roi = calculateRoiPercent(stats.totalProfit, stats.totalVolume);
    const tier = tierFromReputationScore(reputationScore);

    return NextResponse.json({
      address: id,
      username: `${id.slice(0, 6)}...${id.slice(-4)}`,
      verified: false,
      badge: reputationScore >= 100 ? badgeNameFromScore(reputationScore) : undefined,
      reputationScore,
      tier: TIER_NAMES[tier],
      stats: {
        totalBets: Number(stats.totalBets),
        winRate: stats.winRate,
        totalProfit: stats.totalProfit.toString(),
        totalVolume: stats.totalVolume.toString(),
        avgReturn: roi,
        streak: Number(stats.currentStreak),
        bestStreak: Number(stats.bestStreak),
        avgOdds: 0,
        sharpeRatio: 0,
        roi,
      },
      rank: 0,
      followers: (followers as string[]).length,
      following: 0,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      specialties: [],
      monthlyEarnings: '0',
      totalCopyFees: '0',
    });
  } catch (error) {
    console.error('[api/traders/[id]]', error);
    return NextResponse.json(
      { error: 'Failed to load trader profile' },
      { status: 500 }
    );
  }
}
