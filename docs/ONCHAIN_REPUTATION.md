# On-Chain Reputation System

## 🎯 Overview

The PredictSOMNIA platform now features a **fully on-chain reputation system** that tracks trader performance and enables trustless copy trading. All reputation data is stored on the blockchain, making it verifiable, immutable, and decentralized.

## 📊 Key Features

### 1. **On-Chain Trader Statistics**

Every trader's performance is automatically tracked and stored on-chain:

```solidity
struct TraderStats {
    uint256 totalBets;              // Total number of bets placed
    uint256 totalWins;              // Total winning bets
    uint256 totalLosses;            // Total losing bets
    uint256 totalVolume;            // Total amount traded (in wei)
    uint256 totalProfit;            // Total profit earned (in wei)
    uint256 currentStreak;          // Current win/loss streak
    uint256 bestStreak;             // Best win streak ever
    uint256 reputationScore;        // Reputation score (0-1000)
    uint256 lastActivityTime;       // Last time trader was active
    bool isVerified;                // Manual verification status
}
```

### 2. **Reputation Score Algorithm**

Reputation scores (0-1000) are calculated based on four components:

| Component | Weight | Description |
|-----------|--------|-------------|
| **Win Rate** | 40% (0-400 points) | Higher win percentage = more points |
| **Volume** | 30% (0-300 points) | More trading volume = more points |
| **Activity** | 15% (0-150 points) | More total bets = more points |
| **Streak** | 15% (0-150 points) | Longer win streaks = more points |

**Formula:**
```
Win Rate Score = (Total Wins / Total Bets) × 400
Volume Score = Capped at 300 (100+ ETH = max)
Activity Score = min(Total Bets × 5, 150)
Streak Score = min(Best Streak × 10, 150)

Reputation Score = min(Sum of all components, 1000)
```

### 3. **Badge System**

Badges are automatically awarded based on reputation thresholds:

| Badge | Threshold | Description |
|-------|-----------|-------------|
| 🥉 **Bronze** | 100+ reputation | Entry-level trader |
| 🥈 **Silver** | 300+ reputation | Skilled trader |
| 🥇 **Gold** | 600+ reputation | Expert trader |
| 💎 **Platinum** | 900+ reputation | Elite trader |

Badges are stored on-chain and cannot be removed:

```solidity
struct Badge {
    string name;                    // Badge name (e.g., "Gold Trader")
    uint256 unlockedAt;             // Timestamp when unlocked
    uint256 tier;                   // Badge tier (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
}
```

### 4. **Copy Trading System**

Users can follow top traders and automatically copy their bets:

```solidity
struct CopyTrader {
    address trader;                 // Address of trader being copied
    uint256 maxAmountPerTrade;      // Max amount to copy per trade
    uint256 copyPercentage;         // Percentage of trader's bet to copy (1-100)
    bool active;                    // Is copy trading active
    uint256 totalCopied;            // Total amount copied
    uint256 profit;                 // Profit from copying
    uint256 startedAt;              // When started copying
}
```

**Copy Trading Flow:**
1. Follower calls `followTrader(traderAddress, maxAmount, percentage)`
2. When trader places a bet, followers' bets are automatically copied
3. Copy amount = `min(traderBet * percentage / 100, maxAmount)`
4. When market resolves, fees are distributed:
   - 5% to the trader being copied
   - 5% to platform
   - 90% to follower

### 5. **Automatic Reputation Updates**

Reputation is updated automatically through smart contract hooks:

**When Trader Places Bet** (`buyPosition`):
```solidity
function recordBet(address trader, uint256 marketId, uint256 amount, bool position) {
    stats.totalBets++;
    stats.totalVolume += amount;
    stats.lastActivityTime = block.timestamp;
    
    if (stats.totalBets == 1) {
        stats.reputationScore = 100; // Starting score
    }
    
    emit BetPlaced(trader, marketId, amount, position);
}
```

**When Market Resolves** (`claimWinnings`):
```solidity
function settleBet(address trader, uint256 marketId, bool won, uint256 profit) {
    if (won) {
        stats.totalWins++;
        stats.totalProfit += profit;
        stats.currentStreak++;
        
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
    } else {
        stats.totalLosses++;
        stats.currentStreak = 0; // Reset streak
    }
    
    // Recalculate reputation score
    stats.reputationScore = calculateReputationScore(trader);
    
    // Check and award badges
    _checkAndAwardBadges(trader);
    
    emit ReputationUpdated(trader, stats.reputationScore, oldScore);
}
```

## 🏗️ Smart Contract Architecture

### Contracts

1. **`TraderReputation.sol`** (516 lines)
   - Standalone reputation tracking contract
   - Deployed automatically by `PredictionMarket` constructor
   - Stores all trader stats, badges, and copy trading settings
   - Emits events for all reputation changes

2. **`PredictionMarket.sol`** (updated)
   - Integrates with `TraderReputation` contract
   - Calls `recordBet()` when users place bets
   - Calls `settleBet()` when users claim winnings
   - Executes copy trades automatically

### Integration Points

```solidity
// PredictionMarket.sol
TraderReputation public reputationContract;

constructor() Ownable(msg.sender) {
    // Deploy reputation contract
    reputationContract = new TraderReputation(address(this));
}

function buyPosition(uint256 _marketId, bool _position) external payable {
    // ... bet logic ...
    
    // Record bet in reputation contract
    reputationContract.recordBet(msg.sender, _marketId, msg.value, _position);
    
    // Execute copy trades
    _executeCopyTrades(_marketId, msg.sender, _position, msg.value);
}

function claimWinnings(uint256 _marketId) external {
    // ... claim logic ...
    
    // Update reputation
    reputationContract.settleBet(msg.sender, _marketId, won, profit);
}
```

## 📡 Frontend Integration

### Reading Trader Stats

```typescript
import { TraderReputationABI } from './abis/TraderReputation';

// Get trader statistics
async function getTraderStats(address: string) {
  const stats = await reputationContract.getTraderStats(address);
  
  return {
    totalBets: Number(stats.totalBets),
    totalWins: Number(stats.totalWins),
    totalLosses: Number(stats.totalLosses),
    totalVolume: ethers.formatEther(stats.totalVolume),
    totalProfit: ethers.formatEther(stats.totalProfit),
    winRate: Number(stats.winRate), // Already in percentage
    currentStreak: Number(stats.currentStreak),
    bestStreak: Number(stats.bestStreak),
    reputationScore: Number(stats.reputationScore),
  };
}

// Get trader badges
async function getTraderBadges(address: string) {
  const badges = await reputationContract.getTraderBadges(address);
  
  return badges.map(badge => ({
    name: badge.name,
    unlockedAt: new Date(Number(badge.unlockedAt) * 1000),
    tier: Number(badge.tier),
  }));
}

// Get follower count
async function getFollowerCount(address: string) {
  return await reputationContract.getTraderFollowerCount(address);
}
```

### Copy Trading Actions

```typescript
// Follow a trader
async function followTrader(
  traderAddress: string,
  maxAmountPerTrade: bigint,
  copyPercentage: number
) {
  const tx = await reputationContract.followTrader(
    traderAddress,
    maxAmountPerTrade,
    copyPercentage
  );
  await tx.wait();
}

// Unfollow a trader
async function unfollowTrader(traderAddress: string) {
  const tx = await reputationContract.unfollowTrader(traderAddress);
  await tx.wait();
}

// Update copy settings
async function updateCopySettings(
  traderAddress: string,
  maxAmountPerTrade: bigint,
  copyPercentage: number
) {
  const tx = await reputationContract.updateCopySettings(
    traderAddress,
    maxAmountPerTrade,
    copyPercentage
  );
  await tx.wait();
}

// Get copy settings
async function getCopySettings(
  followerAddress: string,
  traderAddress: string
) {
  const settings = await reputationContract.getCopyTradeSettings(
    followerAddress,
    traderAddress
  );
  
  return {
    maxAmountPerTrade: settings.maxAmountPerTrade,
    copyPercentage: Number(settings.copyPercentage),
    active: settings.active,
    totalCopied: ethers.formatEther(settings.totalCopied),
    profit: ethers.formatEther(settings.profit),
  };
}
```

### Listening to Events

```typescript
// Listen for reputation updates
reputationContract.on('ReputationUpdated', (trader, newScore, oldScore) => {
  console.log(`${trader} reputation: ${oldScore} → ${newScore}`);
  updateLeaderboard();
});

// Listen for badge unlocks
reputationContract.on('BadgeUnlocked', (trader, badgeName, tier) => {
  console.log(`${trader} unlocked ${badgeName}!`);
  showBadgeNotification(trader, badgeName, tier);
});

// Listen for new followers
reputationContract.on('TraderFollowed', (follower, trader, maxAmount, percentage) => {
  console.log(`${follower} started copying ${trader} at ${percentage}%`);
  updateFollowerCount(trader);
});
```

## 🔐 Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **Access Control**: Only PredictionMarket contract can record bets/settle
3. **Input Validation**: 
   - Copy percentage must be 1-100%
   - Cannot follow yourself
   - Cannot unfollow if not following
4. **Immutable Stats**: Reputation history cannot be tampered with
5. **Event Logging**: All changes emit events for transparency

## 📈 Gas Optimization

- **Lazy Badge Awards**: Badges are only awarded when reputation crosses threshold
- **No Badge Duplicates**: Check prevents awarding same badge twice
- **Efficient Storage**: Uses `mapping` instead of arrays for O(1) lookups
- **Batch Processing**: Reputation updates happen on claim, not on resolution (prevents gas limits)

## 🎮 Example User Flow

### Alice Becomes a Top Trader

1. **First Bet**: Alice places her first bet of 1 STT
   - `recordBet()` called
   - Stats: totalBets=1, totalVolume=1 STT, reputationScore=100

2. **First Win**: Market resolves, Alice wins 1.98 STT (after 2% fee)
   - Alice calls `claimWinnings()`
   - `settleBet()` called with won=true, profit=0.98 STT
   - Stats: totalWins=1, currentStreak=1, reputationScore=150
   - **Bronze Badge Unlocked!** 🥉

3. **More Wins**: Alice wins 9 more bets in a row
   - Reputation increases to 400
   - **Silver Badge Unlocked!** 🥈

4. **High Volume**: Alice bets 100 STT total
   - Volume score maxed at 300 points
   - Reputation now 650
   - **Gold Badge Unlocked!** 🥇

### Bob Copies Alice

1. **Follow**: Bob calls `followTrader(alice, 0.5 ether, 50)`
   - Bob will copy 50% of Alice's bets
   - Max 0.5 STT per trade

2. **Auto-Copy**: Alice bets 2 STT on Market #10
   - Bob's bet automatically placed: 1 STT (50% of 2 STT)
   - Both positions recorded

3. **Profit Share**: Market resolves, both win
   - Alice gets full winnings
   - Bob gets winnings minus fees:
     - 5% to Alice (trader fee)
     - 5% to platform
     - 90% to Bob

## 📊 Leaderboard Query

To build a leaderboard, query reputation for all traders:

```typescript
async function getTopTraders(limit: number = 10) {
  // Get all trader addresses (from events or database)
  const allTraders = await getAllTraderAddresses();
  
  // Get stats for each
  const tradersWithStats = await Promise.all(
    allTraders.map(async (address) => {
      const stats = await getTraderStats(address);
      const followerCount = await getFollowerCount(address);
      const badges = await getTraderBadges(address);
      
      return {
        address,
        ...stats,
        followerCount,
        badges,
      };
    })
  );
  
  // Sort by reputation score
  return tradersWithStats
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .slice(0, limit);
}
```

## 🚀 Deployment

The reputation contract is automatically deployed when PredictionMarket is deployed:

```bash
# Deploy PredictionMarket (includes TraderReputation)
npx hardhat run scripts/deploy.js --network somniaTestnet

# Get reputation contract address
const predictionMarket = await ethers.getContractAt("PredictionMarket", PREDICTION_MARKET_ADDRESS);
const reputationAddress = await predictionMarket.reputationContract();
console.log("TraderReputation deployed at:", reputationAddress);
```

## 📝 Next Steps

1. **Update Frontend Types**: Add TraderReputation ABI and types
2. **Build Leaderboard**: Query top traders by reputation score
3. **Copy Trading UI**: Build follow/unfollow buttons with settings
4. **Notifications**: Show badge unlocks and reputation updates
5. **Profile Pages**: Display trader stats, badges, and followers
6. **Backend Indexer**: Index events to build fast leaderboard API

## 🎯 Benefits

✅ **Trustless**: All data on-chain, no centralized database
✅ **Verifiable**: Anyone can verify trader performance
✅ **Immutable**: Stats cannot be manipulated or deleted
✅ **Transparent**: All changes emit events
✅ **Gas Efficient**: Optimized for minimal gas costs
✅ **Automatic**: No manual updates needed
✅ **Decentralized**: Works without backend servers

## 🔗 Contract Addresses

**Somnia Shannon Testnet:**
- PredictionMarket: `TBD`
- TraderReputation: `TBD`

**Somnia Mainnet:**
- PredictionMarket: `TBD`
- TraderReputation: `TBD`

---

**Built with ❤️ for Event Contracts Hackathon — Somnia Shannon (50312)**
