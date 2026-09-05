'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useEffect, useState } from 'react';
import { somniaTestnet, somniaMainnet as somnia } from '@/lib/web3-config';

/**
 * NetworkGuard Component
 *
 * Ensures users are on Somnia Network (Somnia) networks only.
 * Shows warning banner if connected to unsupported networks.
 *
 * Supported Networks:
 * - STT Mainnet (Chain ID: 5031)
 * - STT Testnet (Chain ID: 50312)
 */
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);

  // Supported Somnia Network IDs
  const SUPPORTED_CHAINS = [somnia.id, somniaTestnet.id] as const; // 5031, 50312
  const isSupported = SUPPORTED_CHAINS.includes(
    chainId as (typeof SUPPORTED_CHAINS)[number]
  );

  // Reset dismissed state when chain changes
  useEffect(() => {
    setDismissed(false);
  }, [chainId]);

  // Don't show warning if not connected or network is supported or dismissed
  if (!isConnected || isSupported || dismissed) {
    return <>{children}</>;
  }

  // Get chain name for display
  const getChainName = (id: number): string => {
    const chainNames: Record<number, string> = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      137: 'Polygon Mainnet',
      80001: 'Mumbai Testnet',
      42161: 'Arbitrum One',
      10: 'Optimism',
      43114: 'Avalanche',
      250: 'Fantom',
    };
    return chainNames[id] || `Chain ${id}`;
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchChain({ chainId: targetChainId });
    } catch (_error) {
      // Network switch failed or user rejected
    }
  };

  return (
    <>
      {/* Warning Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="font-bold text-lg">Wrong Network Detected</p>
                <p className="text-sm">
                  You&apos;re connected to{' '}
                  <span className="font-semibold">{getChainName(chainId)}</span>
                  . This dApp only works on{' '}
                  <span className="font-semibold">Somnia Network</span>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Switch to Somnia Mainnet */}
              <button
                onClick={() => handleSwitchNetwork(somnia.id)}
                className="px-4 py-2 bg-black text-yellow-500 rounded-lg font-semibold hover:bg-gray-900 transition-colors text-sm"
              >
                Switch to Somnia Mainnet
              </button>

              {/* Switch to Somnia Testnet */}
              <button
                onClick={() => handleSwitchNetwork(somniaTestnet.id)}
                className="px-4 py-2 bg-black text-yellow-500 rounded-lg font-semibold hover:bg-gray-900 transition-colors text-sm"
              >
                Switch to Somnia Testnet
              </button>

              {/* Dismiss Button */}
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-2 text-black hover:bg-yellow-600 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-2 text-xs text-black/80 border-t border-black/20 pt-2">
            💡 <strong>Don&apos;t have STT?</strong> Get free testnet STT from the{' '}
            <a
              href="https://shannon-explorer.somnia.network"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-black"
            >
              Somnia Faucet
            </a>{' '}
            or buy STT on{' '}
            <a
              href="https://www.binance.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold hover:text-black"
            >
              Binance
            </a>
          </div>
        </div>
      </div>

      {/* Add padding to content to prevent overlap with banner */}
      <div className={!isSupported ? 'pt-28' : ''}>{children}</div>
    </>
  );
}

/**
 * useNetworkCheck Hook
 *
 * Returns whether the current network is supported
 * and provides helpers for network switching
 */
export function useNetworkCheck() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const SUPPORTED_CHAINS = [somnia.id, somniaTestnet.id] as const;
  const isSupported = SUPPORTED_CHAINS.includes(
    chainId as (typeof SUPPORTED_CHAINS)[number]
  );
  const isSomniaMainnet = chainId === somnia.id;
  const isSomniaTestnet = chainId === somniaTestnet.id;

  const switchToSomniaMainnet = async () => {
    try {
      await switchChain({ chainId: somnia.id });
      return true;
    } catch (error) {
      console.error('Failed to switch to STT Mainnet:', error);
      return false;
    }
  };

  const switchToSomniaTestnet = async () => {
    try {
      await switchChain({ chainId: somniaTestnet.id });
      return true;
    } catch (error) {
      console.error('Failed to switch to STT Testnet:', error);
      return false;
    }
  };

  return {
    isConnected,
    chainId,
    isSupported,
    isSomniaMainnet,
    isSomniaTestnet,
    switchToSomniaMainnet,
    switchToSomniaTestnet,
    isSwitching: isPending,
  };
}
