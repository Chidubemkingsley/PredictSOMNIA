# Local Blockchain Testing Guide

This guide explains how to test the PredictSOMNIA smart contracts locally using Hardhat.

## Prerequisites

1. Node.js (v18 or higher)
2. npm or yarn
3. MetaMask browser extension (optional, for frontend testing)

## Setup

### 1. Install Dependencies

```bash
cd contracts
npm install
```

### 2. Compile Contracts

```bash
npm run compile
```

This will compile all Solidity contracts and generate TypeScript types.

## Testing Options

### Option 1: Run Unit Tests

Run the comprehensive test suite:

```bash
npm test
```

This will:
- Test market creation
- Test position taking (buying YES/NO)
- Test market odds calculation
- Test market resolution
- Test winnings calculation and claiming
- Test administrative functions

**Expected Output:**
```
  PredictionMarket
    Market Creation
      ✔ Should create a market with correct parameters
      ✔ Should fail if end time is in the past
      ✔ Should fail if question is empty
      ✔ Should increment market count
    Position Taking
      ✔ Should allow buying YES position
      ✔ Should allow buying NO position
      ...
```

### Option 2: Local Blockchain Node

Start a local Hardhat blockchain node that runs persistently:

```bash
npm run node
```

This will:
- Start a local blockchain on http://127.0.0.1:8545
- Display 20 test accounts with private keys
- Keep the blockchain running until you stop it (Ctrl+C)

**Test Account Info:**
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d727e5f4f2e
```

### Option 3: Deploy to Local Network

In a **new terminal** (while the node is running):

```bash
npm run deploy:local
```

This will:
- Deploy all three contracts (PredictionMarket, AIOracle, GaslessRelayer)
- Configure contract permissions
- Create 3 sample markets
- Place test bets
- Display contract addresses and test accounts

**Sample Output:**
```
🚀 Deploying PredictSOMNIA contracts to Local Hardhat Network...

📋 Account Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Balance: 10000.0 ETH
Oracle: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Test Users: [...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PredictionMarket deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ AIOracle deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ GaslessRelayer deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

## Interacting with Local Blockchain

### Using Hardhat Console

Start interactive console:

```bash
npm run console
```

Example commands in console:

```javascript
// Get contract instance
const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
const pm = await PredictionMarket.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

// Check market count
await pm.marketCount();

// Get market details
const market = await pm.markets(1);
console.log(market);

// Get market odds
const [yesOdds, noOdds] = await pm.getMarketOdds(1);
console.log(`YES: ${yesOdds/100}%, NO: ${noOdds/100}%`);

// Get all markets
const marketIds = await pm.getAllMarkets();
console.log(marketIds);

// Create a new market
const [signer] = await ethers.getSigners();
const futureTime = Math.floor(Date.now()/1000) + 86400; // +1 day
await pm.createMarket(
  "Will it rain tomorrow?",
  "Test market",
  "weather",
  futureTime,
  true
);

// Buy position
await pm.buyPosition(1, true, { value: ethers.parseEther("1.0") });

// Resolve market (after it ends)
await pm.resolveMarket(3, true); // Market 3 ends in 1 minute

// Claim winnings
await pm.claimWinnings(3);
```

### Using Web3 Scripts

Create a test script `contracts/scripts/test-interaction.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const pm = await hre.ethers.getContractAt("PredictionMarket", contractAddress);
  
  // Your test code here
  const marketCount = await pm.marketCount();
  console.log("Total markets:", marketCount.toString());
}

main().catch(console.error);
```

Run it:
```bash
npx hardhat run scripts/test-interaction.js --network localhost
```

## Frontend Integration

### 1. Configure MetaMask

Add Local Network:
- Network Name: Localhost 8545
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency Symbol: ETH

### 2. Import Test Account

Copy one of the private keys from the node output and import it to MetaMask.

**⚠️ WARNING:** Only use test accounts on local network. Never use these on mainnet!

### 3. Update Frontend Configuration

Create `.env.local` in the project root:

```bash
# Use the addresses from deployment output
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_AI_ORACLE_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_GASLESS_RELAYER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

# Local network
NEXT_PUBLIC_Somnia_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337
NEXT_PUBLIC_ENABLE_TESTNET=true
```

### 4. Start Frontend

```bash
npm run dev
```

Visit http://localhost:3000 and connect MetaMask to interact with your local contracts!

## Common Testing Scenarios

### Scenario 1: Complete Market Lifecycle

1. **Create Market**
```javascript
const futureTime = Math.floor(Date.now()/1000) + 3600; // +1 hour
await pm.createMarket("Question?", "Description", "category", futureTime, true);
```

2. **Place Bets**
```javascript
const [, user1, user2] = await ethers.getSigners();
await pm.connect(user1).buyPosition(1, true, { value: ethers.parseEther("1") });
await pm.connect(user2).buyPosition(1, false, { value: ethers.parseEther("0.5") });
```

3. **Check Odds**
```javascript
const [yes, no] = await pm.getMarketOdds(1);
console.log(`YES: ${yes/100}%, NO: ${no/100}%`);
```

4. **Fast Forward Time**
```javascript
await network.provider.send("evm_increaseTime", [3700]); // +1 hour + buffer
await network.provider.send("evm_mine");
```

5. **Resolve Market**
```javascript
await pm.resolveMarket(1, true); // YES wins
```

6. **Calculate & Claim Winnings**
```javascript
const winnings = await pm.calculateWinnings(1, user1.address);
console.log("Winnings:", ethers.formatEther(winnings), "ETH");
await pm.connect(user1).claimWinnings(1);
```

### Scenario 2: Test Quick Resolution

The deploy script creates Market #3 that ends in 1 minute:

```bash
# Wait 1 minute after deployment, then:
npm run console

# In console:
const pm = await ethers.getContractAt("PredictionMarket", "CONTRACT_ADDRESS");
await pm.resolveMarket(3, true);
```

### Scenario 3: Multiple Users Testing

```javascript
const [owner, oracle, u1, u2, u3] = await ethers.getSigners();

// All users bet
await pm.connect(u1).buyPosition(1, true, { value: ethers.parseEther("1") });
await pm.connect(u2).buyPosition(1, true, { value: ethers.parseEther("0.5") });
await pm.connect(u3).buyPosition(1, false, { value: ethers.parseEther("2") });

// Check individual positions
console.log(await pm.getUserPosition(1, u1.address));
console.log(await pm.getUserPosition(1, u2.address));
console.log(await pm.getUserPosition(1, u3.address));
```

## Troubleshooting

### Issue: "nonce too high" error

**Solution:** Reset MetaMask account:
- Settings → Advanced → Clear activity tab data

### Issue: Contracts not found

**Solution:** Make sure node is running and contracts are deployed:
```bash
# Terminal 1
npm run node

# Terminal 2
npm run deploy:local
```

### Issue: Transaction fails silently

**Solution:** Check gas limit and contract state:
```javascript
// Increase gas limit
await pm.buyPosition(1, true, { 
  value: ethers.parseEther("1"),
  gasLimit: 500000
});
```

### Issue: Time-based tests fail

**Solution:** Increase time properly:
```javascript
await network.provider.send("evm_increaseTime", [3600]);
await network.provider.send("evm_mine"); // Don't forget to mine!
```

## Useful Commands

```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Start local node
npm run node

# Deploy to local
npm run deploy:local

# Open console
npm run console

# Clean artifacts
npm run clean

# Run specific test
npx hardhat test test/PredictionMarket.test.js

# Check contract size
npx hardhat size-contracts

# Gas report (if configured)
REPORT_GAS=true npm test
```

## Next Steps

1. ✅ Test all contract functions locally
2. ✅ Integrate with frontend
3. ✅ Test gasless transactions
4. ✅ Test AI oracle integration
5. 🚀 Deploy to Somnia Shannon Testnet: `npm run deploy:testnet`
6. 🎯 Deploy to Somnia Mainnet: `npm run deploy:mainnet`

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Somnia Network Documentation](https://docs.bnbchain.org/)
