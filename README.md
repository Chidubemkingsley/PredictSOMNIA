# PredictSOMNIA — Event Contracts Hackathon (Somnia Shannon 50312)

**First gasless prediction market. x402 protocol on Somnia Shannon. 0 gas fees, forever. Built for the Somnia × DreamDEX Event Contracts Hackathon.**

**Event Contracts Hackathon — Somnia Shannon (50312):** Somnia, in collaboration with [DreamDEX](https://docs.dreamdex.io/developers/event-contracts), invites developers, AI engineers, Web3 builders, and trading teams to build on **DreamDEX Event Contracts** — binary Up/Down markets on BTC/ETH over 15m/1h windows, fixed payout, 0 fees, settled in USDso/tUSDC on Somnia's 100ms CLOB. This repo is the hackathon submission: consumer trading app + AI gasless agent + analytics, all powered by `BinaryMarketsModule 0x3ecC…` on **Somnia Shannon Testnet 50312**.

17/17 tests passing. 9 live markets on Shannon 50312. $10-100 saved per 100-1000 bets. 42% gas savings with batching.

[![Event Contracts Hackathon — Somnia Shannon 50312](https://img.shields.io/badge/Event%20Contracts%20Hackathon-Somnia%20Shannon%2050312-8b5cf6?style=for-the-badge)](https://dorahacks.io/hackathon/event-contracts)
[![Somnia × DreamDEX — Event Contracts](https://img.shields.io/badge/Somnia%20x%20DreamDEX-Event%20Contracts%202025-22d3ee?style=for-the-badge)](https://dorahacks.io/hackathon/event-contracts)
[![Somnia Shannon Exclusive](https://img.shields.io/badge/Somnia%20Shannon-50312-22d3ee?style=for-the-badge)](https://shannon-explorer.somnia.network)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)
[![Demo Live](https://img.shields.io/badge/Demo-Live-green?style=for-the-badge)](https://creative-market-six.vercel.app/)

---

## Core Tech

**x402 Protocol (Gasless On-Chain):**

- **You:** Sign authorization (free)
- **Facilitator:** Pays $0.10 gas to execute on-chain
- **Facilitator:** Earns 0.5% fee per transaction
- **Result:** You pay 0 gas, everything recorded on Somnia Network

**Why Somnia Network?** Facilitator pays $0.10 gas, earns 0.5% fee → profitable with volume. On Ethereum, $5-20 gas would kill this model.

**Batch Processing (42% Gas Savings):**

- Single transaction: 28,930 gas (~$0.052)
- Batch of 3: 16,730 gas/bet (~$0.030)
- **Facilitator profit:** $0.030 gas + $0.05 fee (0.5% of $10 bet) = $0.02 net profit/bet
- **At scale (1000 bets):** $30 gas vs $52 gas = $22 saved with batching
- See [batch test results](contracts/test/test-x402-batch.js) - 5/5 tests passing

**On-Chain Everything:**

- Reputation: TraderReputation.sol (+10/bet, +20/win) + Groq verifier (llama-3.3-70b)
- Markets: PredictionMarket.sol (18 active) + DreamDEX Event Contracts (BTC/ETH 15m/1h Up/Down, BinaryMarketsModule 0x3ecC69...)
- Gasless Handler: X402BettingSOMNIA.sol (WSOMNIA3009 + EIP-3009 + batching, Somnia Shannon 50312) — tUSDC 0x70a86D... (collateral, faucet cap 10k)

**Tests:** 12/12 gasless + 5/5 batching = 17/17 passing (100%). [See proof](contracts/test/test-wsomnia-gasless.js)

---

## Gas Savings (Real Numbers)

| Bets | Traditional Cost    | x402 Cost | Savings |
| ---- | ------------------- | --------- | ------- |
| 10   | 0.00032 STT ($0.10) | 0 STT     | $0.10   |
| 100  | 0.0032 STT ($1)     | 0 STT     | $1      |
| 1000 | 0.032 STT ($10)     | 0 STT     | $10     |

## Reputation System

**TraderReputation.sol** (on-chain, immutable):

- First bet: +100 points
- Per bet: +10 points
- Per win: +20 bonus
- Create markets: Requires 50 reputation (anti-spam)

## Features

**✅ Live (17/17 tests passing):**

- x402 gasless betting (WSOMNIA3009 + X402BettingSTT.sol)
- Batch processing: 42% gas savings for facilitators
- 18 active markets (crypto, DeFi, entertainment)
- On-chain reputation system (TraderReputation.sol)
- 50+ market templates

**🚧 In Development:**

- AI oracle: 3-LLM consensus (DeepSeek-V3, Llama 3.3, Qwen 2.5)
- Copy trading: Follow top traders
- Target: 30min resolution, 95% accuracy

**Market Rules (Required):**

- Data source specified (CoinGecko, DeFiLlama, Billboard)
- UTC deadline (no ambiguity)
- Objective criteria (verifiable on-chain)

## Quick Start

Get it running locally in 2 minutes:

1. **Add Somnia Network to MetaMask** (happens automatically when you connect)
2. **Get testnet STT** from the [STT Faucet](https://cloud.google.com/application/web3/faucet)
3. **Clone and install**:
   ```bash
   git clone [repo-url]
   cd Predict-SOMNIA
   npm install
   ```
4. **Start dev server**:
   ```bash
   npm run dev
   ```
5. **Open** `http://localhost:3000`

Note: This only works on Somnia Network (testnet ID 50312, mainnet ID 5031). Everything on-chain, everything on STT.

---

## How It Works

**Create Market:** Category → Template → Rules (data source + UTC deadline) → Submitted on-chain  
**Place Bet:** Connect wallet → x402 gasless (0 gas) → Executed on-chain  
**Resolution:** Check data source at deadline → 2/3 LLM agreement → On-chain resolution  
**Claim:** Winners claim on-chain (0 gas)

---

**Crypto/DeFi (12):** BTC $150K, ETH $6K, Aave TVL, Uniswap volume  
**NFT/Gaming (2):** Azuki floor, Illuvium users  
**Entertainment (4):** Beyoncé album, Drake #1, Dune 3, Taylor Swift

_All markets: Specified data source + UTC deadline + objective criteria_

---

## Tech Stack

**Frontend:** Next.js 14, TypeScript, Wagmi v2, RainbowKit  
**Contracts:** Solidity 0.8.x, Hardhat, OpenZeppelin, EIP-3009  
**Blockchain:** Somnia Network (Testnet 50312, Mainnet 5031)  
**Gasless:** WSOMNIA3009 + X402BettingSTT.sol  
**AI:** DeepSeek-V3, Llama 3.3, Qwen 2.5 (in dev)  
**Hosting:** Vercel, GitHub Actions

---

## Project Structure

```
PredictSOMNIA/
├── src/app/              Next.js 14 pages
├── src/components/       React components
├── src/hooks/            Custom Web3 hooks
├── contracts/            8 Solidity contracts (Somnia Shannon 50312)
│   ├── PredictionMarket.sol      # Core betting logic (STT, bounded copy)
│   ├── WSOMNIA3009.sol              # Wrapped SOMNIA STT (EIP-3009, gasless, 50312)
│   ├── X402BettingSOMNIA.sol        # x402 gasless handler (SOMNIA, facilitator STT)
│   ├── X402Betting.sol              # ERC20 variant (tUSDC 6d, STT rate)
│   ├── MockERC20WithAuth.sol        # Mock tUSDC 6d with EIP-3009 + faucet cap 10k
│   ├── GaslessRelayer.sol           # EIP-712 STT sponsor ( Somnia chain-aware)
│   ├── AIOracle.sol              # Groq (llama-3.3) + SomniaOracleHub/DreamDEXSettlement
│   └── TraderReputation.sol      # On-chain reputation + copy (STT, call not transfer)
├── contracts/test/       Test suite (17/17 passing)
├── docs/                 Complete documentation
└── scripts/              Utility scripts
```

**Status:** 5 contracts, 17/17 tests (12 gasless + 5 batching), 18 markets, 50+ templates

## Deployed Contracts

```
# Somnia Shannon 50312 — primary (2026-09-04, forceResolveMarket)
PredictionMarket:     0x29C1a65695D8B9E23Fb7775d81a7C4792f9c5661
TraderReputation:     0x580ABA453b81D68a2C7714df6096ba75DD8bDEF9
AIOracle:             0x86a6FBDA8C959Aa724876dbF0f58aD319942b030
GaslessRelayer:       0x384B2460d7AC08Cef74B02E4D80108aDCa4B4A12
WSOMNIA3009:          0x5C46B206aF8a2148DD8813Bd69a03634562aC300
X402BettingSOMNIA:    0x2C01AFeF1A0C4E01b336256DacFd1e6326DFcf80
# DreamDEX Event Contracts (CREATE3, same on 50312+5031, no deploy needed):
BinaryMarketsModule: 0x3ecC694Cef705358864a646142ac17A90E29e388
OutcomeToken6909:    0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9
OracleHub:           0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b  # reactive settlement
CollateralRouter:    0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C  # tUSDC faucet (cap 10k)
tUSDC (Shannon):     0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E  # 6d, faucet() default 10k
USDso (Mainnet):     0x00000022dA000002656c64D9eA6011ea952D008A # 18d
```

**Tests:** 17/17 passing (100%). See [gasless test](contracts/test/test-wsomnia-gasless.js) and [batch test](contracts/test/test-x402-batch.js)

---

## Development

**Setup:**

```bash
npm install
cd contracts && npm install && cd ..
cp .env.local.example .env.local
# Edit .env.local with your values
npm run dev
```

**Test gasless betting:**

```bash
cd contracts
npx hardhat node  # Terminal 1
npx hardhat run scripts/deploy-wsomnia-solution.js --network localhost  # Terminal 2
node test/test-wsomnia-gasless.js  # 12/12 tests
node test/test-x402-batch.js     # 5/5 batch tests (42% gas savings)
```

---

## Links

**Try it:** [Live Demo](https://creative-market-six.vercel.app)  
**Code:** [GitHub](https://github.com/Chidubemkingsley/PredictSOMNIA.git)  
**Need testnet STT:** [Shannon Explorer Faucet](https://shannon-explorer.somnia.network) • [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet) (Somnia Shannon 50312 + tUSDC via `faucet()` 10k cap)

**Docs:**

- [WSOMNIA3009 Solution](contracts/docs/X402_PURE_SOMNIA_SOLUTION.md) - How STT gasless betting works on Somnia Shannon 50312 (12/12 tests passing, DreamDEX tUSDC 6d)
- [Quick Start](QUICKSTART.md) - Get running in 5 minutes
- [Contributing](CONTRIBUTING.md) - Want to help build this?

**Issues/Questions:** Open an issue on GitHub

---

**Built for the Event Contracts Hackathon — Somnia Shannon (50312) × DreamDEX (DoraHacks)** • **Somnia Network Exclusive** • **Apache 2.0 License**
