/**
 * x402 Gasless Claim Winnings Endpoint
 * User signs authorization, facilitator executes claim and pays gas
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import { somniaMainnet as somnia } from '@/lib/web3-config';

const X402_BETTING_ABI = [
  {
    name: 'claimWinningsWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'from', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, from, deadline, nonce, signature } = body;

    if (!marketId || !from || !deadline || !nonce || !signature) {
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

    if (!x402BettingAddress || !facilitatorPrivateKey) {
      return NextResponse.json(
        { error: 'X402 not configured' },
        { status: 500 }
      );
    }

    // Create facilitator wallet client
    const facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey);
    const walletClient = createWalletClient({
      account: facilitatorAccount,
      chain,
      transport: http(),
    });

    console.log(`[x402-claim] Processing claim for ${from} on market ${marketId}`);

    // Execute gasless claim
    const hash = await walletClient.writeContract({
      address: x402BettingAddress,
      abi: X402_BETTING_ABI,
      functionName: 'claimWinningsWithAuthorization',
      args: [
        BigInt(marketId),
        from as `0x${string}`,
        BigInt(deadline),
        nonce as `0x${string}`,
        signature as `0x${string}`,
      ],
    });

    console.log(`[x402-claim] Transaction sent:`, hash);

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
      console.log(`[x402-claim] ✅ Claim successful:`, hash);

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
    console.error('[x402-claim] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
