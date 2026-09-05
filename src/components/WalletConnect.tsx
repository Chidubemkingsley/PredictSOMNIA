'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, ChevronDown, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, error: connectError, status } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const connectorRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'pending';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        connectorRef.current &&
        !connectorRef.current.contains(event.target as Node)
      ) {
        setShowConnectors(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Connectors are ready for use
  useEffect(() => {
    // Connectors loaded
  }, [connectors]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getConnectorName = (connectorId: string) => {
    switch (connectorId) {
      case 'injected':
        return 'MetaMask / Browser Wallet';
      case 'walletConnect':
        return 'WalletConnect';
      default:
        return connectorId;
    }
  };

  const getConnectorDescription = (connectorId: string) => {
    switch (connectorId) {
      case 'injected':
        return 'MetaMask, Coinbase Wallet, etc.';
      case 'walletConnect':
        return 'Mobile & Desktop Wallets';
      default:
        return 'Connect your wallet';
    }
  };

  if (isConnected && address) {
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">{formatAddress(address)}</span>
          <span className="sm:hidden">{address.slice(0, 6)}...</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-50">
            <div className="mb-2 text-sm text-gray-600">Connected to</div>
            <div className="font-mono text-sm mb-3 break-all">{address}</div>
            {chain && (
              <div className="mb-3 text-sm">
                <span className="text-gray-600">Network: </span>
                <span className="font-semibold">{chain.name}</span>
              </div>
            )}
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={connectorRef}>
      <Button
        onClick={() => setShowConnectors(!showConnectors)}
        className="gap-2"
        disabled={isLoading}
      >
        <Wallet className="h-4 w-4" />
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </Button>

      {showConnectors && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded-lg shadow-lg overflow-hidden z-50">
          {/* Connection Error Display */}
          {connectError && (
            <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <p className="font-medium">Connection Failed</p>
                <p className="mt-1">{connectError.message}</p>
              </div>
            </div>
          )}

          {connectors.length > 0 ? (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b">
                <p className="text-xs font-medium text-gray-700">
                  Select Wallet
                </p>
              </div>
              {connectors.map(connector => (
                <button
                  key={connector.id}
                  onClick={async () => {
                    try {
                      setShowConnectors(false);
                      await connect({ connector });
                    } catch (_error) {
                      setShowConnectors(true); // Reopen to show error
                    }
                  }}
                  disabled={!connector.ready || isLoading}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 border-b last:border-b-0 ${
                    !connector.ready || isLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <Wallet className="h-5 w-5 text-gray-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {getConnectorName(connector.id)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isLoading
                        ? 'Connecting...'
                        : connector.ready
                          ? getConnectorDescription(connector.id)
                          : 'Not detected'}
                    </div>
                  </div>
                  {!connector.ready && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      Install
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-6 text-center">
              <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-2">
                No Wallet Detected
              </p>
              <p className="text-xs text-gray-600 mb-4">
                Please install a Web3 wallet to connect
              </p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Wallet className="h-4 w-4" />
                Install MetaMask
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
