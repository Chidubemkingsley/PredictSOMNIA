// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PredictionMarket.sol";

/**
 * @title X402Betting — Somnia Shannon (50312) ERC20 variant (legacy generic, prefer WSOMNIA3009/X402BettingSOMNIA for native STT)
 * @dev Implements x402 protocol for gasless betting via EIP-3009 transferWithAuthorization on Somnia
 * @notice Enables truly gasless betting - users sign payment authorization, facilitator executes and sponsors STT gas
 * @notice Somnia-native: tokenToSttRate (1:1), STT gas sponsorship for PredictionMarket; DreamDEX tUSDC 0x70a86D... is separate ERC20 collateral
 * @notice This ERC20 flow converts tUSDC/ERC20 → STT for PredictionMarket; for DreamDEX Event Contracts use BinaryPool directly
 */
interface IERC20TransferWithAuth is IERC20 {
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external;
}

contract X402Betting is ReentrancyGuard, Ownable {
    PredictionMarket public predictionMarket;
    IERC20TransferWithAuth public bettingToken;
    
    // x402 payment tracking
    mapping(bytes32 => bool) public usedNonces;
    mapping(address => uint256) public gasAllowances; // Sponsored gas per user
    
    // Facilitator settings
    uint256 public facilitatorFee = 50; // 0.5% fee for gas sponsorship
    address public facilitator;
    
    // Token to STT conversion (Somnia native STT, 18d; token decimals depend on tUSDC 6d vs ERC20 18d)
    uint256 public tokenToSttRate = 1e18; // 1 token = 1 STT (1:1 rate for testing, DreamDEX tUSDC 6d)
    
    event GaslessPositionTaken(
        uint256 indexed marketId,
        address indexed user,
        bool position,
        uint256 amount,
        bytes32 nonce
    );
    
    event GasSponsored(
        address indexed user,
        uint256 amount,
        uint256 newAllowance
    );
    
    constructor(
        address _predictionMarket,
        address _bettingToken
    ) Ownable(msg.sender) {
        predictionMarket = PredictionMarket(payable(_predictionMarket));
        bettingToken = IERC20TransferWithAuth(_bettingToken);
        facilitator = msg.sender;
    }
    
    /**
     * @dev Place bet using x402 protocol (EIP-3009 transferWithAuthorization)
     * @notice Gasless betting - user signs authorization, facilitator executes
     */
    function buyPositionWithAuthorization(
        uint256 marketId,
        bool position,
        address from,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        // Verify caller is facilitator (gas sponsor)
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator can execute");
        
        // Check nonce not used (replay protection)
        require(!usedNonces[nonce], "Authorization already used");
        usedNonces[nonce] = true;
        
        // Check time validity
        require(block.timestamp >= validAfter, "Authorization not yet valid");
        require(block.timestamp <= validBefore, "Authorization expired");
        
        // Calculate amounts
        uint256 feeAmount = (value * facilitatorFee) / 10000;
        uint256 betTokenAmount = value - feeAmount;
        
        // Execute EIP-3009 transfer from user to this contract
        bettingToken.transferWithAuthorization(
            from,
            address(this),
            value,
            validAfter,
            validBefore,
            nonce,
            signature
        );
        
        // Convert token amount to STT equivalent for PredictionMarket (Somnia Shannon STT)
        // Note: Uses tokenToSttRate conversion (1:1 for simplicity on Somnia testnet; DreamDEX uses tUSDC 6d)
        uint256 betSttAmount = (betTokenAmount * tokenToSttRate) / 1e18;
        
        // Ensure contract has enough STT to cover the bet (Somnia STT gas + stake)
        // Facilitator must keep this contract funded with STT on Shannon (50312)
        require(address(this).balance >= betSttAmount, "Insufficient STT balance");
        
        // Place bet in PredictionMarket using STT (PredictionMarket.buyPosition is payable STT)
        predictionMarket.buyPositionForUser{value: betSttAmount}(marketId, position, from);
        
        // Track gas sponsorship
        uint256 gasUsed = tx.gasprice * gasleft();
        gasAllowances[from] += gasUsed;
        
        emit GaslessPositionTaken(marketId, from, position, betSttAmount, nonce);
        emit GasSponsored(from, gasUsed, gasAllowances[from]);
    }
    
    /**
     * @dev Verify payment authorization (for x402 /verify endpoint)
     * @notice Off-chain verification before settlement
     */
    function verifyAuthorization(
        address from,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory /* signature */
    ) external view returns (bool valid, string memory reason) {
        // Check nonce
        if (usedNonces[nonce]) {
            return (false, "nonce_already_used");
        }
        
        // Check time window
        if (block.timestamp < validAfter) {
            return (false, "authorization_not_yet_valid");
        }
        if (block.timestamp > validBefore) {
            return (false, "authorization_expired");
        }
        
        // Check balance
        if (bettingToken.balanceOf(from) < value) {
            return (false, "insufficient_balance");
        }
        
        // All checks passed
        return (true, "");
    }
    
    /**
     * @dev Set facilitator address (gas sponsor)
     */
    function setFacilitator(address _facilitator) external onlyOwner {
        facilitator = _facilitator;
    }
    
    /**
     * @dev Set facilitator fee (basis points)
     */
    function setFacilitatorFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high"); // Max 5%
        facilitatorFee = _fee;
    }
    
    /**
     * @dev Set token to STT conversion rate — Somnia Shannon STT
     * @param _rate Rate in wei (1e18 = 1:1 ratio)
     */
    function setTokenToSttRate(uint256 _rate) external onlyOwner {
        require(_rate > 0, "Rate must be positive");
        tokenToSttRate = _rate;
    }
    
    /**
     * @dev Set betting token contract
     */
    function setBettingToken(address _token) external onlyOwner {
        bettingToken = IERC20TransferWithAuth(_token);
    }
    
    /**
     * @dev Withdraw collected token fees
     */
    function withdrawTokenFees() external onlyOwner {
        uint256 tokenBalance = bettingToken.balanceOf(address(this));
        require(tokenBalance > 0, "No token fees to withdraw");
        require(bettingToken.transfer(owner(), tokenBalance), "Transfer failed");
    }
    
    /**
     * @dev Withdraw STT (Somnia Shannon) — facilitator gas pool
     */
    function withdrawStt() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No STT to withdraw");
        (bool s, ) = payable(owner()).call{value: balance}("");
        require(s, "STT withdraw failed");
    }
    
    /**
     * @dev Claim winnings gaslessly (EIP-712 signature)
     * @notice User signs claim authorization, facilitator executes and pays gas
     */
    function claimWinningsWithAuthorization(
        uint256 marketId,
        address from,
        uint256 deadline,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        require(!usedNonces[nonce], "Nonce already used");
        require(block.timestamp <= deadline, "Authorization expired");
        
        usedNonces[nonce] = true;
        
        // Verify EIP-712 signature
        bytes32 messageHash = keccak256(abi.encode(
            keccak256("ClaimWinnings(uint256 marketId,address from,uint256 deadline,bytes32 nonce)"),
            marketId,
            from,
            deadline,
            nonce
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);
        require(signer == from, "Invalid signature");
        
        // Execute claim (msg.sender is facilitator, but claim is for 'from' address)
        // Note: PredictionMarket needs to be modified to accept claimFor(user)
        // For now, we'll send STT back to user after claiming
        uint256 balanceBefore = address(this).balance;
        
        // Since we can't directly claim for user, user must call this themselves
        // This is a limitation - we'll add claimFor() to PredictionMarket in next deployment
        // For now, deduct facilitator fee from winnings and forward
        
        uint256 winnings = predictionMarket.calculateWinnings(marketId, from);
        require(winnings > 0, "No winnings to claim");
        
        uint256 feeAmount = (winnings * facilitatorFee) / 10000;
        uint256 payout = winnings - feeAmount;
        
        // Track gas sponsorship
        uint256 gasUsed = tx.gasprice * gasleft();
        gasAllowances[from] += gasUsed;
        
        emit GasSponsored(from, gasUsed, gasAllowances[from]);
        
        // Note: Actual claim needs PredictionMarket.claimFor() function
        // This is a placeholder for the pattern
    }
    
    /**
     * @dev Follow trader gaslessly (EIP-712 signature)
     */
    function followTraderWithAuthorization(
        address trader,
        uint256 maxAmountPerTrade,
        uint256 copyPercentage,
        address from,
        uint256 deadline,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        require(!usedNonces[nonce], "Nonce already used");
        require(block.timestamp <= deadline, "Authorization expired");
        
        usedNonces[nonce] = true;
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(
            keccak256("FollowTrader(address trader,uint256 maxAmountPerTrade,uint256 copyPercentage,address from,uint256 deadline,bytes32 nonce)"),
            trader,
            maxAmountPerTrade,
            copyPercentage,
            from,
            deadline,
            nonce
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);
        require(signer == from, "Invalid signature");
        
        // Track gas sponsorship
        uint256 gasUsed = tx.gasprice * gasleft();
        gasAllowances[from] += gasUsed;
        
        emit GasSponsored(from, gasUsed, gasAllowances[from]);
        
        // Note: Needs TraderReputation.followFor() function
    }
    
    /**
     * @dev Unfollow trader gaslessly
     */
    function unfollowTraderWithAuthorization(
        address trader,
        address from,
        uint256 deadline,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        require(!usedNonces[nonce], "Nonce already used");
        require(block.timestamp <= deadline, "Authorization expired");
        
        usedNonces[nonce] = true;
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(
            keccak256("UnfollowTrader(address trader,address from,uint256 deadline,bytes32 nonce)"),
            trader,
            from,
            deadline,
            nonce
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);
        require(signer == from, "Invalid signature");
        
        // Track gas sponsorship
        uint256 gasUsed = tx.gasprice * gasleft();
        gasAllowances[from] += gasUsed;
        
        emit GasSponsored(from, gasUsed, gasAllowances[from]);
        
        // Note: Needs TraderReputation.unfollowFor() function
    }
    
    /**
     * @dev Create market gaslessly (EIP-712 signature)
     */
    function createMarketWithAuthorization(
        string memory question,
        string memory description,
        string memory category,
        uint256 endTime,
        bool aiOracleEnabled,
        address from,
        uint256 deadline,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(msg.sender == facilitator || msg.sender == owner(), "Only facilitator");
        require(!usedNonces[nonce], "Nonce already used");
        require(block.timestamp <= deadline, "Authorization expired");
        
        usedNonces[nonce] = true;
        
        // Verify signature
        bytes32 messageHash = keccak256(abi.encode(
            keccak256("CreateMarket(string question,string description,string category,uint256 endTime,bool aiOracleEnabled,address from,uint256 deadline,bytes32 nonce)"),
            keccak256(bytes(question)),
            keccak256(bytes(description)),
            keccak256(bytes(category)),
            endTime,
            aiOracleEnabled,
            from,
            deadline,
            nonce
        ));
        
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        address signer = recoverSigner(ethSignedHash, signature);
        require(signer == from, "Invalid signature");
        
        // Track gas sponsorship
        uint256 gasUsed = tx.gasprice * gasleft();
        gasAllowances[from] += gasUsed;
        
        emit GasSponsored(from, gasUsed, gasAllowances[from]);
        
        // Note: Needs PredictionMarket.createMarketFor() function
    }
    
    /**
     * @dev Recover signer from signature
     */
    function recoverSigner(bytes32 ethSignedHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature 'v' value");
        
        return ecrecover(ethSignedHash, v, r, s);
    }
    
    /**
     * @dev Receive STT to fund gasless operations — Somnia Shannon (50312)
     * @notice Facilitator funds this contract with STT for bet execution; tUSDC collateral is ERC20 separate
     */
    receive() external payable {}
    function getChainId() external view returns (uint256) { return block.chainid; }
}
