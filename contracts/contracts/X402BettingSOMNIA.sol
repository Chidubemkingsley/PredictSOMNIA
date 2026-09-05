// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./PredictionMarket.sol";
import "./WSOMNIA3009.sol";

/**
 * @title X402BettingSOMNIA
 * @dev x402 protocol for 100% GASLESS SOMNIA betting on Somnia Shannon (50312) / Mainnet (5031)
 * @notice Users only need SOMNIA, NO separate tUSDC needed for gas sponsorship!
 * @notice Somnia-native — adapted for DreamDEX Event Contracts collateral (tUSDC 0x70a86D88... on Shannon, USDso 0x00000022... on mainnet)
 * 
 * REVOLUTIONARY APPROACH:
 * 1. User wraps SOMNIA → WSOMNIA3009 (one-time, pays gas once on Somnia)
 * 2. User signs WSOMNIA3009 authorization (EIP-3009, off-chain, FREE)
 * 3. Facilitator executes (pays STT gas on Somnia Shannon)
 * 4. WSOMNIA3009 auto-unwraps to SOMNIA
 * 5. SOMNIA used for betting (or converted to tUSDC collateral for DreamDEX BinaryPool)
 * 
 * RESULT: After initial wrap, ALL bets are 100% GASLESS on Somnia!
 */
contract X402BettingSOMNIA is ReentrancyGuard, Ownable {
    
    PredictionMarket public predictionMarket;
    WSOMNIA3009 public wsomnia;
    
    // x402 payment tracking
    mapping(bytes32 => bool) public usedNonces;
    mapping(address => uint256) public gasCredits; // Sponsored STT gas tracking
    
    // Facilitator settings
    uint256 public facilitatorFee = 50; // 0.5% (50 basis points)
    address public facilitator;
    
    event GaslessBetPlaced(
        uint256 indexed marketId,
        address indexed user,
        bool position,
        uint256 somniaAmount,
        bytes32 nonce
    );
    
    event GasSponsored(
        address indexed user,
        uint256 gasUsed
    );
    
    event WSOMNIAWrapped(
        address indexed user,
        uint256 amount
    );
    
    constructor(
        address _predictionMarket,
        address _wsomnia
    ) Ownable(msg.sender) {
        predictionMarket = PredictionMarket(payable(_predictionMarket));
        wsomnia = WSOMNIA3009(payable(_wsomnia));
        facilitator = msg.sender;
    }
    
    /**
     * @dev Helper: Wrap SOMNIA to WSOMNIA3009
     * @notice Users can call this directly on WSOMNIA contract or use this helper
     */
    function wrapSOMNIA() external payable {
        wsomnia.deposit{value: msg.value}();
        require(wsomnia.transfer(msg.sender, msg.value), "Transfer failed");
        emit WSOMNIAWrapped(msg.sender, msg.value);
    }
    
    /**
     * @dev GASLESS BETTING with pure SOMNIA!
     * @notice User signs WSOMNIA3009 authorization, facilitator executes on Somnia Shannon (50312)
     * 
     * Flow:
     * 1. User has WSOMNIA3009 balance
     * 2. User signs EIP-3009 authorization (off-chain, no gas)
     * 3. Facilitator calls this function (pays STT gas on 50312)
     * 4. WSOMNIA3009 transferred to contract
     * 5. WSOMNIA3009 unwrapped to SOMNIA
     * 6. SOMNIA sent to PredictionMarket for bet (or swapped to tUSDC for DreamDEX BinaryPool)
     * 7. User paid ZERO gas!
     */
    function gaslessBetWithSOMNIA(
        uint256 marketId,
        bool position,
        address from,
        uint256 wsomniaValue,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        // Only facilitator can execute (gas sponsor)
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        
        // Check nonce not used
        require(!usedNonces[nonce], "Nonce already used");
        usedNonces[nonce] = true;
        
        uint256 gasStart = gasleft();
        
        // Calculate amounts
        uint256 feeAmount = (wsomniaValue * facilitatorFee) / 10000;
        uint256 betAmount = wsomniaValue - feeAmount;
        
        // Execute EIP-3009 transfer (WSOMNIA3009 from user to contract)
        wsomnia.transferWithAuthorization(
            from,
            address(this),
            wsomniaValue,
            validAfter,
            validBefore,
            nonce,
            signature
        );
        
        // Unwrap WSOMNIA3009 → SOMNIA (STT)
        wsomnia.withdraw(betAmount);
        
        // Place bet with native SOMNIA (STT)
        predictionMarket.buyPositionForUser{value: betAmount}(
            marketId,
            position,
            from
        );
        
        // Track STT gas used (for analytics)
        uint256 gasUsed = (gasStart - gasleft()) * tx.gasprice;
        gasCredits[from] += gasUsed;
        
        emit GaslessBetPlaced(marketId, from, position, betAmount, nonce);
        emit GasSponsored(from, gasUsed);
    }
    
    /**
     * @dev Batch gasless bets (multiple bets in one tx) — Somnia Shannon optimized (100ms blocks)
     * @notice Even more efficient - spread STT gas cost across multiple SOMNIA bets!
     */
    function batchGaslessBets(
        uint256[] calldata marketIds,
        bool[] calldata positions,
        address[] calldata froms,
        uint256[] calldata wsomniaValues,
        uint256[] calldata validAfters,
        uint256[] calldata validBefores,
        bytes32[] calldata nonces,
        bytes[] calldata signatures
    ) external nonReentrant {
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        require(
            marketIds.length == positions.length &&
            positions.length == froms.length &&
            froms.length == wsomniaValues.length &&
            wsomniaValues.length == nonces.length &&
            nonces.length == signatures.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < marketIds.length; i++) {
            // Check nonce
            require(!usedNonces[nonces[i]], "Nonce already used");
            usedNonces[nonces[i]] = true;
            
            uint256 feeAmount = (wsomniaValues[i] * facilitatorFee) / 10000;
            uint256 betAmount = wsomniaValues[i] - feeAmount;
            
            // Transfer WSOMNIA3009
            wsomnia.transferWithAuthorization(
                froms[i],
                address(this),
                wsomniaValues[i],
                validAfters[i],
                validBefores[i],
                nonces[i],
                signatures[i]
            );
            
            // Unwrap and bet with STT
            wsomnia.withdraw(betAmount);
            predictionMarket.buyPositionForUser{value: betAmount}(
                marketIds[i],
                positions[i],
                froms[i]
            );
            
            emit GaslessBetPlaced(marketIds[i], froms[i], positions[i], betAmount, nonces[i]);
        }
    }
    
    /**
     * @dev GASLESS CLAIM with EIP-712 signature — Somnia Shannon STT
     * @notice User signs claim authorization, facilitator executes — user receives SOMNIA (STT), pays ZERO gas
     * @notice Note: Requires PredictionMarket.claimWinningsFor(user) extension; current PredictionMarket.claimWinnings uses msg.sender.
     * @notice For DreamDEX Event Contracts, use BinaryMarketsModule redeem via trader.redeem{...} — see dreamdex docs.
     */
    function gaslessClaim(
        uint256 marketId,
        address user,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        require(!usedNonces[nonce], "Nonce already used");
        
        // TODO: Verify EIP-712 claim signature against WSOMNIA3009 DOMAIN_SEPARATOR before production
        // bytes32 digest = keccak256(abi.encodePacked("\x19\x01", wsomnia.DOMAIN_SEPARATOR(), keccak256(abi.encode(CLAIM_TYPEHASH,...))));
        // require(_recoverSigner(digest, signature)==user, "Invalid claim signature");
        signature; // silence unused warning until verified
        
        usedNonces[nonce] = true;
        
        // Placeholder — requires PredictionMarket.claimWinningsFor(user)
        uint256 balanceBefore = address(this).balance;
        predictionMarket.claimWinnings(marketId); // TODO: claim for `user`, currently claims for helper
        uint256 winnings = address(this).balance - balanceBefore;
        
        // Transfer winnings to user in STT
        if (winnings > 0) {
            (bool success, ) = user.call{value: winnings}("");
            require(success, "STT transfer failed");
        }
    }
    
    /**
     * @dev Set facilitator address (STT gas sponsor on Somnia Shannon)
     */
    function setFacilitator(address _facilitator) external onlyOwner {
        facilitator = _facilitator;
    }
    
    /**
     * @dev Set facilitator fee (in basis points, e.g. 50 = 0.5%)
     */
    function setFacilitatorFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high"); // Max 5%
        facilitatorFee = _fee;
    }
    
    /**
     * @dev Emergency withdraw SOMNIA (STT) — Shannon (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Receive SOMNIA (STT) from WSOMNIA unwrapping on Somnia Shannon
     */
    receive() external payable {}

    function getChainId() external view returns (uint256) { return block.chainid; }
}
