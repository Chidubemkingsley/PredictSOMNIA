import { NextResponse } from 'next/server';

/**
 * GET /api/categories
 * Returns market categories
 */
export async function GET() {
  const categories = [
    {
      id: 'crypto',
      name: 'Crypto',
      description: 'Cryptocurrency price predictions',
      icon: '₿',
      color: '#F7931A',
      marketCount: 0,
    },
    {
      id: 'sports',
      name: 'Sports',
      description: 'Sports event outcomes',
      icon: '⚽',
      color: '#00C853',
      marketCount: 0,
    },
    {
      id: 'politics',
      name: 'Politics',
      description: 'Political events and elections',
      icon: '🗳️',
      color: '#2196F3',
      marketCount: 0,
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      description: 'Movies, music, and pop culture',
      icon: '🎬',
      color: '#E91E63',
      marketCount: 0,
    },
    {
      id: 'technology',
      name: 'Technology',
      description: 'Tech trends and product launches',
      icon: '💻',
      color: '#9C27B0',
      marketCount: 0,
    },
    {
      id: 'business',
      name: 'Business',
      description: 'Company performance and market trends',
      icon: '📈',
      color: '#FF9800',
      marketCount: 0,
    },
  ];

  return NextResponse.json(categories);
}
