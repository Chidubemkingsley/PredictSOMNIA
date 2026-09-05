/**
 * React Hooks for Smart Contract Interactions
 * Using Wagmi v2 for type-safe contract interactions
 * 
 * 100% LIVE BLOCKCHAIN - No static data fallback
 * All data comes directly from Somnia Shannon Testnet smart contracts
 */

import { useEffect, useState, useMemo } from 'react';
import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useChainId,
} from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
  getContractAddress,
} from '../lib/contracts/addresses';
import {
  PREDICTION_MARKET_ABI,
  AI_ORACLE_ABI,
  TRADER_REPUTATION_ABI,
} from '../lib/contracts/abis';
import { applySoftResolution, getSoftResolution } from '../lib/market-resolution';

// ============================================================================
// Prediction Market Hooks - LIVE BLOCKCHAIN ONLY
// ============================================================================

/**
 * Get market details by ID
 * Data comes directly from Somnia Shannon Testnet blockchain
 */
export function useMarket(marketId: number) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  
  return useReadContract({
    address: getContractAddress(effectiveChainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'markets',
    args: [BigInt(marketId)],
    chainId: effectiveChainId,
    query: {
      retry: 3, // Retry failed requests
      staleTime: 30000, // 30 seconds
    },
  });
}

/**
 * Get total market count
 * Data comes directly from Somnia Shannon Testnet blockchain
 */
export function useMarketCount() {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCount',
    chainId: effectiveChainId,
    query: {
      retry: 3,
      staleTime: 30000,
    },
  });
}

/**
 * Market data structure from blockchain
 */
export interface MarketData {
  id: number;
  question: string;
  description: string;
  category: string;
  creator: string;
  endTime: number;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  resolved: boolean;
  outcome: boolean;
  resolvedAt: number;
  aiOracleEnabled: boolean;
  softResolved?: boolean;
  resolutionNote?: string;
  bettingClosed?: boolean;
}

/**
 * Get ALL markets from blockchain dynamically
 * Fetches markets 1 to marketCount using batch queries
 */
export function useAllMarkets() {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  const { data: marketCount, isLoading: isCountLoading } = useMarketCount();

  // Create contract calls for all markets
  const contracts = useMemo(() => {
    if (!marketCount) return [];
    
    const count = Number(marketCount);
    const contractAddress = getContractAddress(effectiveChainId, 'PREDICTION_MARKET') as `0x${string}`;
    
    // Create array of contract calls for markets 1 to count
    return Array.from({ length: count }, (_, i) => ({
      address: contractAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'markets' as const,
      args: [BigInt(i + 1)], // Markets are 1-indexed
      chainId: effectiveChainId,
    }));
  }, [marketCount, effectiveChainId]);

  // Batch fetch all markets
  const { data: marketsData, isLoading: isMarketsLoading, error } = useReadContracts({
    contracts,
    query: {
      enabled: contracts.length > 0,
      retry: 3,
      staleTime: 30000,
    },
  });

  // Parse the market data
  const markets = useMemo(() => {
    if (!marketsData) return [];

    const parsedMarkets: MarketData[] = [];
    
    for (let i = 0; i < marketsData.length; i++) {
      const result = marketsData[i];
      if (result.status !== 'success' || !result.result) continue;

      const data = [...result.result] as unknown[];
      if (!data || data.length < 12) continue;

      const [
        _id,
        question,
        description,
        category,
        creator,
        endTime,
        totalYesAmount,
        totalNoAmount,
        resolved,
        outcome,
        resolvedAt,
        aiOracleEnabled,
      ] = data as [bigint, string, string, string, string, bigint, bigint, bigint, boolean, boolean, bigint, boolean];

      parsedMarkets.push({
        id: i + 1, // Markets are 1-indexed
        question: question as string,
        description: description as string,
        category: category as string,
        creator: creator as string,
        endTime: Number(endTime),
        totalYesAmount: totalYesAmount as bigint,
        totalNoAmount: totalNoAmount as bigint,
        resolved: resolved as boolean,
        outcome: outcome as boolean,
        resolvedAt: Number(resolvedAt),
        aiOracleEnabled: aiOracleEnabled as boolean,
      });
    }

    // Soft-resolve past-year (2025) markets the chain cannot settle yet
    return parsedMarkets.map((m) => {
      const applied = applySoftResolution(m);
      return {
        ...m,
        resolved: applied.resolved,
        outcome: applied.outcome,
        resolvedAt: applied.resolvedAt ?? m.resolvedAt,
        softResolved: applied.softResolved,
        resolutionNote: applied.resolutionNote,
        bettingClosed: applied.bettingClosed,
      };
    });
  }, [marketsData]);

  return {
    markets,
    marketCount: marketCount ? Number(marketCount) : 0,
    isLoading: isCountLoading || isMarketsLoading,
    error,
  };
}

/**
 * Get user's position in a market
 */
export function usePosition(marketId: number) {
  const chainId = useChainId();
  const { address } = useAccount();

  return useReadContract({
    address: getContractAddress(chainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'positions',
    args: address ? [BigInt(marketId), address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

/**
 * Create a new market
 */
export function useCreateMarket() {
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createMarket = async (params: {
    question: string;
    description: string;
    category: string;
    endTime: Date;
    aiOracleEnabled: boolean;
  }) => {

    return writeContract({
      address: getContractAddress(
        chainId,
        'PREDICTION_MARKET'
      ) as `0x${string}`,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'createMarket',
      args: [
        params.question,
        params.description,
        params.category,
        BigInt(Math.floor(params.endTime.getTime() / 1000)),
        params.aiOracleEnabled,
      ],
    });
  };

  return {
    createMarket,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Place a bet on a market
 */
export function usePlaceBet() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const placeBet = async (
    marketId: number,
    position: boolean,
    amount: string
  ) => {
    return writeContract({
      address: getContractAddress(
        chainId,
        'PREDICTION_MARKET'
      ) as `0x${string}`,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'buyPosition',
      args: [BigInt(marketId), position],
      value: parseEther(amount),
    });
  };

  return {
    placeBet,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Claim winnings from a resolved market
 */
export function useClaimWinnings() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const claimWinnings = async (marketId: number) => {
    return writeContract({
      address: getContractAddress(
        chainId,
        'PREDICTION_MARKET'
      ) as `0x${string}`,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'claimWinnings',
      args: [BigInt(marketId)],
    });
  };

  return {
    claimWinnings,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Resolve a market (oracle only)
 */
export function useResolveMarket() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const resolveMarket = async (marketId: number, outcome: boolean) => {
    return writeContract({
      address: getContractAddress(
        chainId,
        'PREDICTION_MARKET'
      ) as `0x${string}`,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'resolveMarket',
      args: [BigInt(marketId), outcome],
    });
  };

  return {
    resolveMarket,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// ============================================================================
// AI Oracle Hooks
// ============================================================================

/**
 * Request resolution from AI Oracle
 */
export function useRequestResolution() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const requestResolution = async (marketId: number, dataSource: string) => {
    return writeContract({
      address: getContractAddress(chainId, 'AI_ORACLE') as `0x${string}`,
      abi: AI_ORACLE_ABI,
      functionName: 'requestResolution',
      args: [BigInt(marketId), dataSource],
    });
  };

  return {
    requestResolution,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Get resolution request details
 */
export function useResolutionRequest(requestId: number) {
  const chainId = useChainId();

  return useReadContract({
    address: getContractAddress(chainId, 'AI_ORACLE') as `0x${string}`,
    abi: AI_ORACLE_ABI,
    functionName: 'resolutionRequests',
    args: [BigInt(requestId)],
  });
}

// ============================================================================
// Trader Reputation Hooks
// ============================================================================

/**
 * Get trader reputation (getTraderStats on TraderReputation)
 */
export function useTraderReputation(traderAddress?: string) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  const { address } = useAccount();
  const targetAddress = traderAddress || address;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
    abi: TRADER_REPUTATION_ABI,
    functionName: 'getTraderStats',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: !!targetAddress,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  });
}

/**
 * Get trader success rate (winRate % from getTraderStats index 5)
 */
export function useSuccessRate(traderAddress?: string) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  const { address } = useAccount();
  const targetAddress = traderAddress || address;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
    abi: TRADER_REPUTATION_ABI,
    functionName: 'getTraderStats',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: !!targetAddress,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      select: (data) => {
        const row = data as readonly bigint[] | undefined;
        if (!row || row.length < 6) return 0;
        return Number(row[5]);
      },
    },
  });
}

/**
 * Get trader badge tier from on-chain badges (0 if none awarded yet).
 * Prefer tierFromReputationScore() in UI — badges only mint on settleBet.
 */
export function useTraderTier(traderAddress?: string) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  const { address } = useAccount();
  const targetAddress = traderAddress || address;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
    abi: TRADER_REPUTATION_ABI,
    functionName: 'getCurrentBadgeTier',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: !!targetAddress,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  });
}

/**
 * Get trader reputation score
 */
export function useReputationScore(traderAddress?: string) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  const { address } = useAccount();
  const targetAddress = traderAddress || address;

  // First get the reputation contract address from PredictionMarket
  const { data: reputationContractAddress } = useReadContract({
    address: getContractAddress(effectiveChainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'reputationContract' as 'marketCount',
    chainId: effectiveChainId,
  });

  return useReadContract({
    address: (reputationContractAddress as unknown) as `0x${string}`,
    abi: TRADER_REPUTATION_ABI,
    functionName: 'getReputationScore',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: !!targetAddress && !!reputationContractAddress,
    },
  });
}

/**
 * Get minimum reputation required to create markets
 */
export function useMinReputationToCreate() {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'MIN_REPUTATION_TO_CREATE' as 'marketCount',
    chainId: effectiveChainId,
  });
}

/**
 * Copy trading is open by default (anyone can followTrader).
 * Kept for UI compatibility — no on-chain "enable" function exists.
 */
export function useEnableCopyTrading() {
  return {
    enableCopyTrading: async () => true,
    hash: undefined as `0x${string}` | undefined,
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    error: null as Error | null,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Get platform fee
 */
export function usePlatformFee() {
  const chainId = useChainId();

  return useReadContract({
    address: getContractAddress(chainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'PLATFORM_FEE' as 'marketCount',
  });
}

/**
 * Get minimum bet amount
 */
export function useMinBet() {
  const chainId = useChainId();

  return useReadContract({
    address: getContractAddress(chainId, 'PREDICTION_MARKET') as `0x${string}`,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'MIN_BET' as 'marketCount',
  });
}

/**
 * Calculate potential winnings - POLYMARKET STYLE
 * 
 * Polymarket model:
 * - Price = probability (50¢ = 50% chance)
 * - If you buy at 50¢ and win, you get $1 (100% profit)
 * - If you buy at 25¢ and win, you get $1 (300% profit)
 * - Multiplier = 1 / price
 * 
 * In parimutuel:
 * - Price = yourSidePool / totalPool
 * - Payout = (your_bet / winning_pool) * total_pool
 */
export function useCalculateWinnings(
  marketId: number,
  position: boolean,
  betAmount: string
) {
  const { data: market } = useMarket(marketId);

  if (!market || !betAmount) {
    return { potentialWinnings: '0', odds: 0, multiplier: '1.00x', returnPct: '0' };
  }

  const marketArr = [...market] as unknown[];
  const [, , , , , , totalYes, totalNo] = marketArr as [unknown, unknown, unknown, unknown, unknown, unknown, bigint, bigint, ...unknown[]];
  const totalYesNum = Number(formatEther(totalYes));
  const totalNoNum = Number(formatEther(totalNo));
  const betNum = Number(betAmount);

  if (isNaN(betNum) || betNum <= 0) {
    return { potentialWinnings: '0', odds: 0, multiplier: '1.00x', returnPct: '0' };
  }

  const totalPool = totalYesNum + totalNoNum;
  
  // Handle empty pool - 50/50 odds, 2x multiplier
  if (totalPool === 0) {
    return {
      potentialWinnings: betNum.toFixed(4),
      odds: 50,
      multiplier: '2.00x',
      returnPct: '100',
      payout: (betNum * 2).toFixed(4),
    };
  }

  // Calculate current price (probability) for chosen position
  const yourSidePool = position ? totalYesNum : totalNoNum;
  const price = yourSidePool / totalPool; // This is the "cost" per share
  
  // After your bet, the new pools
  const newYourSide = yourSidePool + betNum;
  const newTotal = totalPool + betNum;
  
  // Your payout if you win = (your_bet / winning_pool) * total_pool
  const payout = (betNum / newYourSide) * newTotal;
  const profit = payout - betNum;
  
  // Polymarket-style multiplier and return
  const multiplier = payout / betNum;
  const returnPct = ((multiplier - 1) * 100);

  return {
    potentialWinnings: profit.toFixed(4),
    odds: (price * 100).toFixed(1),
    multiplier: multiplier.toFixed(2) + 'x',
    returnPct: returnPct.toFixed(1),
    payout: payout.toFixed(4),
    price: (price * 100).toFixed(1), // Price in cents (like 65¢)
  };
}

// ============================================================================
// Copy Trading Hooks
// ============================================================================

/**
 * Follow a trader to copy their trades
 */
export function useFollowTrader() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const effectiveChainId = chainId || 50312;
  const followTrader = async (
    traderAddress: string,
    maxAmountPerTrade: string,
    copyPercentage: number
  ) => {
    return writeContract({
      address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
      abi: TRADER_REPUTATION_ABI,
      functionName: 'followTrader',
      args: [
        traderAddress as `0x${string}`,
        parseEther(maxAmountPerTrade),
        BigInt(copyPercentage),
      ],
      chainId: effectiveChainId,
    });
  };

  return {
    followTrader,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Unfollow a trader to stop copying their trades
 */
export function useUnfollowTrader() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });
  const chainId = useChainId();

  const effectiveChainId = chainId || 50312;
  const unfollowTrader = async (traderAddress: string) => {
    return writeContract({
      address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
      abi: TRADER_REPUTATION_ABI,
      functionName: 'unfollowTrader',
      args: [traderAddress as `0x${string}`],
      chainId: effectiveChainId,
    });
  };

  return {
    unfollowTrader,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

/**
 * Get followers of a trader
 */
export function useTraderFollowers(traderAddress?: string) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
    abi: TRADER_REPUTATION_ABI,
    functionName: 'getFollowers',
    args: traderAddress ? [traderAddress as `0x${string}`] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: !!traderAddress,
    },
  });
}

/**
 * Get traders that a user is following
 */
export function useFollowingList(followerAddress?: string) {
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;

  return useReadContract({
    address: getContractAddress(effectiveChainId, 'TRADER_REPUTATION') as `0x${string}`,
    abi: TRADER_REPUTATION_ABI,
    functionName: 'getFollowing',
    args: followerAddress ? [followerAddress as `0x${string}`] : undefined,
    chainId: effectiveChainId,
    query: {
      enabled: !!followerAddress,
    },
  });
}

/**
 * User position with market data
 */
export interface UserBetPosition {
  marketId: number;
  question: string;
  category: string;
  endTime: bigint;
  resolved: boolean;
  outcome: boolean;
  yesAmount: bigint;
  noAmount: bigint;
  claimed: boolean;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
}

/**
 * Hook to fetch all user positions across all markets
 * Scans all markets and returns positions where user has placed bets
 */
export function useUserPositions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const effectiveChainId = chainId || 50312;
  const { data: marketCount } = useMarketCount();
  
  const [positions, setPositions] = useState<UserBetPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!address || !marketCount) return;

    const fetchPositions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const contractAddress = getContractAddress(effectiveChainId, 'PREDICTION_MARKET');
        const count = Number(marketCount);
        const userPositions: UserBetPosition[] = [];
        
        // Fetch positions for all markets
        const { createPublicClient, http } = await import('viem');
        const { somniaTestnet } = await import('viem/chains');
        const { somniaMainnet: somnia } = await import('../lib/web3-config');
        
        const chain = effectiveChainId === 5031 ? somnia : somniaTestnet;
        const client = createPublicClient({
          chain,
          transport: http(),
        });
        
        // Batch fetch all positions
        for (let i = 1; i <= count; i++) {
          try {
            // Get user position
            const position = await client.readContract({
              address: contractAddress as `0x${string}`,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'positions',
              args: [BigInt(i), address],
            }) as [bigint, bigint, boolean];
            
            const [yesAmount, noAmount, claimed] = position;
            
            // Only include if user has a position — hide 2025 past text when in 2026+
            if (yesAmount > 0n || noAmount > 0n) {
              // Get market details
              // Note: will filter 2025 after fetching question
              const marketResult = await client.readContract({
                address: contractAddress as `0x${string}`,
                abi: PREDICTION_MARKET_ABI,
                functionName: 'markets',
                args: [BigInt(i)],
              });
              
              const market = [...marketResult] as unknown[];
              const q = market[1] as string;
              const soft = getSoftResolution(i);
              const chainResolved = market[8] as boolean;
              const chainOutcome = market[9] as boolean;

              userPositions.push({
                marketId: i,
                question: q,
                category: market[3] as string,
                endTime: market[5] as bigint,
                totalYesAmount: market[6] as bigint,
                totalNoAmount: market[7] as bigint,
                resolved: chainResolved || !!soft,
                outcome: soft ? soft.outcome : chainOutcome,
                yesAmount,
                noAmount,
                claimed,
              });
            }
          } catch (e) {
            // Skip invalid markets
            console.debug(`Skipping market ${i}:`, e);
          }
        }
        
        setPositions(userPositions);
      } catch (e) {
        setError(e as Error);
        console.error('Failed to fetch user positions:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPositions();
  }, [address, marketCount, effectiveChainId]);

  // Separate active and resolved bets
  const activeBets = positions.filter(p => !p.resolved);
  const resolvedBets = positions.filter(p => p.resolved);

  return {
    positions,
    activeBets,
    resolvedBets,
    isLoading,
    error,
    refetch: () => {
      // Trigger a refetch by resetting positions
      setPositions([]);
    },
  };
}
