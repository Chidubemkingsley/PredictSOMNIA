/**
 * x402 Gasless Follow Trader Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somnia, somniaTestnet } from 'viem/chains';

const X402_BETTING_ABI = [
  {
    name: 'followTraderWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'trader', type: 'address' },
      { name: 'maxAmountPerTrade', type: 'uint256' },
      { name: 'copyPercentage', type: 'uint256' },
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
    const { trader, maxAmountPerTrade, copyPercentage, from, deadline, nonce, signature } = body;

    if (!trader || !maxAmountPerTrade || copyPercentage === undefined || !from || !deadline || !nonce || !signature) {
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

    console.log(`[x402-follow] ${from} following ${trader}`);

    const hash = await walletClient.writeContract({
      address: x402BettingAddress,
      abi: X402_BETTING_ABI,
      functionName: 'followTraderWithAuthorization',
      args: [
        trader as `0x${string}`,
        BigInt(Math.floor(parseFloat(maxAmountPerTrade) * 1e18)),
        BigInt(copyPercentage),
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
      console.log(`[x402-follow] ✅ Follow successful`);

      return NextResponse.json({
        success: true,
        transactionHash: hash,
      });
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('[x402-follow] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
