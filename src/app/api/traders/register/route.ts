import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { registerTrader } from '@/lib/trader-registry';

/**
 * POST /api/traders/register
 * Body: { address: "0x..." }
 * Registers a wallet so it appears on the leaderboard after first activity.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body?.address as string | undefined;
    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }
    await registerTrader(address);
    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error('[api/traders/register]', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
