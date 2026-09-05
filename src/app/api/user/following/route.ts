import { NextResponse } from 'next/server';

/**
 * GET /api/user/following
 * Get list of traders the user is following for copy trading
 */
export async function GET() {
  try {
    // TODO: Fetch from database/blockchain
    // For now, return mock data
    const followedTraders = [
      {
        id: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'CryptoWhale',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        winRate: 68.5,
        totalTrades: 245,
        followers: 1234,
        totalVolume: 125000,
        roi: 45.2,
        avatar: null,
      },
      {
        id: '0xabcdef1234567890abcdef1234567890abcdef12',
        name: 'AITrader',
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        winRate: 72.3,
        totalTrades: 312,
        followers: 2156,
        totalVolume: 245000,
        roi: 58.7,
        avatar: null,
      },
    ];

    return NextResponse.json({
      success: true,
      data: followedTraders,
    });
  } catch (error) {
    console.error('Error fetching followed traders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch followed traders',
      },
      { status: 500 }
    );
  }
}
