// ============================================================================
// Somnia Network EXCLUSIVE Web3 Configuration with RainbowKit
// ============================================================================
//
// 🟡 IMPORTANT: This dApp ONLY works on Somnia Network (Shannon Testnet 50312 / Mainnet 5031)
// DreamDEX Event Contracts: BinaryMarketsModule 0x3ecC694Cef705358864a646142ac17A90E29e388 (CREATE3)
// Collateral: tUSDC 0x70a86D88... (6d Shannon) / USDso 0x00000022... (18d Mainnet) via CollateralRouter
//
// Supported Networks:
// ✅ Somnia Shannon Testnet (Chain ID: 50312) — DreamDEX Event Contracts live
// ✅ Somnia Mainnet (Chain ID: 5031)
// ✅ Hardhat Local (Chain ID: 50312, 100ms blocks mimics Somnia)
//
// NOT Supported:
// ❌ BSC 56/97, Ethereum, Polygon etc. — Somnia only
//
// Why Somnia? 100ms blocks, sub-cent STT gas, WSOMNIA3009 EIP-3009 gasless, DreamDEX CLOB
// See: docs/SOMNIA_SHANNON_GUIDE.md + docs.dreamdex.io/developers/event-contracts
// ============================================================================

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

// Somnia Shannon Testnet — DreamDEX Event Contracts live
export const somniaShannon = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  network: 'somnia-shannon',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Shannon Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
  testnet: true,
});

// Somnia Mainnet
export const somniaMainnet = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  network: 'somnia-mainnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.infra.mainnet.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://explorer.somnia.network' },
  },
});

// Alias exports for compatibility
export const somniaTestnet = somniaShannon;
export const somnia = somniaMainnet;

// RainbowKit configuration with Somnia support (lazily initialized to prevent SSR build issues)
let _somniaChainConfigCache: ReturnType<typeof getDefaultConfig> | undefined;

export function getSomniaChainConfig() {
  if (!_somniaChainConfigCache) {
    const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (typeof window !== 'undefined' && (!walletConnectProjectId || walletConnectProjectId === 'demo-project-id')) {
      console.warn('⚠️ WalletConnect: Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in env');
    }
    _somniaChainConfigCache = getDefaultConfig({
      appName: 'PredictSOMNIA',
      projectId: walletConnectProjectId || '7d5b379d54bd7c2bafb6464aacf75b68',
      chains: [somniaShannon, somniaMainnet],
      transports: {
        [somniaShannon.id]: http(
          process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL ||
            process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ||
            'https://dream-rpc.somnia.network'
        ),
        [somniaMainnet.id]: http(
          process.env.NEXT_PUBLIC_SOMNIA_MAINNET_RPC_URL ||
            'https://api.infra.mainnet.somnia.network'
        ),
      },
      ssr: true,
    });
  }
  return _somniaChainConfigCache;
}

export const somniaChainConfig = new Proxy({} as ReturnType<typeof getDefaultConfig>, {
  get(_target, prop) {
    const config = getSomniaChainConfig();
    const val = (config as unknown as Record<string, unknown>)[prop as string];
    return typeof val === 'function' ? val.bind(config) : val;
  },
});

// Chain IDs for easy reference — Pure Somnia (no BSC)
export const CHAIN_IDS = {
  SOMNIA_SHANNON: 50312,
  SOMNIA_MAINNET: 5031,
  SOMNIA_TESTNET: 50312,
} as const;

// RPC URLs - Somnia only
export const RPC_URLS = {
  [CHAIN_IDS.SOMNIA_SHANNON]:
    process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL ||
    process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ||
    'https://dream-rpc.somnia.network',
  [CHAIN_IDS.SOMNIA_MAINNET]:
    process.env.NEXT_PUBLIC_SOMNIA_MAINNET_RPC_URL ||
    'https://api.infra.mainnet.somnia.network',
} as const;

// Block Explorer URLs - Somnia only
export const EXPLORER_URLS = {
  [CHAIN_IDS.SOMNIA_SHANNON]: 'https://shannon-explorer.somnia.network',
  [CHAIN_IDS.SOMNIA_MAINNET]: 'https://explorer.somnia.network',
} as const;

// Native Currency — Somnia STT (tUSDC 6d collateral is ERC20, not native)
export const NATIVE_CURRENCY = {
  name: 'STT',
  symbol: 'STT',
  decimals: 18,
} as const;
