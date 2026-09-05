/**
 * x402 Gas Sponsorship API Route
 * Returns user's total sponsored gas amount
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { somnia, somniaTestnet } from 'viem/chains';

const X402_BETTING_ABI = [
  {
    name: 'gasCredits',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const userAddress = params.address as `0x${string}`;
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312');
    const chain = chainId === 5031 ? somnia : somniaTestnet;

    const rpcUrl = chainId === 5031 
      ? (process.env.NEXT_PUBLIC_Somnia_RPC_URL || 'https://somnia-dataseed.binance.org/')
      : (process.env.NEXT_PUBLIC_Somnia_TESTNET_RPC_URL || 'https://data-seed-presomnia-1-s1.binance.org:8545/');

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const x402BettingAddress = process.env
      .NEXT_PUBLIC_X402_BETTING_ADDRESS as `0x${string}`;

    if (!x402BettingAddress) {
      // Return 0 if contract not configured (graceful degradation)
      return NextResponse.json({
        address: userAddress,
        totalSponsored: '0',
        chain: chainId,
      });
    }

    // Read sponsored amount from contract
    const totalSponsored = await publicClient.readContract({
      address: x402BettingAddress,
      abi: X402_BETTING_ABI,
      functionName: 'gasCredits',
      args: [userAddress],
    });

    return NextResponse.json({
      address: userAddress,
      totalSponsored: totalSponsored.toString(),
      chain: chainId,
    });
  } catch (error) {
    console.error('Failed to fetch gas sponsorship:', error);
    // Return 0 on error (graceful degradation)
    return NextResponse.json({
      address: params.address,
      totalSponsored: '0',
      chain: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312'),
      error: error instanceof Error ? error.message : 'Failed to fetch',
    });
  }
}
