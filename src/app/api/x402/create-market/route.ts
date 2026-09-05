/**
 * x402 Gasless Create Market Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet, somniaMainnet as somnia } from '@/lib/web3-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const X402_BETTING_ABI = [
  {
    name: 'createMarketWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'aiOracleEnabled', type: 'bool' },
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
    const { question, description, category, endTime, aiOracleEnabled, from, deadline, nonce, signature } = body;

    if (!question || !description || !category || !endTime || aiOracleEnabled === undefined || !from || !deadline || !nonce || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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

    const facilitatorAccount = privateKeyToAccount(facilitatorPrivateKey);
    const walletClient = createWalletClient({
      account: facilitatorAccount,
      chain,
      transport: http(),
    });

    console.log(`[x402-create-market] ${from} creating market: ${question}`);

    const hash = await walletClient.writeContract({
      address: x402BettingAddress,
      abi: X402_BETTING_ABI,
      functionName: 'createMarketWithAuthorization',
      args: [
        question,
        description,
        category,
        BigInt(endTime),
        aiOracleEnabled,
        from as `0x${string}`,
        BigInt(deadline),
        nonce as `0x${string}`,
        signature as `0x${string}`,
      ],
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

    if (receipt.status === 'success') {
      console.log(`[x402-create-market] ✅ Market created successfully`);

      return NextResponse.json({
        success: true,
        transactionHash: hash,
      });
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('[x402-create-market] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
