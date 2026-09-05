/**
 * x402 Protocol Client
 * Implements HTTP 402 "Payment Required" protocol for gasless betting
 * Based on: https://github.com/coinbase/x402
 * 
 * GASLESS GAS: User pays bet amount (WSOMNIA3009), facilitator pays gas only.
 * User signs EIP-3009 authorization to transfer their WSOMNIA3009.
 */

import { Address, Hex, keccak256, encodePacked } from 'viem';

export interface PaymentRequirements {
  scheme: 'exact';
  network: string; // e.g., "eip155:5031" for Somnia mainnet
  amount: string; // atomic units
  asset: Address; // WSOMNIA3009 contract address
  payTo: Address; // recipient (X402BettingSTT contract)
  maxTimeoutSeconds: number;
  resource: string; // URL path
  description: string;
  mimeType: string;
  extra?: {
    name: string; // 'WSOMNIA3009'
    version: string; // '1'
    isNative?: boolean; 
    wsomniaAddress?: string; // WSOMNIA3009 contract for signature domain
  };
}

export interface PaymentRequiredResponse {
  x402Version: number;
  error: string;
  resource: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepts: PaymentRequirements[];
}

export interface PaymentPayload {
  x402Version: number;
  resource?: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepted: PaymentRequirements;
  payload: {
    signature: Hex;
    authorization: {
      from: Address;
      to: Address;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: Hex;
    };
  };
}

export interface SettlementResponse {
  success: boolean;
  payer: Address;
  transaction?: Hex;
  network: string;
  errorReason?: string;
}

/**
 * x402 HTTP Client for PredictSOMNIA gasless betting
 */
export class X402Client {
  private baseUrl: string;
  private facilitatorUrl: string;

  constructor(
    baseUrl: string = typeof window !== 'undefined' ? window.location.origin : '',
    facilitatorUrl: string = '/api/x402'
  ) {
    this.baseUrl = baseUrl;
    this.facilitatorUrl = facilitatorUrl;
  }

  /**
   * Create EIP-3009 authorization signature for WSOMNIA3009 transfer
   * User signs to authorize transfer of their WSOMNIA3009
   * @param params Authorization parameters
   * @param signTypedData Wallet signing function
   */
  async createPaymentAuthorization(
    params: {
      from: Address;
      to: Address;
      value: bigint;
      validAfter: number;
      validBefore: number;
      nonce: Hex;
      tokenAddress: Address;
      tokenName: string;
      tokenVersion: string;
      chainId: number;
      isNative?: boolean;
      wsomniaAddress?: Address;
    },
    signTypedData: (args: any) => Promise<Hex>
  ): Promise<PaymentPayload['payload']> {
    // Validate required address params
    if (!params.from || !params.to) {
      throw new Error('Missing required address params: from or to');
    }
    
    // Get WSOMNIA3009 address for signature domain
    const wsomniaAddress = params.wsomniaAddress || 
      (typeof window !== 'undefined' ? 
        (process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS as Address) : 
        '0x5C46B206aF8a2148DD8813Bd69a03634562aC300' as Address);
    
    // EIP-3009 TransferWithAuthorization for WSOMNIA3009
    const domain = {
      name: 'Wrapped STT with x402',  // Must match WSOMNIA3009 contract's EIP-712 domain name
      version: '1',
      chainId: params.chainId,
      verifyingContract: wsomniaAddress,
    };

    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    // Transfer WSOMNIA3009 from user to X402BettingSTT contract
    const message = {
      from: params.from,
      to: params.to,  // X402BettingSTT contract
      value: params.value.toString(),
      validAfter: params.validAfter.toString(),
      validBefore: params.validBefore.toString(),
      nonce: params.nonce,
    };

    console.log('[X402] Signing WSOMNIA3009 transfer authorization:', {
      domain,
      message,
    });

    const signature = await signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    });

    return {
      signature,
      authorization: {
        from: params.from,
        to: params.to,
        value: params.value.toString(),
        validAfter: params.validAfter.toString(),
        validBefore: params.validBefore.toString(),
        nonce: params.nonce,
      },
    };
  }

  /**
   * Create full x402 payment payload
   */
  async createPaymentPayload(
    paymentRequired: PaymentRequiredResponse,
    selectedIndex: number,
    authorizationPayload: PaymentPayload['payload']
  ): Promise<PaymentPayload> {
    const selectedRequirement = paymentRequired.accepts[selectedIndex];

    return {
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted: selectedRequirement,
      payload: authorizationPayload,
    };
  }

  /**
   * Encode payment payload as base64 header
   */
  encodePaymentHeader(payload: PaymentPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  /**
   * Decode payment required header
   */
  decodePaymentRequired(header: string): PaymentRequiredResponse {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  }

  /**
   * Decode settlement response header
   */
  decodeSettlementResponse(header: string): SettlementResponse {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  }

  /**
   * Request betting with x402 protocol
   * Handles 402 Payment Required → Sign → Retry flow
   */
  async betWithX402(
    marketId: number,
    position: boolean,
    amount: bigint,
    walletAddress: Address,
    signTypedData: (args: any) => Promise<Hex>,
    chainId: number
  ): Promise<{
    success: boolean;
    transaction?: Hex;
    error?: string;
  }> {
    try {
      // Step 1: Initial request (expect 402)
      const initialResponse = await fetch(`${this.baseUrl}/api/markets/${marketId}/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position,
          amount: amount.toString(),
          address: walletAddress,
        }),
      });

      // Step 2: Handle 402 Payment Required
      if (initialResponse.status !== 402) {
        return {
          success: false,
          error: `Unexpected status: ${initialResponse.status}`,
        };
      }

      const paymentRequiredHeader = initialResponse.headers.get('PAYMENT-REQUIRED');
      if (!paymentRequiredHeader) {
        return {
          success: false,
          error: 'Missing PAYMENT-REQUIRED header',
        };
      }

      const paymentRequired = this.decodePaymentRequired(paymentRequiredHeader);

      // Step 3: Select payment method (first available)
      const selectedPayment = paymentRequired.accepts[0];
      
      // Validate selectedPayment has required fields
      if (!selectedPayment || !selectedPayment.payTo || !selectedPayment.amount) {
        console.error('Invalid payment requirements:', selectedPayment);
        return {
          success: false,
          error: 'Invalid payment requirements from server',
        };
      }
      // Step 4: Create payment authorization
      const now = Math.floor(Date.now() / 1000);
      const nonce = keccak256(
        encodePacked(
          ['address', 'uint256', 'uint256'],
          [walletAddress, BigInt(marketId), BigInt(now)]
        )
      );

      // Get WSOMNIA address from payment requirements
      const wsomniaAddress = (selectedPayment.extra?.wsomniaAddress || selectedPayment.asset) as Address;

      const authPayload = await this.createPaymentAuthorization(
        {
          from: walletAddress,
          to: selectedPayment.payTo, // X402BettingSTT contract
          value: BigInt(selectedPayment.amount),
          validAfter: now,
          validBefore: now + selectedPayment.maxTimeoutSeconds,
          nonce,
          tokenAddress: selectedPayment.asset,
          tokenName: selectedPayment.extra?.name || 'Wrapped STT with x402',
          tokenVersion: selectedPayment.extra?.version || '1',
          chainId,
          isNative: selectedPayment.extra?.isNative || false,
          wsomniaAddress: wsomniaAddress,
        },
        signTypedData
      );

      // Step 5: Create full payment payload
      const paymentPayload = await this.createPaymentPayload(
        paymentRequired,
        0,
        authPayload
      );

      // Step 6: Retry with payment signature
      console.log('[X402 Client] Sending payment with signature...');
      const paymentResponse = await fetch(`${this.baseUrl}/api/markets/${marketId}/bet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-SIGNATURE': this.encodePaymentHeader(paymentPayload),
        },
        body: JSON.stringify({
          position,
          amount: amount.toString(),
          address: walletAddress,
        }),
      });

      console.log('[X402 Client] Payment response status:', paymentResponse.status);

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        console.error('[X402 Client] Payment failed:', errorData);
        
        // Extract user-friendly error message from contract revert reason
        let errorMessage = errorData.error || errorData.details || 'Payment failed';
        
        // Parse common revert reasons for better UX
        if (errorMessage.includes('Market has ended')) {
          errorMessage = 'This market has ended and is no longer accepting bets';
        } else if (errorMessage.includes('Market already resolved')) {
          errorMessage = 'This market has already been resolved';
        } else if (errorMessage.includes('Bet amount too low')) {
          errorMessage = 'Bet amount is too low. Minimum is 0.0101 STT for gasless bets';
        } else if (errorMessage.includes('Insufficient balance')) {
          errorMessage = 'Insufficient WSOMNIA3009 balance. Please wrap more STT first';
        } else if (errorMessage.includes('Invalid signature')) {
          errorMessage = 'Signature verification failed. Please try again';
        } else if (errorMessage.includes('reverted with the following reason:')) {
          // Extract the reason from viem error
          const match = errorMessage.match(/reverted with the following reason:\s*\n?\s*(.+?)(\n|Contract Call:|$)/);
          if (match) {
            errorMessage = match[1].trim();
          }
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Step 7: Parse settlement response
      const settlementHeader = paymentResponse.headers.get('PAYMENT-RESPONSE');
      if (settlementHeader) {
        const settlement = this.decodeSettlementResponse(settlementHeader);
        if (settlement.success) {
          return {
            success: true,
            transaction: settlement.transaction,
          };
        } else {
          return {
            success: false,
            error: settlement.errorReason || 'Settlement failed',
          };
        }
      }

      // Success without explicit settlement response
      const responseData = await paymentResponse.json();
      return {
        success: true,
        transaction: responseData.transactionHash,
      };
    } catch (error) {
      console.error('x402 payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate random nonce for payment authorization
   */
  generateNonce(userAddress: Address, marketId: number): Hex {
    const timestamp = Date.now();
    return keccak256(
      encodePacked(
        ['address', 'uint256', 'uint256'],
        [userAddress, BigInt(marketId), BigInt(timestamp)]
      )
    );
  }
}

export const x402Client = new X402Client();
