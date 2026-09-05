/**
 * x402 Gasless Betting Relay Endpoint
 * Facilitator executes bet transaction on behalf of user (pays gas)
 * User signs EIP-3009 authorization, facilitator relays to X402Betting contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import { somniaMainnet as somnia } from '@/lib/web3-config';

// X402Betting contract ABI (minimal for relay)
const X402_BETTING_ABI = [
  {
    name: 'buyPositionWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'position', type: 'bool' },
      { name: 'from', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, position, from, value, validAfter, validBefore, nonce, signature } = body;

    // Validate required fields
    if (!marketId || position === undefined || !from || !value || !nonce || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get configuration
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312');
    const chain = chainId === 5031 ? somnia : somniaTestnet;
    const x402BettingAddress = process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS as `0x${string}`;
    const facilitatorPrivateKey = process.env.FACILITATOR_PRIVATE_KEY as `0x${string}`;

    if (!x402BettingAddress) {
      return NextResponse.json(
        { error: 'X402 Betting contract not configured' },
        { status: 500 }
      );
    }

    if (!facilitatorPrivateKey) {
      return NextResponse.json(
        { error: 'Facilitator not configured' },
        { status: 500 }
      );
    }

    // Create facilitator wallet client (pays gas)
    const facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey);
    const walletClient = createWalletClient({
      account: facilitatorAccount,
      chain,
      transport: http(),
    });

    // Execute gasless transaction
    console.log(`[x402] Relaying bet for ${from}:`, {
      marketId,
      position: position ? 'YES' : 'NO',
      value,
    });

    const hash = await walletClient.writeContract({
      address: x402BettingAddress,
      abi: X402_BETTING_ABI,
      functionName: 'buyPositionWithAuthorization',
      args: [
        BigInt(marketId),
        position,
        from as `0x${string}`,
        BigInt(value),
        BigInt(validAfter || 0),
        BigInt(validBefore),
        nonce as `0x${string}`,
        signature as `0x${string}`,
      ],
    });

    console.log(`[x402] Transaction sent:`, hash);

    // Wait for confirmation
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === 'success') {
      console.log(`[x402] Transaction confirmed:`, hash);
      
      return NextResponse.json({
        success: true,
        transactionHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
      });
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('[x402] Relay error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
