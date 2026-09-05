// ============================================================================
// API Client - Centralized API calls with error handling
// ============================================================================

import { apiConfig } from './config';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${apiConfig.baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new APIError(
        error.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        error.code
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError('Network error', 0);
  }
}

// ============================================================================
// Trader API
// ============================================================================

import type { LeaderboardTrader, TraderProfile } from '@/types/trader';

export const traderAPI = {
  getLeaderboard: async (params?: {
    period?: '24h' | '7d' | '30d' | 'all';
    category?: string;
    limit?: number;
  }): Promise<LeaderboardTrader[]> => {
    const query = new URLSearchParams(
      Object.entries(params || {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    );
    const res = await fetchAPI<
      | { success?: boolean; data?: LeaderboardTrader[] }
      | LeaderboardTrader[]
    >(`${apiConfig.endpoints.topTraders}?${query}`);
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  getTraderProfile: async (id: string): Promise<TraderProfile> => {
    return fetchAPI<TraderProfile>(apiConfig.endpoints.traderProfile(id));
  },

  followTrader: async (
    id: string,
    settings: unknown
  ): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(
      apiConfig.endpoints.followTrader(id),
      {
        method: 'POST',
        body: JSON.stringify(settings),
      }
    );
  },

  unfollowTrader: async (id: string): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(
      apiConfig.endpoints.unfollowTrader(id),
      {
        method: 'POST',
      }
    );
  },

  updateCopySettings: async (
    id: string,
    settings: Record<string, unknown>
  ): Promise<{ success: boolean }> => {
    return fetchAPI<{ success: boolean }>(apiConfig.endpoints.copySettings, {
      method: 'PUT',
      body: JSON.stringify({ traderId: id, ...settings }),
    });
  },

  getTraderStats: async (id: string): Promise<unknown> => {
    return fetchAPI(apiConfig.endpoints.traderStats(id));
  },
};

// ============================================================================
// Market API
// ============================================================================

export const marketAPI = {
  getAllMarkets: async (params?: {
    category?: string;
    status?: string;
    sort?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return fetchAPI(`${apiConfig.endpoints.markets}?${query}`);
  },

  getMarketById: async (id: string) => {
    return fetchAPI(apiConfig.endpoints.marketById(id));
  },

  getTrendingMarkets: async () => {
    return fetchAPI(apiConfig.endpoints.trendingMarkets);
  },

  getMarketStats: async (id: string) => {
    return fetchAPI(apiConfig.endpoints.marketStats(id));
  },
};

// ============================================================================
// User API
// ============================================================================

export const userAPI = {
  getProfile: async () => {
    return fetchAPI(apiConfig.endpoints.profile);
  },

  getPortfolio: async () => {
    return fetchAPI(apiConfig.endpoints.portfolio);
  },

  getFollowedTraders: async () => {
    return fetchAPI(apiConfig.endpoints.followedTraders);
  },

  getFollowers: async () => {
    return fetchAPI(apiConfig.endpoints.followers);
  },

  getAchievements: async () => {
    return fetchAPI(apiConfig.endpoints.achievements);
  },

  getUserStats: async () => {
    return fetchAPI(apiConfig.endpoints.userStats);
  },

  updateProfile: async (data: Record<string, unknown>) => {
    return fetchAPI(apiConfig.endpoints.profile, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ============================================================================
// Export all
// ============================================================================

export const api = {
  trader: traderAPI,
  market: marketAPI,
  user: userAPI,
};
