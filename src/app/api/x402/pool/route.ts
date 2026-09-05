/**
 * x402 Deposit Pool API
 * Users deposit STT once, then all bets are 100% gasless via signatures
 * 
 * Flow:
 * 1. User deposits STT to facilitator (one-time gas cost)
 * 2. Facilitator tracks user's credit balance
 * 3. User signs x402 authorizations for each bet (FREE - no gas)
 * 4. Facilitator executes bets from pool, deducts from user's credit
 * 5. Winnings added back to user's credit
 * 6. User can withdraw credit anytime
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  formatEther,
  type Address,
  type Hex,
  verifyTypedData
} from 'viem';
import { somniaTestnet } from 'viem/chains';
import { somniaMainnet as somnia } from '@/lib/web3-config';
import { privateKeyToAccount } from 'viem/accounts';

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '50312');
const chain = CHAIN_ID === 5031 ? somnia : somniaTestnet;

// Facilitator config
const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY as Hex;
const FACILITATOR_FEE_BPS = 50; // 0.5%

// In production, use Redis/PostgreSQL for persistent storage
// For now, use in-memory map (resets on server restart)
const userCredits = new Map<string, bigint>();
const _pendingDeposits = new Map<string, { amount: bigint; timestamp: number }>();
const usedNonces = new Set<string>();

// EIP-712 domain for x402 bet authorization
const DOMAIN = {
  name: 'PredictSOMNIA x402',
  version: '1',
  chainId: CHAIN_ID,
};

const BET_AUTHORIZATION_TYPES = {
  BetAuthorization: [
    { name: 'marketId', type: 'uint256' },
    { name: 'position', type: 'bool' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'validBefore', type: 'uint256' },
  ],
};

/**
 * GET - Check user's credit balance
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get('address')?.toLowerCase();

  if (!userAddress) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const credit = userCredits.get(userAddress) || BigInt(0);
  
  return NextResponse.json({
    address: userAddress,
    credit: credit.toString(),
    creditFormatted: formatEther(credit),
    feeBps: FACILITATOR_FEE_BPS,
  });
}

/**
 * POST - Deposit STT or place gasless bet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'deposit':
        return handleDeposit(body);
      case 'bet':
        return handleGaslessBet(body);
      case 'withdraw':
        return handleWithdraw(body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[x402 Pool] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * Handle STT deposit - User sends STT, gets credit
 */
async function handleDeposit(body: {
  txHash: string;
  userAddress: string;
  expectedAmount: string;
}) {
  const { txHash, userAddress, expectedAmount: _expectedAmount } = body;
  const userAddr = userAddress.toLowerCase();

  if (!txHash || !userAddress) {
    return NextResponse.json(
      { error: 'txHash and userAddress required' },
      { status: 400 }
    );
  }

  const publicClient = createPublicClient({ chain, transport: http() });
  const facilitatorAccount = privateKeyToAccount(FACILITATOR_PRIVATE_KEY);

  // Verify the transaction
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
    
    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed' }, { status: 400 });
    }

    const tx = await publicClient.getTransaction({ hash: txHash as Hex });
    
    // Verify transfer was to facilitator
    if (tx.to?.toLowerCase() !== facilitatorAccount.address.toLowerCase()) {
      return NextResponse.json(
        { error: 'STT not sent to facilitator' },
        { status: 400 }
      );
    }

    // Verify sender
    if (tx.from.toLowerCase() !== userAddr) {
      return NextResponse.json(
        { error: 'Transaction sender mismatch' },
        { status: 400 }
      );
    }

    // Credit user's balance
    const currentCredit = userCredits.get(userAddr) || BigInt(0);
    const newCredit = currentCredit + tx.value;
    userCredits.set(userAddr, newCredit);

    console.log('[x402 Pool] Deposit credited:', {
      user: userAddr,
      amount: formatEther(tx.value),
      newBalance: formatEther(newCredit),
    });

    return NextResponse.json({
      success: true,
      deposited: formatEther(tx.value),
      newBalance: formatEther(newCredit),
    });
  } catch (e) {
    console.error('[x402 Pool] Deposit verification failed:', e);
    return NextResponse.json(
      { error: 'Could not verify deposit' },
      { status: 400 }
    );
  }
}

/**
 * Handle gasless bet - User signs, facilitator executes
 */
async function handleGaslessBet(body: {
  marketId: number;
  position: boolean;
  amount: string;
  userAddress: string;
  nonce: string;
  validBefore: number;
  signature: string;
}) {
  const { marketId, position, amount, userAddress, nonce, validBefore, signature } = body;
  const userAddr = userAddress?.toLowerCase();

  if (!marketId || position === undefined || !amount || !userAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { isSoftResolved } = await import('@/lib/market-resolution');
  if (isSoftResolved(Number(marketId))) {
    return NextResponse.json(
      { error: 'This market is closed — past-year event settled for 2026.' },
      { status: 400 }
    );
  }
  const betAmount = BigInt(amount);

  // Check nonce not used
  if (usedNonces.has(nonce)) {
    return NextResponse.json({ error: 'Nonce already used' }, { status: 400 });
  }

  // Check validity time
  if (Date.now() / 1000 > validBefore) {
    return NextResponse.json({ error: 'Authorization expired' }, { status: 400 });
  }

  // Check user has enough credit
  const userCredit = userCredits.get(userAddr) || BigInt(0);
  if (userCredit < betAmount) {
    return NextResponse.json(
      { 
        error: 'Insufficient credit', 
        required: formatEther(betAmount),
        available: formatEther(userCredit),
      },
      { status: 400 }
    );
  }

  // Verify signature
  const isValid = await verifyTypedData({
    address: userAddress as Address,
    domain: DOMAIN,
    types: BET_AUTHORIZATION_TYPES,
    primaryType: 'BetAuthorization',
    message: {
      marketId: BigInt(marketId),
      position,
      amount: betAmount,
      nonce: nonce as Hex,
      validBefore: BigInt(validBefore),
    },
    signature: signature as Hex,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Mark nonce as used
  usedNonces.add(nonce);

  // Calculate amounts
  const feeAmount = (betAmount * BigInt(FACILITATOR_FEE_BPS)) / BigInt(10000);
  const actualBetAmount = betAmount - feeAmount;

  // Deduct from user's credit
  userCredits.set(userAddr, userCredit - betAmount);

  // Execute bet on-chain
  const facilitatorAccount = privateKeyToAccount(FACILITATOR_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account: facilitatorAccount,
    chain,
    transport: http(),
  });
  const publicClient = createPublicClient({ chain, transport: http() });

  const PREDICTION_MARKET = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS as Address;
  
  try {
    console.log('[x402 Pool] Executing gasless bet:', {
      marketId,
      position,
      user: userAddr,
      amount: formatEther(actualBetAmount),
    });

    const hash = await walletClient.writeContract({
      address: PREDICTION_MARKET,
      abi: [{
        name: 'buyPositionForUser',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'marketId', type: 'uint256' },
          { name: 'position', type: 'bool' },
          { name: 'user', type: 'address' },
        ],
        outputs: [],
      }],
      functionName: 'buyPositionForUser',
      args: [BigInt(marketId), position, userAddress as Address],
      value: actualBetAmount,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    console.log('[x402 Pool] ✅ Gasless bet placed!', {
      txHash: hash,
      gasUsed: receipt.gasUsed.toString(),
    });

    try {
      const { registerTrader } = await import('@/lib/trader-registry');
      await registerTrader(userAddress);
    } catch (regErr) {
      console.warn('[x402 Pool] trader registry update skipped', regErr);
    }

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      betAmount: formatEther(actualBetAmount),
      fee: formatEther(feeAmount),
      remainingCredit: formatEther(userCredits.get(userAddr) || BigInt(0)),
    });
  } catch (e) {
    // Refund credit on failure
    userCredits.set(userAddr, userCredit);
    usedNonces.delete(nonce);
    
    console.error('[x402 Pool] Bet failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Bet execution failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle withdrawal - User gets STT back
 */
async function handleWithdraw(body: {
  userAddress: string;
  amount: string;
  signature: string;
  nonce: string;
}) {
  const { userAddress, amount, signature: _signature, nonce: _nonce } = body;
  const userAddr = userAddress.toLowerCase();
  const withdrawAmount = BigInt(amount);

  // Check credit
  const userCredit = userCredits.get(userAddr) || BigInt(0);
  if (userCredit < withdrawAmount) {
    return NextResponse.json(
      { error: 'Insufficient credit' },
      { status: 400 }
    );
  }

  // Deduct credit and send STT
  userCredits.set(userAddr, userCredit - withdrawAmount);

  const facilitatorAccount = privateKeyToAccount(FACILITATOR_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account: facilitatorAccount,
    chain,
    transport: http(),
  });
  const publicClient = createPublicClient({ chain, transport: http() });

  try {
    const hash = await walletClient.sendTransaction({
      to: userAddress as Address,
      value: withdrawAmount,
    });

    await publicClient.waitForTransactionReceipt({ hash });

    console.log('[x402 Pool] Withdrawal sent:', {
      user: userAddr,
      amount: formatEther(withdrawAmount),
      txHash: hash,
    });

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      withdrawn: formatEther(withdrawAmount),
      remainingCredit: formatEther(userCredits.get(userAddr) || BigInt(0)),
    });
  } catch (e) {
    // Refund credit on failure
    userCredits.set(userAddr, userCredit);
    
    return NextResponse.json(
      { error: 'Withdrawal failed' },
      { status: 500 }
    );
  }
}
