// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MockERC20WithAuth — Somnia Shannon (50312) Mock tUSDC with EIP-3009
 * @dev Mock ERC20 with proper EIP-3009 transferWithAuthorization for DreamDEX Event Contracts testing
 * @notice Somnia DreamDEX collateral: tUSDC 0x70a86D88... (6d Shannon) / USDso 0x00000022... (18d Mainnet)
 * @notice Fixes prior simplified mock that skipped signature verification (critical — anyone could steal funds)
 * @notice Now chain-aware (EIP-712 DOMAIN_SEPARATOR with block.chainid like WSOMNIA3009.sol)
 * @notice Faucet cap: 10,000 tokens per call (mirrors DreamDEX CollateralRouter faucet cap → FaucetCapExceeded)
 */
contract MockERC20WithAuth is ERC20, ReentrancyGuard {
    uint8 private _decimals;

    // EIP-712 Domain — Somnia chain-aware (50312 Shannon / 5031 Mainnet), prevents BSC 56/97 replay
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");
    bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)");

    // EIP-3009 nonce tracking
    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    // Faucet cap — 10,000 tokens (scaled to decimals), matches DreamDEX faucet cap
    uint256 public constant FAUCET_CAP = 10_000 * 10 ** 6; // 10k * 10^6, adjusted in faucet() for 6/18d
    uint256 public constant FAUCET_CAP_BASE = 10_000;

    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event FaucetMint(address indexed to, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Faucet — mints to msg.sender, capped at 10,000 tokens (DreamDEX parity: FaucetCapExceeded)
     * @notice Collateral decimals differ Somnia testnet (6) vs mainnet (18) — use 10**decimals scaling
     */
    function faucet(uint256 amount) external nonReentrant {
        uint256 cap = FAUCET_CAP_BASE * (10 ** uint256(_decimals));
        if (amount == 0) amount = cap; // default 10k
        require(amount <= cap, "FaucetCapExceeded");
        _mint(msg.sender, amount);
        emit FaucetMint(msg.sender, amount);
    }

    function faucet() external {
        this.faucet(FAUCET_CAP_BASE * (10 ** uint256(_decimals)));
    }

    /**
     * @dev EIP-3009 transferWithAuthorization — now verifies EIP-712 signature (was missing, critical fix)
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(block.timestamp >= validAfter, "Authorization not yet valid");
        require(block.timestamp <= validBefore, "Authorization expired");
        require(!authorizationState[from][nonce], "Authorization already used");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                        from,
                        to,
                        value,
                        validAfter,
                        validBefore,
                        nonce
                    )
                )
            )
        );

        address signer = _recoverSigner(digest, signature);
        require(signer == from, "Invalid signature");

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @dev EIP-3009 receiveWithAuthorization — payee must be msg.sender (prevents front-running)
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        bytes memory signature
    ) external nonReentrant {
        require(to == msg.sender, "Caller must be payee");
        require(block.timestamp >= validAfter, "Authorization not yet valid");
        require(block.timestamp <= validBefore, "Authorization expired");
        require(!authorizationState[from][nonce], "Authorization already used");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(
                    abi.encode(
                        RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                        from,
                        to,
                        value,
                        validAfter,
                        validBefore,
                        nonce
                    )
                )
            )
        );

        address signer = _recoverSigner(digest, signature);
        require(signer == from, "Invalid signature");

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    function _recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "Invalid signature v value");
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "Invalid signature");
        return signer;
    }
}
