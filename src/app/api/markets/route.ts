import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/markets
 * Returns prediction markets with optional filtering
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const _category = searchParams.get('category');
  const _status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '10');

  // Somnia Shannon — live chain is source of truth (DreamDEX + PredictionMarket 0x67F7...), not mocks
  // If static disabled (NEXT_PUBLIC_USE_STATIC_DATA=false, as in .env.local), return empty so UI falls back to wagmi useAllMarkets
  if (process.env.NEXT_PUBLIC_USE_STATIC_DATA === 'false') {
    return NextResponse.json({ markets: [], total: 0, page: 1, limit });
  }

  // Pure live — no mocks (user requested no mock). Use wagmi useAllMarkets() which reads PredictionMarket 0x67F7… on Somnia Shannon 50312 directly.
  // Keeping API live for future on-chain proxy, but currently returns empty to force chain source.
  const _allMarkets: any[] = [];

  // No filtering needed — _allMarkets is empty when pure live
  const _filteredMarkets: any[] = [];
  const markets: any[] = [];

  return NextResponse.json({
    markets,
    total: 0,
    page: 1,
    limit,
  });
}

/**
 * POST /api/markets
 * Create a new prediction market
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { question, description, category, endTime } = body;

    if (!question || !description || !category || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, this would interact with the smart contract
    const newMarket = {
      id: Date.now().toString(),
      question,
      description,
      category,
      creator: '0x0000000000000000000000000000000000000000',
      endTime,
      totalYesAmount: '0',
      totalNoAmount: '0',
      resolved: false,
      outcome: false,
      resolvedAt: 0,
      aiOracleEnabled: body.aiOracleEnabled || false,
      yesOdds: 50,
      noOdds: 50,
      totalVolume: '0',
      participantCount: 0,
    };

    return NextResponse.json(newMarket, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
