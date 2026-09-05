// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TraderReputation.sol";

/**
 * @title PredictionMarket — Somnia Shannon (50312) / Mainnet (5031)
 * @dev Decentralized prediction market on Somnia with DreamDEX Event Contracts complement + AI-assisted Groq oracle
 * @notice Somnia-adapted: 100ms blocks, STT native gas, EIP-3009 WSOMNIA3009 gasless, DreamDEX BinaryMarketsModule 0x3ecC694C... as primary event market
 * @notice Custom markets here use native STT (tUSDC 0x70a86D... is DreamDEX collateral) — for hackathon, both can coexist
 */
contract PredictionMarket is ReentrancyGuard, Ownable {
    struct Market {
        uint256 id;
        string question;
        string description;
        string category;
        address creator;
        uint256 endTime;
        uint256 totalYesAmount;
        uint256 totalNoAmount;
        bool resolved;
        bool outcome;
        uint256 resolvedAt;
        bool aiOracleEnabled;
    }

    struct Position {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    // State variables — Somnia STT native (ether unit = STT wei, 18 decimals), DreamDEX tUSDC 6d separate
    uint256 public marketCount;
    uint256 public constant PLATFORM_FEE = 200; // 2% fee (in basis points) — DreamDEX settlement fee 0, this is custom market fee
    uint256 public constant MIN_BET = 0.001 ether; // 0.001 STT minimum bet (Somnia Shannon low fee, was BNB)
    uint256 public constant MIN_REPUTATION_TO_CREATE = 50; // Minimum reputation score to create markets
    uint256 public constant MAX_COPY_FOLLOWERS_PER_TRADE = 50; // Somnia gas guard — prevents unbounded loop DoS (100ms blocks, 30M gas)
    
    TraderReputation public reputationContract;
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(address => bool) public authorizedOracles;
    
    // Events
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 endTime,
        address indexed creator
    );
    
    event PositionTaken(
        uint256 indexed marketId,
        address indexed user,
        bool position,
        uint256 amount
    );
    
    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 resolvedAt
    );
    
    event WinningsClaimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 amount
    );

    constructor() Ownable(msg.sender) {
        // Initialize with deployer as authorized oracle
        authorizedOracles[msg.sender] = true;
        
        // Deploy reputation contract with this contract as owner
        reputationContract = new TraderReputation(address(this));
    }
    
    /**
     * @dev Set reputation contract address (for existing deployments)
     */
    function setReputationContract(address _reputationContract) external onlyOwner {
        reputationContract = TraderReputation(_reputationContract);
    }

    /**
     * @dev Create a new prediction market
     */
    function createMarket(
        string memory _question,
        string memory _description,
        string memory _category,
        uint256 _endTime,
        bool _aiOracleEnabled
    ) external returns (uint256) {
        require(_endTime > block.timestamp, "End time must be in the future");
        require(bytes(_question).length > 0, "Question cannot be empty");
        
        // Check reputation requirement (owner bypasses this)
        if (address(reputationContract) != address(0) && msg.sender != owner()) {
            uint256 reputation = reputationContract.getReputationScore(msg.sender);
            require(reputation >= MIN_REPUTATION_TO_CREATE, "Insufficient reputation to create markets. Place predictions to earn reputation.");
        }

        marketCount++;
        uint256 marketId = marketCount;

        markets[marketId] = Market({
            id: marketId,
            question: _question,
            description: _description,
            category: _category,
            creator: msg.sender,
            endTime: _endTime,
            totalYesAmount: 0,
            totalNoAmount: 0,
            resolved: false,
            outcome: false,
            resolvedAt: 0,
            aiOracleEnabled: _aiOracleEnabled
        });

        emit MarketCreated(marketId, _question, _endTime, msg.sender);
        return marketId;
    }

    /**
     * @dev Buy a position in a market (YES or NO)
     */
    function buyPosition(uint256 _marketId, bool _position) 
        external 
        payable 
        nonReentrant 
    {
        _buyPositionInternal(_marketId, _position, msg.sender, msg.value);
    }
    
    /**
     * @dev Buy position for user (called by x402 facilitator for gasless betting)
     */
    function buyPositionForUser(
        uint256 _marketId,
        bool _position,
        address user
    ) external payable nonReentrant {
        // Only authorized x402 contracts can call this
        require(authorizedOracles[msg.sender], "Not authorized");
        _buyPositionInternal(_marketId, _position, user, msg.value);
    }
    
    /**
     * @dev Internal function to buy position (supports both regular and gasless)
     */
    function _buyPositionInternal(
        uint256 _marketId,
        bool _position,
        address user,
        uint256 amount
    ) internal {
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market does not exist");
        require(!market.resolved, "Market already resolved");
        require(block.timestamp < market.endTime, "Market has ended");
        require(amount >= MIN_BET, "Bet amount too low");

        Position storage userPosition = positions[_marketId][user];

        if (_position) {
            userPosition.yesAmount += amount;
            market.totalYesAmount += amount;
        } else {
            userPosition.noAmount += amount;
            market.totalNoAmount += amount;
        }

        emit PositionTaken(_marketId, user, _position, amount);
        
        // Record bet in reputation contract
        if (address(reputationContract) != address(0)) {
            reputationContract.recordBet(user, _marketId, amount, _position);
            
            // Check for copy traders and execute copy trades
            _executeCopyTrades(_marketId, user, _position, amount);
        }
    }
    
    /**
     * @dev Execute copy trades for followers — Somnia gas-guarded (bounded loop)
     * @notice Fixes unbounded loop DoS: caps at MAX_COPY_FOLLOWERS_PER_TRADE (50) for 100ms Somnia blocks
     * @notice STT-only: copy position is bookkeeping; in production use escrow Vault (tUSDC 0x70a86D...) via CollateralRouter
     */
    function _executeCopyTrades(
        uint256 _marketId,
        address trader,
        bool _position,
        uint256 amount
    ) internal {
        address[] memory traderFollowers = reputationContract.getFollowers(trader);
        uint256 len = traderFollowers.length;
        if (len > MAX_COPY_FOLLOWERS_PER_TRADE) len = MAX_COPY_FOLLOWERS_PER_TRADE; // gas guard
        
        for (uint256 i = 0; i < len; i++) {
            address follower = traderFollowers[i];
            
            // Get copy trade settings
            (
                uint256 maxAmountPerTrade,
                uint256 copyPercentage,
                bool active,
                ,
                
            ) = reputationContract.getCopyTradeSettings(follower, trader);
            
            if (!active) continue;
            
            // Calculate copy amount
            uint256 copyAmount = (amount * copyPercentage) / 100;
            if (copyAmount > maxAmountPerTrade) {
                copyAmount = maxAmountPerTrade;
            }
            
            // Check follower has enough balance (simplified — Somnia STT escrow TODO via Vault)
            if (copyAmount < MIN_BET) continue;
            
            // Record copy trade position (STT bookkeeping)
            Position storage followerPosition = positions[_marketId][follower];
            if (_position) {
                followerPosition.yesAmount += copyAmount;
                markets[_marketId].totalYesAmount += copyAmount;
            } else {
                followerPosition.noAmount += copyAmount;
                markets[_marketId].totalNoAmount += copyAmount;
            }
            
            // Record in reputation contract
            reputationContract.recordCopyTrade(follower, trader, _marketId, copyAmount);
        }
    }

    /**
     * @dev Resolve a market (only authorized oracles)
     */
    function resolveMarket(uint256 _marketId, bool _outcome) 
        external 
        nonReentrant 
    {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market does not exist");
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.endTime, "Market has not ended");

        market.resolved = true;
        market.outcome = _outcome;
        market.resolvedAt = block.timestamp;

        emit MarketResolved(_marketId, _outcome, block.timestamp);
        
        // Update reputation for all participants
        if (address(reputationContract) != address(0)) {
            _updateParticipantReputation(_marketId, _outcome);
        }
    }

    /**
     * @dev Force-resolve when the event year has passed but endTime was set too far out.
     *      Authorized oracles or owner only — use for clearly decided past-year markets.
     */
    function forceResolveMarket(uint256 _marketId, bool _outcome)
        external
        nonReentrant
    {
        require(
            authorizedOracles[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        Market storage market = markets[_marketId];
        require(market.id != 0, "Market does not exist");
        require(!market.resolved, "Market already resolved");

        market.resolved = true;
        market.outcome = _outcome;
        market.resolvedAt = block.timestamp;

        emit MarketResolved(_marketId, _outcome, block.timestamp);

        if (address(reputationContract) != address(0)) {
            _updateParticipantReputation(_marketId, _outcome);
        }
    }
    
    /**
     * @dev Update reputation for all market participants after resolution
     * @dev Note: In production, process this in batches or off-chain to avoid gas limits
     * @dev For this implementation, reputation updates happen on claim instead
     */
    function _updateParticipantReputation(uint256 /* _marketId */, bool /* outcome */) internal pure {
        // Placeholder - reputation updates happen on claimWinnings instead
        // This prevents hitting gas limits when processing large markets
    }

    /**
     * @dev Claim winnings from a resolved market
     */
    function claimWinnings(uint256 _marketId) external nonReentrant {
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved");
        
        Position storage userPosition = positions[_marketId][msg.sender];
        require(!userPosition.claimed, "Already claimed");
        
        uint256 winningAmount = calculateWinnings(_marketId, msg.sender);
        require(winningAmount > 0, "No winnings to claim");
        
        userPosition.claimed = true;
        
        // Deduct platform fee
        uint256 fee = (winningAmount * PLATFORM_FEE) / 10000;
        uint256 payout = winningAmount - fee;
        
        // Determine if user won or lost
        bool won = false;
        uint256 userBet = 0;
        if (market.outcome) {
            userBet = userPosition.yesAmount;
            won = userBet > 0;
        } else {
            userBet = userPosition.noAmount;
            won = userBet > 0;
        }
        
        // Update reputation
        if (address(reputationContract) != address(0) && userBet > 0) {
            uint256 profit = won ? (payout > userBet ? payout - userBet : 0) : 0;
            reputationContract.settleBet(msg.sender, _marketId, won, profit);
        }
        
        (bool success, ) = msg.sender.call{value: payout}("");
        require(success, "Transfer failed");
        
        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    /**
     * @dev Calculate potential winnings for a user
     */
    function calculateWinnings(uint256 _marketId, address _user) 
        public 
        view 
        returns (uint256) 
    {
        Market storage market = markets[_marketId];
        if (!market.resolved) return 0;
        
        Position storage userPosition = positions[_marketId][_user];
        if (userPosition.claimed) return 0;
        
        uint256 userBet;
        uint256 totalWinningBets;
        uint256 totalLosingBets;
        
        if (market.outcome) {
            // YES won
            userBet = userPosition.yesAmount;
            totalWinningBets = market.totalYesAmount;
            totalLosingBets = market.totalNoAmount;
        } else {
            // NO won
            userBet = userPosition.noAmount;
            totalWinningBets = market.totalNoAmount;
            totalLosingBets = market.totalYesAmount;
        }
        
        if (userBet == 0 || totalWinningBets == 0) return 0;
        
        // Calculate proportional share of losing bets
        uint256 share = (userBet * totalLosingBets) / totalWinningBets;
        return userBet + share;
    }

    /**
     * @dev Get market odds (in percentage)
     */
    function getMarketOdds(uint256 _marketId) 
        external 
        view 
        returns (uint256 yesOdds, uint256 noOdds) 
    {
        Market storage market = markets[_marketId];
        uint256 total = market.totalYesAmount + market.totalNoAmount;
        
        if (total == 0) {
            return (5000, 5000); // 50/50 if no bets
        }
        
        yesOdds = (market.totalYesAmount * 10000) / total;
        noOdds = (market.totalNoAmount * 10000) / total;
    }

    /**
     * @dev Add or remove authorized oracle — Somnia: zero address check for safety
     */
    function setAuthorizedOracle(address _oracle, bool _authorized) 
        external 
        onlyOwner 
    {
        require(_oracle != address(0), "Invalid oracle address");
        authorizedOracles[_oracle] = _authorized;
    }

    /**
     * @dev Get all market IDs
     */
    function getAllMarkets() external view returns (uint256[] memory) {
        uint256[] memory marketIds = new uint256[](marketCount);
        for (uint256 i = 1; i <= marketCount; i++) {
            marketIds[i - 1] = i;
        }
        return marketIds;
    }

    /**
     * @dev Get user position in a market
     */
    function getUserPosition(uint256 _marketId, address _user) 
        external 
        view 
        returns (uint256 yesAmount, uint256 noAmount, bool claimed) 
    {
        Position storage pos = positions[_marketId][_user];
        return (pos.yesAmount, pos.noAmount, pos.claimed);
    }

    /**
     * @dev Withdraw platform fees (only owner) — Somnia STT
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Somnia helpers
     */
    function getChainId() external view returns (uint256) { return block.chainid; }

    receive() external payable {}
}
