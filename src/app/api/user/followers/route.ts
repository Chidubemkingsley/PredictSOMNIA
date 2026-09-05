import { NextResponse } from 'next/server';

/**
 * GET /api/user/followers
 * Get list of users following this trader
 */
export async function GET() {
  try {
    // TODO: Fetch from database/blockchain
    // For now, return mock data
    const followers = [
      {
        id: '0x2234567890abcdef1234567890abcdef12345678',
        name: 'Trader123',
        address: '0x2234567890abcdef1234567890abcdef12345678',
        followedAt: new Date().toISOString(),
        avatar: null,
      },
      {
        id: '0x3234567890abcdef1234567890abcdef12345678',
        name: 'InvestorPro',
        address: '0x3234567890abcdef1234567890abcdef12345678',
        followedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        avatar: null,
      },
    ];

    return NextResponse.json({
      success: true,
      data: followers,
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch followers',
      },
      { status: 500 }
    );
  }
}
