/**
 * Extended x402 Hooks for Gasless Operations
 * - Claim Winnings
 * - Follow/Unfollow Traders
 * - Create Markets
 */

'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { keccak256, encodePacked, toHex } from 'viem';
import type { Address, Hex } from 'viem';

// Generate random nonce for replay protection
function generateNonce(): Hex {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

export interface GaslessResult {
  success: boolean;
  transactionHash?: Address;
  error?: string;
}

// ============================================================================
// Claim Winnings Gaslessly
// ============================================================================

export function useClaimGasless() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimGasless = async (marketId: number): Promise<GaslessResult> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setError(null);

    try {
      const nonce = generateNonce();
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity

      // Create message hash for EIP-712
      const messageHash = keccak256(
        encodePacked(
          ['string', 'uint256', 'address', 'uint256', 'bytes32'],
          [
            'ClaimWinnings(uint256 marketId,address from,uint256 deadline,bytes32 nonce)',
            BigInt(marketId),
            address,
            BigInt(deadline),
            nonce,
          ]
        )
      );

      // Sign the message
      const signature = await signMessageAsync({
        message: { raw: messageHash },
      });

      // Send to facilitator relay
      const response = await fetch('/api/x402/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId,
          from: address,
          deadline,
          nonce,
          signature,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to claim');
        return { success: false, error: result.error };
      }

      return {
        success: true,
        transactionHash: result.transactionHash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPending(false);
    }
  };

  return { claimGasless, isPending, error };
}

// ============================================================================
// Follow Trader Gaslessly
// ============================================================================

export function useFollowTraderGasless() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followTraderGasless = async (
    traderAddress: string,
    maxAmountPerTrade: string,
    copyPercentage: number
  ): Promise<GaslessResult> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setError(null);

    try {
      const nonce = generateNonce();
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      // Create message hash
      const messageHash = keccak256(
        encodePacked(
          ['string', 'address', 'uint256', 'uint256', 'address', 'uint256', 'bytes32'],
          [
            'FollowTrader(address trader,uint256 maxAmountPerTrade,uint256 copyPercentage,address from,uint256 deadline,bytes32 nonce)',
            traderAddress as Address,
            BigInt(Math.floor(parseFloat(maxAmountPerTrade) * 1e18)),
            BigInt(copyPercentage),
            address,
            BigInt(deadline),
            nonce,
          ]
        )
      );

      const signature = await signMessageAsync({
        message: { raw: messageHash },
      });

      const response = await fetch('/api/x402/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trader: traderAddress,
          maxAmountPerTrade,
          copyPercentage,
          from: address,
          deadline,
          nonce,
          signature,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to follow trader');
        return { success: false, error: result.error };
      }

      return {
        success: true,
        transactionHash: result.transactionHash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPending(false);
    }
  };

  return { followTraderGasless, isPending, error };
}

// ============================================================================
// Unfollow Trader Gaslessly
// ============================================================================

export function useUnfollowTraderGasless() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unfollowTraderGasless = async (traderAddress: string): Promise<GaslessResult> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setError(null);

    try {
      const nonce = generateNonce();
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const messageHash = keccak256(
        encodePacked(
          ['string', 'address', 'address', 'uint256', 'bytes32'],
          [
            'UnfollowTrader(address trader,address from,uint256 deadline,bytes32 nonce)',
            traderAddress as Address,
            address,
            BigInt(deadline),
            nonce,
          ]
        )
      );

      const signature = await signMessageAsync({
        message: { raw: messageHash },
      });

      const response = await fetch('/api/x402/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trader: traderAddress,
          from: address,
          deadline,
          nonce,
          signature,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to unfollow trader');
        return { success: false, error: result.error };
      }

      return {
        success: true,
        transactionHash: result.transactionHash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPending(false);
    }
  };

  return { unfollowTraderGasless, isPending, error };
}

// ============================================================================
// Create Market Gaslessly
// ============================================================================

export function useCreateMarketGasless() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMarketGasless = async (params: {
    question: string;
    description: string;
    category: string;
    endTime: Date;
    aiOracleEnabled: boolean;
  }): Promise<GaslessResult> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setError(null);

    try {
      const nonce = generateNonce();
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const endTimeUnix = Math.floor(params.endTime.getTime() / 1000);

      // Hash strings separately for EIP-712
      const questionHash = keccak256(toHex(params.question));
      const descriptionHash = keccak256(toHex(params.description));
      const categoryHash = keccak256(toHex(params.category));

      const messageHash = keccak256(
        encodePacked(
          ['string', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bool', 'address', 'uint256', 'bytes32'],
          [
            'CreateMarket(string question,string description,string category,uint256 endTime,bool aiOracleEnabled,address from,uint256 deadline,bytes32 nonce)',
            questionHash,
            descriptionHash,
            categoryHash,
            BigInt(endTimeUnix),
            params.aiOracleEnabled,
            address,
            BigInt(deadline),
            nonce,
          ]
        )
      );

      const signature = await signMessageAsync({
        message: { raw: messageHash },
      });

      const response = await fetch('/api/x402/create-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: params.question,
          description: params.description,
          category: params.category,
          endTime: endTimeUnix,
          aiOracleEnabled: params.aiOracleEnabled,
          from: address,
          deadline,
          nonce,
          signature,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to create market');
        return { success: false, error: result.error };
      }

      return {
        success: true,
        transactionHash: result.transactionHash,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPending(false);
    }
  };

  return { createMarketGasless, isPending, error };
}
