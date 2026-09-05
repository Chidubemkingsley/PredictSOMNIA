# 🚀 Somnia Shannon Testnet Quick Reference

## Essential Information

### Network Details
```
Network Name: Somnia Shannon Testnet
Chain ID: 50312
RPC URL: https://data-seed-presomnia-1-s1.binance.org:8545/
Currency: STT (test STT)
Block Explorer: https://shannon-explorer.somnia.network
```

### Quick Links
- **Faucet:** https://shannon-explorer.somnia.network/faucet-smart (0.5 STT/day)
- **Add Network:** https://chainlist.org/?search=50312
- **Explorer:** https://shannon-explorer.somnia.network
- **Documentation:** https://docs.bnbchain.org

---

## 🎯 Quick Start (5 Minutes)

### 1. Add Network to MetaMask
```bash
# Option A: Automatic
Visit https://chainlist.org/chain/50312 → Click "Add to MetaMask"

# Option B: Manual
Network Name: Somnia Shannon Testnet
RPC URL: https://data-seed-presomnia-1-s1.binance.org:8545/
Chain ID: 50312
Symbol: STT
Block Explorer: https://shannon-explorer.somnia.network
```

### 2. Get Test STT
```bash
1. Go to https://shannon-explorer.somnia.network/faucet-smart
2. Paste your MetaMask address
3. Complete verification (Twitter/GitHub)
4. Receive 0.5 STT instantly
```

### 3. Deploy Contracts
```bash
cd contracts

# Set your private key in .env.local
echo "PRIVATE_KEY=your_metamask_private_key" >> .env.local

# Deploy to Somnia Shannon Testnet
npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet
```

### 4. Update Configuration
```bash
# Copy addresses from deployment output to .env.local
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x...
NEXT_PUBLIC_AI_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_GASLESS_RELAYER_ADDRESS=0x...
```

### 5. Start Frontend
```bash
npm run dev
# Frontend will connect to Somnia Shannon Testnet automatically
```

---

## 📋 Commands Cheatsheet

### Deployment
```bash
# Deploy all contracts
npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet

# Check balance
npx hardhat run scripts/check-balance.js --network somniaTestnet

# Interact with contracts
npx hardhat console --network somniaTestnet
```

### Contract Verification
```bash
# Verify on Shannon Explorer (after deployment)
npx hardhat verify --network somniaTestnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Example
npx hardhat verify --network somniaTestnet 0x1234... "0x5678..."
```

### Testing
```bash
# Run tests on testnet
npx hardhat test --network somniaTestnet

# Run specific test
npx hardhat run test-somnia-testnet.js --network somniaTestnet
```

---

## 💰 Cost Comparison

| Operation | Gas | Cost (10 gwei) | Mainnet Equivalent |
|-----------|-----|----------------|-------------------|
| Deploy All Contracts | ~5M | ~0.05 STT | ~$30 |
| Create Market | ~300k | ~0.003 STT | ~$1.80 |
| Place Bet | ~100k | ~0.001 STT | ~$0.60 |
| Resolve Market | ~80k | ~0.0008 STT | ~$0.48 |

**Total for full test:** ~0.06 STT (FREE from faucet!)

---

## 🔧 Troubleshooting

### "Insufficient funds"
→ Get more STT from faucet (0.5 STT/day)

### "Network timeout"
→ Try alternative RPC:
- https://data-seed-presomnia-2-s1.binance.org:8545/
- https://data-seed-presomnia-1-s2.binance.org:8545/

### "Nonce too high"
→ Reset MetaMask: Settings → Advanced → Reset Account

### "Transaction underpriced"
→ Increase gas price in hardhat.config.js to 15 gwei

### "Cannot find module"
→ Run: `npm install` or `cd contracts && npm install`

---

## 📊 Monitoring

### View Contract on Shannon Explorer
```
https://shannon-explorer.somnia.network/address/YOUR_CONTRACT_ADDRESS

Features:
- View transactions
- Read contract state
- Write to contract (if verified)
- View events/logs
- Check token balances
```

### Monitor Transactions
```javascript
// In hardhat console
const tx = await contract.someFunction();
console.log('TX Hash:', tx.hash);
console.log('View:', `https://shannon-explorer.somnia.network/tx/${tx.hash}`);
```

---

## 🎯 Testing Checklist

- [ ] Add Somnia Shannon Testnet to MetaMask
- [ ] Get 0.5 STT from faucet
- [ ] Deploy contracts to testnet
- [ ] Verify contracts on Shannon Explorer
- [ ] Update .env.local with addresses
- [ ] Create test market
- [ ] Place test bets
- [ ] Test AI oracle resolution
- [ ] Test claim winnings
- [ ] Share with team for testing

---

## 🔐 Security Reminders

⚠️ **NEVER commit private keys to git!**

```bash
# Safe for testnet (has no real value)
PRIVATE_KEY=0x1234... # Testnet key only

# NEVER for mainnet
PRIVATE_KEY=0xabcd... # ❌ DANGER! Real funds!

# Use .gitignore
echo ".env.local" >> .gitignore
```

---

## 🚀 After Testing

When ready for mainnet:

1. **Get audit** - Smart contract security review
2. **Full testing** - Extensive testnet usage
3. **Community feedback** - Beta testers
4. **Deploy to mainnet** - Use `--network somnia`
5. **Monitor closely** - First 24-48 hours critical

---

## 📞 Support

- **Somnia Discord:** https://discord.gg/bnbchain
- **Documentation:** https://docs.bnbchain.org
- **Telegram:** https://t.me/STTchain
- **Forum:** https://forum.bnbchain.org

---

**Somnia Shannon Testnet = Real blockchain + FREE testing! 🎉**
