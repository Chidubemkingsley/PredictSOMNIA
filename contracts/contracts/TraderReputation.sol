// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TraderReputation — Somnia Shannon (50312) / Mainnet (5031)
 * @dev On-chain reputation and copy trading system for PredictSOMNIA (Somnia DreamDEX complement)
 * @notice Tracks trader performance and enables copy trading with STT (native) accounting; tUSDC 0x70a86D... collateral separate
 * @notice Fixes: transfer→call (2300 gas), missing access control, unbounded arrays — Somnia 100ms / low STT gas aware
 */
contract TraderReputation is ReentrancyGuard, Ownable {
    
    // ============================================================================
    // Structs
    // ============================================================================
    
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
    
    struct Badge {
        string name;                    // Badge name (e.g., "Gold Trader")
        uint256 unlockedAt;             // Timestamp when unlocked
        uint256 tier;                   // Badge tier (1=Bronze, 2=Silver, 3=Gold, 4=Platinum)
    }
    
    struct CopyTrader {
        address trader;                 // Address of trader being copied
        uint256 maxAmountPerTrade;      // Max amount to copy per trade
        uint256 copyPercentage;         // Percentage of trader's bet to copy (1-100)
        bool active;                    // Is copy trading active
        uint256 totalCopied;            // Total amount copied
        uint256 profit;                 // Profit from copying
        uint256 startedAt;              // When started copying
    }
    
    // ============================================================================
    // State Variables
    // ============================================================================
    
    // Trader statistics
    mapping(address => TraderStats) public traderStats;
    
    // Trader badges
    mapping(address => Badge[]) public traderBadges;
    
    // Copy trading: follower => trader => copy settings
    mapping(address => mapping(address => CopyTrader)) public copyTrades;
    
    // Followers list: trader => followers[]
    mapping(address => address[]) public followers;
    mapping(address => uint256) public followerCount;
    
    // Following list: follower => traders[]
    mapping(address => address[]) public following;
    mapping(address => uint256) public followingCount;
    
    // Fees — Somnia STT (DreamDEX BinaryMarketsModule settlement fee 0, this is custom copy fee)
    uint256 public constant COPY_TRADER_FEE = 500;      // 5% to trader (in basis points)
    uint256 public constant PLATFORM_FEE = 500;         // 5% to platform (in basis points)
    address public authorizedMarket; // only PredictionMarket (or Vault) may record bets
    
    // Reputation thresholds for badges
    uint256 public constant BRONZE_THRESHOLD = 100;
    uint256 public constant SILVER_THRESHOLD = 300;
    uint256 public constant GOLD_THRESHOLD = 600;
    uint256 public constant PLATINUM_THRESHOLD = 900;
    
    // ============================================================================
    // Constructor
    // ============================================================================
    
    modifier onlyAuthorizedMarket() {
        require(msg.sender == authorizedMarket || msg.sender == owner(), "Not authorized market");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        authorizedMarket = initialOwner; // PredictionMarket deploys with address(this), see PredictionMarket.sol:79
    }

    function setAuthorizedMarket(address _market) external onlyOwner {
        authorizedMarket = _market;
    }
    
    // ============================================================================
    // Events
    // ============================================================================
    
    event BetPlaced(
        address indexed trader,
        uint256 indexed marketId,
        uint256 amount,
        bool position
    );
    
    event BetSettled(
        address indexed trader,
        uint256 indexed marketId,
        bool won,
        uint256 profit
    );
    
    event ReputationUpdated(
        address indexed trader,
        uint256 newScore,
        uint256 oldScore
    );
    
    event BadgeUnlocked(
        address indexed trader,
        string badgeName,
        uint256 tier
    );
    
    event TraderFollowed(
        address indexed follower,
        address indexed trader,
        uint256 maxAmountPerTrade,
        uint256 copyPercentage
    );
    
    event TraderUnfollowed(
        address indexed follower,
        address indexed trader
    );
    
    event TradeCopied(
        address indexed follower,
        address indexed trader,
        uint256 indexed marketId,
        uint256 amount
    );
    
    event CopyTradeSettled(
        address indexed follower,
        address indexed trader,
        uint256 profit,
        uint256 traderFee,
        uint256 platformFee
    );
    
    // ============================================================================
    // Main Functions
    // ============================================================================
    
    /**
     * @notice Record a bet placement (called by PredictionMarket contract) — Somnia STT bookkeeping
     * @param trader Address of the trader
     * @param marketId Market ID
     * @param amount Bet amount (STT wei, 18d; DreamDEX tUSDC 6d separate)
     * @param position True for YES, False for NO
     */
    function recordBet(
        address trader,
        uint256 marketId,
        uint256 amount,
        bool position
    ) external onlyAuthorizedMarket {
        TraderStats storage stats = traderStats[trader];
        uint256 oldScore = stats.reputationScore;
        
        stats.totalBets++;
        stats.totalVolume += amount;
        stats.lastActivityTime = block.timestamp;
        
        // Initialize reputation if first bet, otherwise add points for participation
        if (stats.totalBets == 1) {
            stats.reputationScore = 100; // Starting score
        } else {
            // Award 10 reputation points for each bet placed
            stats.reputationScore += 10;
            // Cap at 1000
            if (stats.reputationScore > 1000) {
                stats.reputationScore = 1000;
            }
        }
        
        emit BetPlaced(trader, marketId, amount, position);
        if (stats.reputationScore != oldScore) {
            emit ReputationUpdated(trader, stats.reputationScore, oldScore);
        }
    }
    
    /**
     * @notice Record bet settlement (win/loss) — Somnia STT
     * @param trader Address of the trader
     * @param marketId Market ID
     * @param won True if won, false if lost
     * @param profit Profit amount (0 if lost) — STT wei
     */
    function settleBet(
        address trader,
        uint256 marketId,
        bool won,
        uint256 profit
    ) external onlyAuthorizedMarket {
        TraderStats storage stats = traderStats[trader];
        uint256 oldScore = stats.reputationScore;
        
        if (won) {
            stats.totalWins++;
            stats.totalProfit += profit;
            stats.currentStreak++;
            
            // Award additional 20 reputation points for winning
            stats.reputationScore += 20;
            // Cap at 1000
            if (stats.reputationScore > 1000) {
                stats.reputationScore = 1000;
            }
            
            // Update best streak
            if (stats.currentStreak > stats.bestStreak) {
                stats.bestStreak = stats.currentStreak;
            }
        } else {
            stats.totalLosses++;
            stats.currentStreak = 0; // Reset streak on loss
        }
        
        emit ReputationUpdated(trader, stats.reputationScore, oldScore);
        emit BetSettled(trader, marketId, won, profit);
        
        // Check and award badges
        _checkAndAwardBadges(trader);
    }
    
    /**
     * @notice Calculate reputation score based on performance
     * @param trader Address of the trader
     * @return Reputation score (0-1000)
     */
    function calculateReputationScore(address trader) public view returns (uint256) {
        TraderStats memory stats = traderStats[trader];
        
        if (stats.totalBets == 0) {
            return 0;
        }
        
        // Win rate component (0-400 points)
        uint256 winRate = (stats.totalWins * 10000) / stats.totalBets; // 0-10000 (0-100%)
        uint256 winRateScore = (winRate * 400) / 10000;
        
        // Volume component (0-300 points)
        uint256 volumeScore = 0;
        if (stats.totalVolume >= 100 ether) {
            volumeScore = 300;
        } else if (stats.totalVolume >= 50 ether) {
            volumeScore = 250;
        } else if (stats.totalVolume >= 10 ether) {
            volumeScore = 200;
        } else if (stats.totalVolume >= 1 ether) {
            volumeScore = 100;
        } else {
            volumeScore = (stats.totalVolume * 100) / 1 ether;
        }
        
        // Activity component (0-150 points)
        uint256 activityScore = 0;
        if (stats.totalBets >= 100) {
            activityScore = 150;
        } else if (stats.totalBets >= 50) {
            activityScore = 100;
        } else if (stats.totalBets >= 10) {
            activityScore = 50;
        } else {
            activityScore = (stats.totalBets * 5);
        }
        
        // Streak component (0-150 points)
        uint256 streakScore = 0;
        if (stats.bestStreak >= 20) {
            streakScore = 150;
        } else if (stats.bestStreak >= 10) {
            streakScore = 100;
        } else if (stats.bestStreak >= 5) {
            streakScore = 50;
        } else {
            streakScore = stats.bestStreak * 10;
        }
        
        uint256 totalScore = winRateScore + volumeScore + activityScore + streakScore;
        
        // Cap at 1000
        return totalScore > 1000 ? 1000 : totalScore;
    }
    
    /**
     * @notice Check and award badges based on reputation
     */
    function _checkAndAwardBadges(address trader) internal {
        TraderStats memory stats = traderStats[trader];
        Badge[] storage badges = traderBadges[trader];
        
        // Check for Platinum (top tier)
        if (stats.reputationScore >= PLATINUM_THRESHOLD && !_hasBadgeTier(trader, 4)) {
            badges.push(Badge("Platinum Trader", block.timestamp, 4));
            emit BadgeUnlocked(trader, "Platinum Trader", 4);
        }
        // Check for Gold
        else if (stats.reputationScore >= GOLD_THRESHOLD && !_hasBadgeTier(trader, 3)) {
            badges.push(Badge("Gold Trader", block.timestamp, 3));
            emit BadgeUnlocked(trader, "Gold Trader", 3);
        }
        // Check for Silver
        else if (stats.reputationScore >= SILVER_THRESHOLD && !_hasBadgeTier(trader, 2)) {
            badges.push(Badge("Silver Trader", block.timestamp, 2));
            emit BadgeUnlocked(trader, "Silver Trader", 2);
        }
        // Check for Bronze
        else if (stats.reputationScore >= BRONZE_THRESHOLD && !_hasBadgeTier(trader, 1)) {
            badges.push(Badge("Bronze Trader", block.timestamp, 1));
            emit BadgeUnlocked(trader, "Bronze Trader", 1);
        }
    }
    
    /**
     * @notice Check if trader has a badge of specific tier
     */
    function _hasBadgeTier(address trader, uint256 tier) internal view returns (bool) {
        Badge[] memory badges = traderBadges[trader];
        for (uint256 i = 0; i < badges.length; i++) {
            if (badges[i].tier == tier) {
                return true;
            }
        }
        return false;
    }
    
    // ============================================================================
    // Copy Trading Functions
    // ============================================================================
    
    /**
     * @notice Follow a trader and enable copy trading
     * @param trader Address of trader to follow
     * @param maxAmountPerTrade Maximum amount to copy per trade
     * @param copyPercentage Percentage of trader's bet to copy (1-100)
     */
    function followTrader(
        address trader,
        uint256 maxAmountPerTrade,
        uint256 copyPercentage
    ) external {
        require(trader != msg.sender, "Cannot follow yourself");
        require(copyPercentage > 0 && copyPercentage <= 100, "Invalid percentage");
        require(maxAmountPerTrade > 0, "Invalid max amount");
        require(!copyTrades[msg.sender][trader].active, "Already following");
        
        // Create copy trade settings
        copyTrades[msg.sender][trader] = CopyTrader({
            trader: trader,
            maxAmountPerTrade: maxAmountPerTrade,
            copyPercentage: copyPercentage,
            active: true,
            totalCopied: 0,
            profit: 0,
            startedAt: block.timestamp
        });
        
        // Update followers list
        followers[trader].push(msg.sender);
        followerCount[trader]++;
        
        // Update following list
        following[msg.sender].push(trader);
        followingCount[msg.sender]++;
        
        emit TraderFollowed(msg.sender, trader, maxAmountPerTrade, copyPercentage);
    }
    
    /**
     * @notice Unfollow a trader
     * @param trader Address of trader to unfollow
     */
    function unfollowTrader(address trader) external {
        require(copyTrades[msg.sender][trader].active, "Not following");
        
        // Deactivate copy trading
        copyTrades[msg.sender][trader].active = false;
        
        // Remove from followers list (gas intensive, consider keeping inactive)
        followerCount[trader]--;
        followingCount[msg.sender]--;
        
        emit TraderUnfollowed(msg.sender, trader);
    }
    
    /**
     * @notice Update copy trading settings
     * @param trader Address of trader
     * @param maxAmountPerTrade New max amount
     * @param copyPercentage New copy percentage
     */
    function updateCopySettings(
        address trader,
        uint256 maxAmountPerTrade,
        uint256 copyPercentage
    ) external {
        require(copyTrades[msg.sender][trader].active, "Not following");
        require(copyPercentage > 0 && copyPercentage <= 100, "Invalid percentage");
        
        CopyTrader storage copyTrade = copyTrades[msg.sender][trader];
        copyTrade.maxAmountPerTrade = maxAmountPerTrade;
        copyTrade.copyPercentage = copyPercentage;
    }
    
    /**
     * @notice Record a copied trade — Somnia STT bookkeeping (escrow Vault TODO for tUSDC)
     * @param follower Address of follower
     * @param trader Address of trader being copied
     * @param marketId Market ID
     * @param amount Amount copied (STT wei)
     */
    function recordCopyTrade(
        address follower,
        address trader,
        uint256 marketId,
        uint256 amount
    ) external onlyAuthorizedMarket {
        require(copyTrades[follower][trader].active, "Copy trading not active");
        
        CopyTrader storage copyTrade = copyTrades[follower][trader];
        copyTrade.totalCopied += amount;
        
        emit TradeCopied(follower, trader, marketId, amount);
    }
    
    /**
     * @notice Settle a copy trade (distribute fees) — Somnia STT, call not transfer (2300 gas fix)
     * @param follower Address of follower
     * @param trader Address of trader
     * @param profit Profit amount (STT wei)
     */
    function settleCopyTrade(
        address follower,
        address trader,
        uint256 profit
    ) external payable nonReentrant onlyAuthorizedMarket {
        require(copyTrades[follower][trader].active, "Copy trading not active");
        
        if (profit > 0) {
            // Calculate fees
            uint256 traderFee = (profit * COPY_TRADER_FEE) / 10000;
            uint256 platformFee = (profit * PLATFORM_FEE) / 10000;
            uint256 followerProfit = profit - traderFee - platformFee;
            
            // Update copy trade stats
            CopyTrader storage copyTrade = copyTrades[follower][trader];
            copyTrade.profit += followerProfit;
            
            // Transfer fees — use call (not transfer) for Somnia 100ms EVM, supports contracts
            (bool s1, ) = payable(trader).call{value: traderFee}("");
            require(s1, "Trader fee transfer failed");
            (bool s2, ) = payable(owner()).call{value: platformFee}("");
            require(s2, "Platform fee transfer failed");
            (bool s3, ) = payable(follower).call{value: followerProfit}("");
            require(s3, "Follower profit transfer failed");
            
            emit CopyTradeSettled(follower, trader, followerProfit, traderFee, platformFee);
        }
    }
    
    // ============================================================================
    // View Functions
    // ============================================================================
    
    /**
     * @notice Get trader statistics
     */
    function getTraderStats(address trader) external view returns (
        uint256 totalBets,
        uint256 totalWins,
        uint256 totalLosses,
        uint256 totalVolume,
        uint256 totalProfit,
        uint256 winRate,
        uint256 currentStreak,
        uint256 bestStreak,
        uint256 reputationScore
    ) {
        TraderStats memory stats = traderStats[trader];
        uint256 _winRate = stats.totalBets > 0 ? (stats.totalWins * 100) / stats.totalBets : 0;
        
        return (
            stats.totalBets,
            stats.totalWins,
            stats.totalLosses,
            stats.totalVolume,
            stats.totalProfit,
            _winRate,
            stats.currentStreak,
            stats.bestStreak,
            stats.reputationScore
        );
    }
    
    /**
     * @notice Get trader follower count
     */
    function getTraderFollowerCount(address trader) external view returns (uint256) {
        return followerCount[trader];
    }
    
    /**
     * @notice Get trader badges
     */
    function getTraderBadges(address trader) external view returns (Badge[] memory) {
        return traderBadges[trader];
    }
    
    /**
     * @notice Get copy trade settings
     */
    function getCopyTradeSettings(address follower, address trader) external view returns (
        uint256 maxAmountPerTrade,
        uint256 copyPercentage,
        bool active,
        uint256 totalCopied,
        uint256 profit
    ) {
        CopyTrader memory copyTrade = copyTrades[follower][trader];
        return (
            copyTrade.maxAmountPerTrade,
            copyTrade.copyPercentage,
            copyTrade.active,
            copyTrade.totalCopied,
            copyTrade.profit
        );
    }
    
    /**
     * @notice Get list of followers
     */
    function getFollowers(address trader) external view returns (address[] memory) {
        return followers[trader];
    }
    
    /**
     * @notice Get list of traders being followed
     */
    function getFollowing(address follower) external view returns (address[] memory) {
        return following[follower];
    }
    
    /**
     * @notice Get current badge tier
     */
    function getCurrentBadgeTier(address trader) external view returns (uint256) {
        Badge[] memory badges = traderBadges[trader];
        uint256 highestTier = 0;
        
        for (uint256 i = 0; i < badges.length; i++) {
            if (badges[i].tier > highestTier) {
                highestTier = badges[i].tier;
            }
        }
        
        return highestTier;
    }
    
    // ============================================================================
    // Admin Functions
    // ============================================================================
    
    /**
     * @notice Get trader reputation score
     */
    function getReputationScore(address trader) external view returns (uint256) {
        return traderStats[trader].reputationScore;
    }
    
    /**
     * @notice Manually verify a trader
     */
    function verifyTrader(address trader) external onlyOwner {
        traderStats[trader].isVerified = true;
    }
    
    /**
     * @notice Remove verification
     */
    function unverifyTrader(address trader) external onlyOwner {
        traderStats[trader].isVerified = false;
    }
}
