/**
 * x402 Facilitator Service
 * Handles payment verification and gas sponsorship
 * 
 * GASLESS GAS BETTING (User pays bet, Facilitator pays gas):
 * 1. User wraps STT → WSOMNIA3009 (one-time, user pays)
 * 2. User signs EIP-3009 authorization (free, off-chain)
 * 3. Facilitator calls gaslessBetWithSTT (facilitator pays GAS only)
 * 4. User's WSOMNIA3009 is transferred and used for bet
 * 
 * User pays: Bet amount (in WSOMNIA3009)
 * Facilitator pays: Gas fees only (~$0.03-0.10)
 */

import { Address, Hex, createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { somniaTestnet, somniaMainnet as somnia } from '@/lib/web3-config';
import { privateKeyToAccount } from 'viem/accounts';
import type { PaymentPayload, PaymentRequirements, SettlementResponse } from './x402Client';

// ABI for X402BettingSTT contract
const X402_BETTING_ABI = [
  {
    name: 'gaslessBetWithSTT',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'position', type: 'bool' },
      { name: 'from', type: 'address' },
      { name: 'wsomniaValue', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'usedNonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'facilitator',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// Track used nonces to prevent replay attacks (in production, use Redis/DB)
const usedNonces = new Set<string>();

export interface VerificationRequest {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

export interface VerificationResponse {
  isValid: boolean;
  payer: Address;
  invalidReason?: string;
}

/**
 * x402 Facilitator - GASLESS GAS BETTING
 * User pays bet amount (WSOMNIA3009), Facilitator pays gas only
 */
export class X402Facilitator {
  private publicClient;
  private walletClient;
  private facilitatorAccount;
  private x402BettingAddress: Address;
  private chainId: number;

  constructor(
    chainId: number = 50312, // Somnia Shannon Testnet
    facilitatorPrivateKey?: Hex,
    x402BettingAddress?: Address
  ) {
    this.chainId = chainId;
    const chain = chainId === 5031 ? somnia : somniaTestnet;

    // Setup public client
    this.publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Setup wallet client (facilitator)
    if (facilitatorPrivateKey) {
      this.facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey);
      this.walletClient = createWalletClient({
        account: this.facilitatorAccount,
        chain,
        transport: http(),
      });
      console.log('[X402] Facilitator wallet:', this.facilitatorAccount.address);
    }

    this.x402BettingAddress = x402BettingAddress || 
      process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS as Address;
  }

  /**
   * Verify WSOMNIA3009 transfer authorization
   * User signs EIP-3009 to authorize transfer of their WSOMNIA3009
   */
  async verifyPayment(request: VerificationRequest): Promise<VerificationResponse> {
    try {
      const { paymentPayload, paymentRequirements } = request;
      const { authorization, signature } = paymentPayload.payload;

      // Basic validation
      if (!authorization || !signature) {
        return {
          isValid: false,
          payer: authorization?.from || '0x0' as Address,
          invalidReason: 'missing_authorization_or_signature',
        };
      }

      // Check amount matches
      if (authorization.value !== paymentRequirements.amount) {
        return {
          isValid: false,
          payer: authorization.from,
          invalidReason: 'amount_mismatch',
        };
      }

      // Check nonce hasn't been used on-chain
      try {
        const nonceUsed = await this.publicClient.readContract({
          address: this.x402BettingAddress,
          abi: X402_BETTING_ABI,
          functionName: 'usedNonces',
          args: [authorization.nonce as Hex],
        });

        if (nonceUsed) {
          return {
            isValid: false,
            payer: authorization.from,
            invalidReason: 'nonce_already_used',
          };
        }
      } catch (e) {
        // If we can't check nonce on-chain, use local tracking
        if (usedNonces.has(authorization.nonce)) {
          return {
            isValid: false,
            payer: authorization.from,
            invalidReason: 'nonce_already_used',
          };
        }
      }

      // Check time validity
      const now = Math.floor(Date.now() / 1000);
      if (now < parseInt(authorization.validAfter || '0')) {
        return {
          isValid: false,
          payer: authorization.from,
          invalidReason: 'authorization_not_yet_valid',
        };
      }
      if (now > parseInt(authorization.validBefore)) {
        return {
          isValid: false,
          payer: authorization.from,
          invalidReason: 'authorization_expired',
        };
      }

      // Signature will be verified on-chain by WSOMNIA3009 contract
      return {
        isValid: true,
        payer: authorization.from,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        isValid: false,
        payer: request.paymentPayload.payload.authorization?.from || '0x0' as Address,
        invalidReason: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  }

  /**
   * Settle payment - Execute gasless bet
   * Facilitator pays GAS only, user's WSOMNIA3009 is transferred for the bet
   */
  async settlePayment(
    request: VerificationRequest,
    marketId: number,
    position: boolean
  ): Promise<SettlementResponse> {
    try {
      // First verify
      const verification = await this.verifyPayment(request);
      if (!verification.isValid) {
        return {
          success: false,
          payer: verification.payer,
          network: `eip155:${this.chainId}`,
          errorReason: verification.invalidReason,
        };
      }

      // Check facilitator wallet exists
      if (!this.walletClient || !this.facilitatorAccount) {
        return {
          success: false,
          payer: verification.payer,
          network: `eip155:${this.chainId}`,
          errorReason: 'facilitator_wallet_not_configured',
        };
      }

      const { authorization, signature } = request.paymentPayload.payload;

      // Mark nonce as used locally
      usedNonces.add(authorization.nonce);

      console.log('[X402] Executing gaslessBetWithSTT:', {
        marketId,
        position,
        from: authorization.from,
        value: authorization.value,
        validAfter: authorization.validAfter,
        validBefore: authorization.validBefore,
        nonce: authorization.nonce,
      });

      // Execute gasless transaction
      // Facilitator pays GAS, user's WSOMNIA3009 is used for the bet
      const hash = await this.walletClient.writeContract({
        address: this.x402BettingAddress,
        abi: X402_BETTING_ABI,
        functionName: 'gaslessBetWithSTT',
        args: [
          BigInt(marketId),
          position,
          authorization.from,
          BigInt(authorization.value),
          BigInt(authorization.validAfter || '0'),
          BigInt(authorization.validBefore),
          authorization.nonce as Hex,
          signature,
        ],
      });

      console.log('[X402] Transaction submitted:', hash);

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

      console.log('[X402] ✅ Gasless bet confirmed!', {
        txHash: hash,
        gasUsed: receipt.gasUsed.toString(),
        user: authorization.from,
        betAmount: formatEther(BigInt(authorization.value)),
      });

      return {
        success: true,
        payer: verification.payer,
        transaction: hash,
        network: `eip155:${this.chainId}`,
      };
    } catch (error) {
      console.error('Payment settlement error:', error);
      return {
        success: false,
        payer: request.paymentPayload.payload.authorization.from,
        network: `eip155:${this.chainId}`,
        errorReason: error instanceof Error ? error.message : 'settlement_failed',
      };
    }
  }

  /**
   * Get payment requirements for a bet
   * User needs WSOMNIA3009 balance and signs EIP-3009 authorization
   */
  getPaymentRequirements(
    marketId: number,
    amount: bigint,
    resourceUrl: string,
    position: boolean = true
  ): PaymentRequirements {
    // WSOMNIA3009 address for gasless betting
    const wsomniaAddress = process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS as Address || 
      '0x5C46B206aF8a2148DD8813Bd69a03634562aC300' as Address;
    
    return {
      scheme: 'exact',
      network: `eip155:${this.chainId}`,
      amount: amount.toString(),
      asset: wsomniaAddress, // WSOMNIA3009 - user needs this balance!
      payTo: this.x402BettingAddress,
      maxTimeoutSeconds: 300, // 5 minutes
      resource: resourceUrl,
      description: `Place ${position ? 'YES' : 'NO'} bet on market #${marketId}`,
      mimeType: 'application/json',
      extra: {
        name: 'Wrapped STT with x402',  // Must match WSOMNIA3009 contract's EIP-712 domain
        version: '1',
        isNative: false, // User pays with WSOMNIA3009
        wsomniaAddress: wsomniaAddress,
      },
    };
  }

  /**
   * Check if user can use gasless betting
   * User needs WSOMNIA3009 balance
   */
  async canUseGasless(_userAddress: Address): Promise<{
    canUse: boolean;
    reason?: string;
  }> {
    try {
      // In production, could check user's WSOMNIA3009 balance
      return {
        canUse: true,
      };
    } catch (_error) {
      return {
        canUse: false,
        reason: 'verification_failed',
      };
    }
  }
}

// Singleton instance for server-side use
let facilitatorInstance: X402Facilitator | null = null;

/**
 * Format a private key to proper Hex format
 * Accepts keys with or without 0x prefix, validates length
 */
function formatPrivateKey(key: string | undefined): Hex | undefined {
  if (!key) return undefined;
  
  // Remove whitespace
  let cleanKey = key.trim();
  
  // Add 0x prefix if missing
  if (!cleanKey.startsWith('0x')) {
    cleanKey = `0x${cleanKey}`;
  }
  
  // Validate length (should be 66 chars: 0x + 64 hex chars)
  if (cleanKey.length !== 66) {
    console.error(`Invalid private key length: expected 66, got ${cleanKey.length}`);
    return undefined;
  }
  
  // Validate hex characters
  if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
    console.error('Invalid private key format: must be hex characters');
    return undefined;
  }
  
  return cleanKey as Hex;
}

export function getFacilitator(chainId?: number): X402Facilitator {
  if (!facilitatorInstance) {
    // Try multiple env var names for flexibility
    const rawKey = process.env.FACILITATOR_PRIVATE_KEY || 
                   process.env.X402_FACILITATOR_PRIVATE_KEY ||
                   process.env.PRIVATE_KEY;
    
    console.log('[X402 Facilitator] Initializing...');
    console.log('[X402 Facilitator] Chain ID:', chainId || process.env.NEXT_PUBLIC_CHAIN_ID || '50312');
    console.log('[X402 Facilitator] X402BettingSTT:', process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS);
    console.log('[X402 Facilitator] Private key present:', !!rawKey, rawKey ? `(length: ${rawKey.length})` : '');
    
    const formattedKey = formatPrivateKey(rawKey);
    
    if (!formattedKey) {
      console.error('❌ X402 Facilitator: No valid private key found. Gasless betting will NOT work!');
      console.error('Set FACILITATOR_PRIVATE_KEY in Vercel environment variables with a valid private key (64 hex chars)');
    } else {
      console.log('✅ X402 Facilitator: Private key configured successfully');
    }
    
    facilitatorInstance = new X402Facilitator(
      chainId || parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312'),
      formattedKey,
      process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS as Address // X402BettingSTT contract
    );
  }
  return facilitatorInstance;
}
