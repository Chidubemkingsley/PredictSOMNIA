// ============================================================================
// React Hooks for Copy Trading Features
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  TraderProfile,
  LeaderboardTrader,
  CopyTradingSettings,
} from '@/types/trader';

// ============================================================================
// Trader Hooks
// ============================================================================

export function useTopTraders(params?: {
  period?: '24h' | '7d' | '30d' | 'all';
  category?: string;
  limit?: number;
}) {
  const { period, category, limit } = params || {};
  return useQuery<LeaderboardTrader[]>({
    queryKey: ['traders', 'leaderboard', period ?? 'all', category ?? 'all', limit ?? 50],
    queryFn: () => api.trader.getLeaderboard(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTraderProfile(traderId: string) {
  return useQuery<TraderProfile>({
    queryKey: ['trader', traderId],
    queryFn: () => api.trader.getTraderProfile(traderId),
    enabled: !!traderId,
  });
}

export function useFollowTrader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      traderId,
      settings,
    }: {
      traderId: string;
      settings: CopyTradingSettings;
    }) => api.trader.followTrader(traderId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'following'] });
      queryClient.invalidateQueries({ queryKey: ['traders'] });
    },
  });
}

export function useUnfollowTrader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (traderId: string) => api.trader.unfollowTrader(traderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'following'] });
    },
  });
}

export function useUpdateCopySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      traderId,
      settings,
    }: {
      traderId: string;
      settings: Partial<CopyTradingSettings>;
    }) => api.trader.updateCopySettings(traderId, settings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', 'following'] });
      queryClient.invalidateQueries({
        queryKey: ['trader', variables.traderId],
      });
    },
  });
}

// ============================================================================
// Market Hooks
// ============================================================================

export function useMarkets(params?: {
  category?: string;
  status?: string;
  sort?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['markets', params],
    queryFn: () => api.market.getAllMarkets(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useMarket(marketId: string) {
  return useQuery({
    queryKey: ['market', marketId],
    queryFn: () => api.market.getMarketById(marketId),
    enabled: !!marketId,
  });
}

export function useTrendingMarkets() {
  return useQuery({
    queryKey: ['markets', 'trending'],
    queryFn: () => api.market.getTrendingMarkets(),
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// User Hooks
// ============================================================================

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => api.user.getProfile(),
  });
}

export function useUserPortfolio() {
  return useQuery({
    queryKey: ['user', 'portfolio'],
    queryFn: () => api.user.getPortfolio(),
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
}

export function useFollowedTraders() {
  return useQuery({
    queryKey: ['user', 'following'],
    queryFn: () => api.user.getFollowedTraders(),
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['user', 'achievements'],
    queryFn: () => api.user.getAchievements(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.user.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}
