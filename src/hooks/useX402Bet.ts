/**
 * useX402Bet Hook
 * React hook for gasless betting using x402 protocol
 * Replaces EIP-4337 with revolutionary HTTP 402 payment protocol
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useSignTypedData, useChainId } from 'wagmi';
import { x402Client } from '@/services/x402Client';
import type { Address } from 'viem';

export interface X402BetResult {
  success: boolean;
  transactionHash?: Address;
  error?: string;
}

/**
 * Hook for placing gasless bets with x402 protocol
 */
export function useX402Bet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Place bet using x402 gasless protocol
   */
  const placeBetGasless = async (
    marketId: number,
    position: boolean,
    amount: bigint
  ): Promise<X402BetResult> => {
    if (!address) {
      return {
        success: false,
        error: 'Wallet not connected',
      };
    }

    setIsPending(true);
    setError(null);

    try {
      const result = await x402Client.betWithX402(
        marketId,
        position,
        amount,
        address,
        signTypedDataAsync,
        chainId
      );

      if (!result.success) {
        setError(result.error || 'Payment failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsPending(false);
    }
  };

  return {
    placeBetGasless,
    isPending,
    error,
  };
}

/**
 * Hook to check if user can use gasless betting
 */
export function useCanUseX402() {
  const { address, isConnected } = useAccount();
  const [canUse, setCanUse] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  // In x402, gasless is always available (facilitator sponsors)
  // Just need wallet connection
  const checkEligibility = () => {
    if (!isConnected || !address) {
      setCanUse(false);
      setReason('Wallet not connected');
      return;
    }

    setCanUse(true);
    setReason(null);
  };

  return {
    canUse,
    reason,
    checkEligibility,
  };
}

/**
 * Hook to get gas sponsorship status
 */
export function useGasSponsorship() {
  const { address } = useAccount();
  const [sponsoredAmount, setSponsoredAmount] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);

  const fetchSponsorship = useCallback(async () => {
    if (!address || isLoading) return;

    setIsLoading(true);
    try {
      // Fetch from facilitator API
      const response = await fetch(`/api/x402/sponsorship/${address}`);
      if (response.ok) {
        const data = await response.json();
        setSponsoredAmount(BigInt(data.totalSponsored || 0));
      }
    } catch (error) {
      console.error('Failed to fetch gas sponsorship:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isLoading]);

  // Auto-fetch once when address is available
  useEffect(() => {
    if (address && !hasFetched.current) {
      hasFetched.current = true;
      fetchSponsorship();
    }
  }, [address, fetchSponsorship]);

  // Reset when address changes
  useEffect(() => {
    hasFetched.current = false;
  }, [address]);

  return {
    sponsoredAmount,
    isLoading,
    fetchSponsorship,
  };
}

/**
 * Hook to estimate gas savings with x402
 */
export function useGasSavings() {
  const calculateSavings = (betAmount: bigint, gasPrice: bigint = 3n): bigint => {
    // Estimate: ~150,000 gas for bet transaction
    const estimatedGas = 150000n;
    const gasCost = estimatedGas * gasPrice * 10n ** 9n; // Convert to wei
    return gasCost;
  };

  const formatSavings = (savings: bigint): string => {
    const bnbSavings = Number(savings) / 1e18;
    return `~$${(bnbSavings * 600).toFixed(4)}`; // Assuming $600 STT
  };

  return {
    calculateSavings,
    formatSavings,
  };
}
