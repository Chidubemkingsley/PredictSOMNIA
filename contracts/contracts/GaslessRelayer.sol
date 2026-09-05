// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GaslessRelayer
 * @dev Meta-transaction relayer for gasless UX on Somnia Shannon (50312) / Mainnet (5031)
 * @notice Somnia-adapted: EIP-712 chain-aware signatures, STT gas sponsorship for DreamDEX Event Contracts
 * @notice Fixes BNB-only replay bug (missing chainId) — see WSOMNIA3009.sol DOMAIN_SEPARATOR pattern
 * @notice For DreamDEX Event Contracts, collateral (tUSDC 0x70a86D... testnet / USDso mainnet) is separate from gas
 */
contract GaslessRelayer is Ownable, ReentrancyGuard {
    struct MetaTransaction {
        address from;
        address to;
        uint256 value;
        bytes data;
        uint256 nonce;
        uint256 deadline;
    }

    // EIP-712 domain for Somnia — prevents cross-chain replay (BSC 56/97 -> Somnia 50312/5031)
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant META_TRANSACTION_TYPEHASH =
        keccak256("MetaTransaction(address from,address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    mapping(address => uint256) public nonces;
    mapping(address => bool) public whitelistedContracts;
    mapping(address => uint256) public userGasCredits;
    
    uint256 public constant GAS_CREDIT_PER_USER = 100; // 100 free tx for Somnia 15m windows (was 10 on BNB)
    
    event MetaTransactionExecuted(
        address indexed user,
        address indexed target,
        bool success
    );
    
    event GasCreditsAdded(address indexed user, uint256 credits);

    constructor() Ownable(msg.sender) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GaslessRelayer SOMNIA")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @dev Execute a meta-transaction (gasless for user) — Somnia EIP-712 chain-aware
     * @notice Fixes: encodePacked collision on dynamic `bytes data`, missing chainId, eth_sign vs EIP-712
     */
    function executeMetaTransaction(
        address _from,
        address _to,
        uint256 _value,
        bytes memory _data,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external nonReentrant returns (bool) {
        require(block.timestamp <= _deadline, "Transaction expired");
        require(whitelistedContracts[_to], "Contract not whitelisted");
        require(
            userGasCredits[_from] > 0,
            "No gas credits remaining"
        );
        require(_to.code.length > 0, "Target not a contract");

        // EIP-712 struct hash — encode dynamic bytes as keccak256 hash, chainId+verifyingContract in DOMAIN_SEPARATOR
        bytes32 structHash = keccak256(
            abi.encode(
                META_TRANSACTION_TYPEHASH,
                _from,
                _to,
                _value,
                keccak256(_data),
                nonces[_from],
                _deadline
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
        
        address signer = ecrecover(digest, _v, _r, _s);
        require(signer == _from, "Invalid signature");
        require(signer != address(0), "Invalid signer");
        
        // Increment nonce
        nonces[_from]++;
        
        // Deduct gas credit
        userGasCredits[_from]--;
        
        // Execute transaction on Somnia Shannon (STT native, 100ms blocks)
        (bool success, ) = _to.call{value: _value}(_data);
        
        emit MetaTransactionExecuted(_from, _to, success);
        return success;
    }

    /**
     * @dev Add gas credits for a user (sponsor can pay)
     */
    function addGasCredits(address _user, uint256 _credits) 
        external 
        onlyOwner 
    {
        userGasCredits[_user] += _credits;
        emit GasCreditsAdded(_user, _credits);
    }

    /**
     * @dev Whitelist a contract for gasless interactions
     */
    function setWhitelistedContract(address _contract, bool _whitelisted) 
        external 
        onlyOwner 
    {
        whitelistedContracts[_contract] = _whitelisted;
    }

    /**
     * @dev Initialize new users with free gas credits
     */
    function initializeUser(address _user) external {
        if (userGasCredits[_user] == 0) {
            userGasCredits[_user] = GAS_CREDIT_PER_USER;
            emit GasCreditsAdded(_user, GAS_CREDIT_PER_USER);
        }
    }

    /**
     * @dev Fund the relayer (for STT gas costs on Somnia Shannon/Mainnet)
     * @notice Sponsors STT gas only; DreamDEX collateral tUSDC 0x70a86D... is handled via CollateralRouter / faucet
     */
    receive() external payable {}

    /**
     * @dev Withdraw STT funds (only owner)
     */
    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        (bool success, ) = owner().call{value: _amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Legacy eth_sign verify (BNB compat) — executes via EIP-712 now; keep for migration reads
     */
    function getChainId() external view returns (uint256) { return block.chainid; }
    function getDomainSeparator() external view returns (bytes32) { return DOMAIN_SEPARATOR; }
}
