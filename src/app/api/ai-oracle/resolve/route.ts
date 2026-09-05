/**
 * AI Oracle Resolution API Route
 * Uses GPT-4 + multi-source data to resolve markets
 * Implements 30-minute resolution with 3-LLM consensus
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somnia, somniaTestnet } from 'viem/chains';
import { AIAnalyzer } from '@/services/ai-oracle/ai-analyzer';
import { fetchMarketData } from '@/services/ai-oracle/data-fetcher';

const AI_ORACLE_ABI = [
  {
    name: 'provideResolution',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'requestId', type: 'uint256' },
      { name: 'outcome', type: 'bool' },
      { name: 'confidence', type: 'uint256' },
      { name: 'evidenceHash', type: 'string' },
    ],
    outputs: [],
  },
] as const;

const PREDICTION_MARKET_ABI = [
  {
    name: 'markets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'endTime', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
    ],
  },
  {
    name: 'resolveMarket',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'bool' },
    ],
    outputs: [],
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, requestId } = body;

    if (!marketId) {
      return NextResponse.json(
        { error: 'Missing marketId' },
        { status: 400 }
      );
    }

    // Configuration
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312');
    const chain = chainId === 5031 ? somnia : somniaTestnet;
    const marketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS as `0x${string}`;
    const oracleAddress = process.env.NEXT_PUBLIC_AI_ORACLE_ADDRESS as `0x${string}`;
    const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;
    const groqApiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

    // Validate config
    if (!marketAddress || !oracleAddress) {
      return NextResponse.json(
        { error: 'Contracts not configured' },
        { status: 500 }
      );
    }

    if (!oraclePrivateKey) {
      return NextResponse.json(
        { error: 'Oracle not configured' },
        { status: 500 }
      );
    }

    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY (or OPENAI_API_KEY fallback) not configured' },
        { status: 500 }
      );
    }

    console.log(`[AI Oracle] Resolving market ${marketId}...`);

    // 1. Fetch market data from contract
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const market = await publicClient.readContract({
      address: marketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'markets',
      args: [BigInt(marketId)],
    });

    const [question, description, category, endTime, resolved] = market;

    if (resolved) {
      return NextResponse.json(
        { error: 'Market already resolved' },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < Number(endTime)) {
      return NextResponse.json(
        { error: 'Market has not ended yet' },
        { status: 400 }
      );
    }

    // 2. Fetch data from multiple sources
    console.log(`[AI Oracle] Fetching data sources for: ${question}`);
    const sourceData = await fetchMarketData({
      id: marketId,
      question: question as string,
      description: description as string,
      category: category as string,
      endTime: Number(endTime),
    });

    // 3. AI analysis with Groq (llama-3.3) — OpenAI-compatible fallback
    console.log(`[AI Oracle] Analyzing with Groq...`);
    const analyzer = new AIAnalyzer({
      apiKey: groqApiKey,
      minConfidence: 8000, // 80%
    });

    const analysis = await analyzer.analyze({
      market: {
        id: marketId,
        question: question as string,
        description: description as string,
        category: (category as string).toLowerCase() as any,
        endTime: new Date(Number(endTime) * 1000),
        creator: '0x0000000000000000000000000000000000000000',
        totalYesAmount: BigInt(0),
        totalNoAmount: BigInt(0),
        resolved: false,
        aiOracleEnabled: true,
      },
      sourceData,
    });

    // 4. Create evidence hash (simplified - in production upload to IPFS)
    console.log(`[AI Oracle] Creating evidence hash...`);
    const _evidenceData = JSON.stringify({
      marketId,
      question,
      analysis,
      sourceData,
      timestamp: now,
    });
    
    // Simple hash for now - in production use IPFS
    const evidenceCid = `evidence_${marketId}_${now}`;
    console.log(`[AI Oracle] Evidence hash created: ${evidenceCid}`);

    // 5. Submit resolution to contract
    if (analysis.confidence >= 8000) {
      console.log(`[AI Oracle] Submitting resolution: ${analysis.outcome ? 'YES' : 'NO'} (${analysis.confidence / 100}%)`);

      const oracleAccount = privateKeyToAccount(oraclePrivateKey);
      const walletClient = createWalletClient({
        account: oracleAccount,
        chain,
        transport: http(),
      });

      // If requestId provided, use provideResolution on AIOracle
      // Otherwise, resolve directly on PredictionMarket
      let hash: `0x${string}`;

      if (requestId !== undefined) {
        hash = await walletClient.writeContract({
          address: oracleAddress,
          abi: AI_ORACLE_ABI,
          functionName: 'provideResolution',
          args: [
            BigInt(requestId),
            analysis.outcome,
            BigInt(analysis.confidence),
            evidenceCid,
          ],
        });
      } else {
        hash = await walletClient.writeContract({
          address: marketAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'resolveMarket',
          args: [BigInt(marketId), analysis.outcome],
        });
      }

      console.log(`[AI Oracle] Resolution transaction:`, hash);

      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status === 'success') {
        console.log(`[AI Oracle] ✅ Market ${marketId} resolved: ${analysis.outcome ? 'YES' : 'NO'}`);

        return NextResponse.json({
          success: true,
          marketId,
          outcome: analysis.outcome,
          confidence: analysis.confidence,
          evidenceCid,
          transactionHash: hash,
          reasoning: analysis.reasoning,
          sources: sourceData.map(s => s.source),
        });
      } else {
        throw new Error('Transaction failed');
      }
    } else {
      // Confidence too low
      console.log(`[AI Oracle] ⚠️ Confidence too low: ${analysis.confidence / 100}%`);
      
      return NextResponse.json({
        success: false,
        error: 'Confidence below threshold',
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[AI Oracle] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET handler to check resolution status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get('marketId');

  if (!marketId) {
    return NextResponse.json(
      { error: 'Missing marketId' },
      { status: 400 }
    );
  }

  try {
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312');
    const chain = chainId === 5031 ? somnia : somniaTestnet;
    const marketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS as `0x${string}`;

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const market = await publicClient.readContract({
      address: marketAddress,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'markets',
      args: [BigInt(marketId)],
    });

    const [question, _description, _category, endTime, resolved] = market;

    return NextResponse.json({
      marketId: parseInt(marketId),
      question,
      resolved,
      endTime: Number(endTime),
      canResolve: !resolved && Date.now() / 1000 > Number(endTime),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
