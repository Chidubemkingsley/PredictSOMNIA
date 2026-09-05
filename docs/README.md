# CreativeHead Documentation

> Complete documentation for the CreativeHead prediction market platform

## 📚 Quick Links

- [Main README](../README.md) - Project overview and getting started
- [Project Summary](PROJECT_SUMMARY.md) - High-level architecture and features
- [Somnia Network Exclusive](STT_CHAIN_EXCLUSIVE.md) - Why we're Somnia Network only
- [Quick Reference](../STT_CHAIN_QUICK_REFERENCE.md) - One-page Somnia Network guide
- [Deployment Guide](guides/DEPLOYMENT_GUIDE.md) - Production deployment instructions

---

## 🚀 Getting Started

### For Developers
1. [Quickstart Guide](guides/QUICKSTART.md) - Get up and running in 5 minutes
2. [Local Testing Guide](guides/LOCAL_TESTING_GUIDE.md) - Complete testing instructions
3. [Quick Test Reference](guides/QUICK_TEST_REFERENCE.md) - Fast testing commands

### For Contributors
- [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute to this project
- [Project Structure](#project-structure) - Understanding the codebase

---

## 📖 Documentation Sections

### 📝 Guides (`docs/guides/`)
Step-by-step instructions for common tasks:
- [Deployment Guide](guides/DEPLOYMENT_GUIDE.md) - Deploy to testnet/mainnet
- [Local Testing Guide](guides/LOCAL_TESTING_GUIDE.md) - Test locally
- [Quick Start Testing](guides/QUICK_START_TESTING.md) - Quick test walkthrough
- [Wallet Debug Guide](guides/WALLET_DEBUG_GUIDE.md) - Fix wallet connection issues

### 🔧 Fix Documentation (`docs/fixes/`)
Technical fixes and implementation details:
- [API Fixes](fixes/API_FIXES.md) - API-related bug fixes
- [API Implementation Guide](fixes/API_IMPLEMENTATION_GUIDE.md) - API setup details
- [Connection Fix Reference](fixes/CONNECTION_FIX_REFERENCE.md) - Connection troubleshooting
- [Web3 Connection Fix](fixes/WEB3_CONNECTION_FIX.md) - Web3 connectivity issues
- [Wallet Connect Fix](fixes/WALLETCONNECT_FIX_COMPLETE.md) - WalletConnect integration
- [WebSocket Error Fix](fixes/WEBSOCKET_ERROR_COMPLETE_FIX.md) - WebSocket handling
- [RainbowKit Setup](fixes/RAINBOWKIT_SETUP.md) - RainbowKit configuration

### 🏆 Hackathon Documentation (`docs/hackathon/`)
Event Contracts Hackathon — Somnia Shannon (50312) materials:
- [Hackathon Submission](hackathon/HACKATHON_SUBMISSION.md) - Official submission
- [Hackathon Features](hackathon/HACKATHON_FEATURES_COMPLETE.md) - Completed features
- [Demo Video Script](hackathon/DEMO_VIDEO_SCRIPT.md) - Video presentation guide
- [Winning Strategy](hackathon/WINNING_STRATEGY.md) - Competition positioning
- [Copy Trading USP](hackathon/COPY_TRADING_USP.md) - Unique selling points

### 📊 Project Status
Current implementation summaries:
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Overall progress
- [Testing Complete](TESTING_COMPLETE.md) - Test coverage
- [On-Chain Reputation](ONCHAIN_REPUTATION.md) - Reputation system

### 🔐 Smart Contracts
- [Contracts Documentation](../contracts/README.md) - Smart contract details
- [Test Reports](../contracts/TEST_SUMMARY.md) - Contract test results

---

## 🏗️ Project Structure

```
someCreativity/
├── src/                          # Frontend application
│   ├── app/                      # Next.js app directory
│   │   ├── creative-markets/     # Creative market showcase
│   │   ├── leaderboard/          # Trader leaderboard
│   │   ├── trader/               # Trader profile pages
│   │   └── api/                  # API routes
│   ├── components/               # React components
│   │   ├── copy-trading/         # Copy trading features
│   │   ├── providers/            # Context providers
│   │   └── ui/                   # UI components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Core business logic
│   │   ├── ai-oracle.ts          # AI judging engine
│   │   ├── gasless-service.ts    # Gasless transactions
│   │   └── liquidity-aggregator.ts # AMM pools
│   └── types/                    # TypeScript definitions
│
├── contracts/                    # Smart contracts (Solidity)
│   ├── contracts/                # Solidity source files
│   ├── scripts/                  # Deployment scripts
│   ├── test/                     # Contract tests
│   └── artifacts/                # Compiled contracts
│
├── docs/                         # Documentation (YOU ARE HERE)
│   ├── guides/                   # User guides
│   ├── fixes/                    # Technical fixes
│   ├── hackathon/                # Hackathon materials
│   └── archive/                  # Old documentation
│
├── scripts/                      # Utility scripts
│   ├── setup.sh                  # Project setup
│   └── verify-features.sh        # Feature verification
│
├── public/                       # Static assets
└── .vscode/                      # VS Code settings
```

---

## 🧪 Testing

### Frontend Tests
```bash
npm run dev                       # Start dev server
npm run lint                      # Run linting
npm run type-check                # TypeScript check
```

### Smart Contract Tests
```bash
cd contracts
npm install
npm test                          # Run all tests
npx hardhat compile               # Compile contracts
```

### Integration Tests
See [Local Testing Guide](guides/LOCAL_TESTING_GUIDE.md) for complete instructions.

---

## 🚢 Deployment

### Testnet Deployment
```bash
# Deploy contracts to STT testnet
npm run deploy:testnet

# Deploy frontend
npm run build
npm run start
```

### Mainnet Deployment
See [Deployment Guide](guides/DEPLOYMENT_GUIDE.md) for production deployment.

---

## 🔑 Key Technologies

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Web3**: Wagmi v2, Viem (Somnia Network exclusive)
- **Smart Contracts**: Solidity 0.8, Hardhat, OpenZeppelin
- **AI**: Claude API for creative market judging
- **Blockchain**: **Somnia Network Exclusive** (Testnet: 50312 | Mainnet: 5031)

> ℹ️ **Network Support:** This project is built exclusively for Somnia Network. No other chains (Ethereum, Polygon, etc.) are supported.

---

## 📞 Support

- **Issues**: Check [Fix Documentation](fixes/) first
- **Questions**: See [Project Summary](PROJECT_SUMMARY.md)
- **Contributing**: Read [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## 📜 License

Apache License 2.0 - Built for Event Contracts Hackathon — Somnia Shannon (50312) · Powered by Somnia Network

See [LICENSE](../LICENSE) for full details.

---

**Last Updated**: September 2026  
**Version**: 1.0.0  
**Status**: 🟢 Production Ready
