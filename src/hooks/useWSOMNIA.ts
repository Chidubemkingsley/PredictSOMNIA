/**
 * useWSOMNIA Hook
 * React hooks for WSOMNIA3009 wrapping/unwrapping and balance checking
 * 
 * WSOMNIA3009 is required for gasless betting:
 * 1. User wraps STT → WSOMNIA3009 (pays gas once)
 * 2. User signs EIP-3009 authorization (free, off-chain)
 * 3. Facilitator executes bet (facilitator pays gas)
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, type Address } from 'viem';

// WSOMNIA3009 Contract ABI (only the functions we need)
const WSOMNIA3009_ABI = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Get WSOMNIA3009 address from env
const getWSOMNIAAddress = (): Address => {
  return (process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300') as Address;
};

/**
 * Hook to get WSOMNIA3009 balance for the connected wallet
 */
export function useWSOMNIABalance() {
  const { address, isConnected } = useAccount();
  const wsomniaAddress = getWSOMNIAAddress();

  const { data: balance, isLoading, refetch, error } = useReadContract({
    address: wsomniaAddress,
    abi: WSOMNIA3009_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  });

  return {
    balance: balance as bigint | undefined,
    balanceFormatted: balance ? formatEther(balance as bigint) : '0',
    isLoading,
    refetch,
    error,
  };
}

/**
 * Hook to get native STT balance
 */
export function useSOMNIABalance() {
  const { address, isConnected } = useAccount();

  const { data: balance, isLoading, refetch } = useBalance({
    address: address,
    query: {
      enabled: isConnected && !!address,
      refetchInterval: 10000,
    },
  });

  return {
    balance: balance?.value,
    balanceFormatted: balance ? balance.formatted : '0',
    isLoading,
    refetch,
  };
}

/**
 * Hook to wrap STT to WSOMNIA3009
 */
export function useWrapSOMNIA() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const wsomniaAddress = getWSOMNIAAddress();
  const { refetch: refetchWSOMNIA } = useWSOMNIABalance();
  const { refetch: refetchSTT } = useSOMNIABalance();

  const wrap = useCallback(async (amount: string) => {
    const amountWei = parseEther(amount);
    
    writeContract({
      address: wsomniaAddress,
      abi: WSOMNIA3009_ABI,
      functionName: 'deposit',
      value: amountWei,
    });
  }, [writeContract, wsomniaAddress]);

  // Refetch balances on success
  useEffect(() => {
    if (isSuccess) {
      refetchWSOMNIA();
      refetchSTT();
    }
  }, [isSuccess, refetchWSOMNIA, refetchSTT]);

  return {
    wrap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError,
  };
}

/**
 * Hook to unwrap WSOMNIA3009 back to STT
 */
export function useUnwrapSTT() {
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const wsomniaAddress = getWSOMNIAAddress();
  const { refetch: refetchWSOMNIA } = useWSOMNIABalance();
  const { refetch: refetchSTT } = useSOMNIABalance();

  const unwrap = useCallback(async (amount: string) => {
    const amountWei = parseEther(amount);
    
    writeContract({
      address: wsomniaAddress,
      abi: WSOMNIA3009_ABI,
      functionName: 'withdraw',
      args: [amountWei],
    });
  }, [writeContract, wsomniaAddress]);

  // Refetch balances on success
  useEffect(() => {
    if (isSuccess) {
      refetchWSOMNIA();
      refetchSTT();
    }
  }, [isSuccess, refetchWSOMNIA, refetchSTT]);

  return {
    unwrap,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError,
  };
}

/**
 * Combined hook for WSOMNIA management
 */
export function useWSOMNIA() {
  const { balance: wsomniaBalance, balanceFormatted: wsomniaFormatted, isLoading: wsomniaLoading, refetch: refetchWSOMNIA } = useWSOMNIABalance();
  const { balance: bnbBalance, balanceFormatted: bnbFormatted, isLoading: bnbLoading, refetch: refetchSTT } = useSOMNIABalance();
  const wrapHook = useWrapSOMNIA();
  const unwrapHook = useUnwrapSTT();

  const refetchAll = useCallback(() => {
    refetchWSOMNIA();
    refetchSTT();
  }, [refetchWSOMNIA, refetchSTT]);

  return {
    // Balances — Somnia STT (bnb aliases kept for legacy)
    wsomniaBalance,
    wsomniaFormatted,
    bnbBalance,
    bnbFormatted,
    // Legacy aliases for old code (wbnbBalance etc. → wsomnia)
    wbnbBalance: wsomniaBalance,
    wbnbFormatted: wsomniaFormatted,
    sttBalance: bnbBalance,
    sttFormatted: bnbFormatted,
    somniaBalance: bnbBalance,
    somniaFormatted: bnbFormatted,
    isLoading: wsomniaLoading || bnbLoading,
    
    // Wrap
    wrap: wrapHook.wrap,
    isWrapping: wrapHook.isPending || wrapHook.isConfirming,
    wrapSuccess: wrapHook.isSuccess,
    wrapHash: wrapHook.hash,
    wrapError: wrapHook.error,
    
    // Unwrap
    unwrap: unwrapHook.unwrap,
    isUnwrapping: unwrapHook.isPending || unwrapHook.isConfirming,
    unwrapSuccess: unwrapHook.isSuccess,
    unwrapHash: unwrapHook.hash,
    unwrapError: unwrapHook.error,
    
    // Utils
    refetch: refetchAll,
    wsomniaAddress: getWSOMNIAAddress(),
  };
}
