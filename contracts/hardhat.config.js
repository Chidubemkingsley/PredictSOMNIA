require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// ============================================================================
// Somnia + DreamDEX Event Contracts — Pure Somnia (no BSC)
// ============================================================================
//
// 🟡 NETWORK SUPPORT: Somnia Shannon Testnet (50312) + Somnia Mainnet (5031) — DreamDEX Event Contracts
// Somnia Shannon: https://dream-rpc.somnia.network | Explorer: https://shannon-explorer.somnia.network
// DreamDEX Event Contracts: BinaryMarketsModule 0x3ecC694C... (CREATE3, same on 50312+5031)
// Collateral: tUSDC 0x70a86D88... (6d Shannon) / USDso 0x00000022... (18d Mainnet) via CollateralRouter 0xbC0C98...
// Settlement: OracleHub 0xe40db387... reactive, WSOMNIA3009 gasless, GaslessRelayer STT sponsor
// Why Somnia? 100ms blocks, sub-cent STT gas, EIP-712 DOMAIN_SEPARATOR with chainId (50312/5031) — see WSOMNIA3009.sol
// Pure Somnia — BSC 56/97 removed
// See: /docs/SOMNIA_SHANNON_GUIDE.md + docs.dreamdex.io/developers/event-contracts
// ============================================================================

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    // Local Hardhat Network — Mimics Somnia Shannon for DreamDEX Event Contracts demo
    hardhat: {
      chainId: 50312, // Somnia Shannon Chain ID
      mining: {
        auto: true,
        interval: 100, // 100ms blocks like Somnia (was 3000ms STT)
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
        accountsBalance: "10000000000000000000000", // 10000 STT
      },
    },
    // Local Network (for external testing) — Somnia Shannon
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 50312, // Somnia Shannon Chain ID
    },
    // Somnia Shannon Testnet (DreamDEX Event Contracts)
    somniaTestnet: {
      url: process.env.SOMNIA_TESTNET_RPC_URL || "https://dream-rpc.somnia.network",
      chainId: 50312,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei — Somnia base fee (was 1 gwei too low)
    },
    // Somnia Mainnet
    somnia: {
      url: process.env.SOMNIA_MAINNET_RPC_URL || "https://api.infra.mainnet.somnia.network",
      chainId: 5031,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 20000000000, // 20 gwei
    },
  },
  etherscan: {
    apiKey: {
      somnia: process.env.SOMNIA_API_KEY || "empty",
      somniaTestnet: process.env.SOMNIA_API_KEY || "empty",
    },
    customChains: [
      {
        network: "somniaTestnet",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network",
        },
      },
      {
        network: "somnia",
        chainId: 5031,
        urls: {
          apiURL: "https://explorer.somnia.network/api",
          browserURL: "https://explorer.somnia.network",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
