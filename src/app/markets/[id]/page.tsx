/**
 * Market Detail Page
 * View market details and place bets
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import {
  useMarket,
  usePosition,
  usePlaceBet,
  useClaimWinnings,
  useCalculateWinnings,
} from '@/hooks/useContracts';
import { useX402Bet, useCanUseX402, useGasSponsorship } from '@/hooks/useX402Bet';
import { useClaimGasless } from '@/hooks/useX402Extended';
import { useWSOMNIA } from '@/hooks/useWSOMNIA';
import { WrapSOMNIAModal } from '@/components/WrapSOMNIAModal';
import { useSOMNIABet, useFacilitatorStatus } from '@/hooks/useSOMNIABet';
import { useX402Pool } from '@/hooks/useX402Pool';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Trophy,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { applySoftResolution } from '@/lib/market-resolution';

// Helper function to get block explorer URL
function getExplorerUrl(chainId: number, txHash: string): string | null {
  switch (chainId) {
    case 5031: // Somnia Mainnet
      return `https://somniascan.com/tx/${txHash}`;
    case 50312: // Somnia Shannon Testnet
      return `https://testnet.somniascan.com/tx/${txHash}`;
    case 31337: // Localhost
      return null; // No explorer for local network
    default:
      return null;
  }
}

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const marketId = parseInt(params.id as string);
  const { isConnected, chainId } = useAccount();

  // Use BLOCKCHAIN as primary and only source of truth (100% LIVE)
  const { data: marketData, isLoading: loadingMarket } = useMarket(marketId);
  const { data: positionData } = usePosition(marketId);
  const {
    placeBet,
    isPending: isBetting,
    hash: betTxHash,
    isConfirming: isBetConfirming,
    isSuccess: isBetSuccess,
  } = usePlaceBet();
  const {
    claimWinnings,
    isPending: isClaiming,
    hash: claimTxHash,
    isConfirming: isClaimConfirming,
    isSuccess: isClaimSuccess,
  } = useClaimWinnings();

  const [betAmount, setBetAmount] = useState('0.1');
  const [selectedPosition, setSelectedPosition] = useState<boolean | null>(
    null
  );
  const [_showBetForm, _setShowBetForm] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [useGasless, setUseGasless] = useState(true); // Default to gasless
  const [useGaslessClaim, setUseGaslessClaim] = useState(true); // Gasless claim

  // Minimum bet requirements (contract MIN_BET = 0.001 STT)
  // For gasless: need slightly more to cover 0.5% facilitator fee
  const MIN_BET = 0.001;
  const MIN_BET_GASLESS = 0.00101; // 0.001 + 0.5% fee buffer

  const { potentialWinnings, odds: _odds } = useCalculateWinnings(
    marketId,
    selectedPosition ?? true,
    betAmount
  );

  // x402 Protocol - Revolutionary gasless betting
  const {
    placeBetGasless,
    isPending: isGaslessPending,
    error: gaslessError,
  } = useX402Bet();
  
  const { canUse: canUseGasless, reason: gaslessReason } = useCanUseX402();
  const { sponsoredAmount, fetchSponsorship } = useGasSponsorship();
  
  // x402 Pool - True gasless betting (deposit once, bet forever gasless)
  const {
    credit: _x402Credit,
    creditFormatted: x402CreditFormatted,
    hasCredit: hasX402Credit,
    canBetGasless: canUseX402Pool,
    deposit: depositToPool,
    isDepositing: isDepositingToPool,
    placeBet: placeBetX402Pool,
    isBetting: isX402PoolBetting,
    betError: _x402PoolError,
    refetchCredit: refetchX402Credit,
  } = useX402Pool();
  
  // WSOMNIA3009 for legacy gasless betting
  const { wbnbBalance: _wbnbBalance, wbnbFormatted, bnbFormatted, refetch: refetchWSOMNIA } = useWSOMNIA();
  const [showWrapModal, setShowWrapModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.1');
  
  // Pure SOMNIA betting (simpler flow - facilitator handles WSOMNIA internally)
  const { placeBet: _placeBetPureSTT, isPending: _isPureSTTPending, step: _pureSTTStep, error: _pureSTTError } = useSOMNIABet();
  const { status: _facilitatorStatus, checkStatus: checkFacilitatorStatus } = useFacilitatorStatus();
  
  // Check facilitator status on mount
  useEffect(() => {
    checkFacilitatorStatus();
  }, [checkFacilitatorStatus]);
  
  const [gaslessTxHash, setGaslessTxHash] = useState<string | null>(null);
  const { claimGasless, isPending: isGaslessClaimPending } = useClaimGasless();
  const [isGaslessSuccess, setIsGaslessSuccess] = useState(false);

  // Show transaction modal when transaction is initiated
  useEffect(() => {
    if (betTxHash || claimTxHash || gaslessTxHash) {
      setShowTxModal(true);
    }
  }, [betTxHash, claimTxHash, gaslessTxHash]);

  // Close modal and reset form when transaction succeeds
  useEffect(() => {
    if (isBetSuccess || isGaslessSuccess) {
      setTimeout(() => {
        _setShowBetForm(false);
        setBetAmount('0.1');
        setSelectedPosition(null);
      }, 3000); // Keep modal open for 3 seconds to show success
    }
  }, [isBetSuccess, isGaslessSuccess]);

  if (loadingMarket) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!marketData) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Market Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This market doesn&apos;t exist or hasn&apos;t been loaded yet.
          </p>
          <Button onClick={() => router.push('/markets')}>
            Back to Markets
          </Button>
        </Card>
      </div>
    );
  }

  // Parse blockchain data - 100% LIVE from chain, with soft-resolve for past-year events
  const marketArray = [...marketData] as unknown[];
  const question = marketArray[1] as string;
  const description = marketArray[2] as string;
  const category = marketArray[3] as string;
  const endTime = marketArray[5] as bigint;
  const totalYesAmount = marketArray[6] as bigint;
  const totalNoAmount = marketArray[7] as bigint;
  const chainResolved = marketArray[8] as boolean;
  const chainOutcome = marketArray[9] as boolean;
  const chainResolvedAt = marketArray[10] as bigint;
  const aiOracleEnabled = marketArray[11] as boolean;

  const soft = applySoftResolution({
    id: marketId,
    question,
    resolved: chainResolved,
    outcome: chainOutcome,
    resolvedAt: Number(chainResolvedAt),
    endTime: Number(endTime),
  });
  const resolved = soft.resolved;
  const outcome = soft.outcome;
  const resolvedAt = BigInt(soft.resolvedAt || Number(chainResolvedAt) || 0);
  const softResolved = soft.softResolved;
  const resolutionNote = soft.resolutionNote;
  const bettingClosed = soft.bettingClosed;

  const endDate = new Date(Number(endTime) * 1000);
  const hasEnded = endDate < new Date() || bettingClosed;
  const totalPool = Number(formatEther(totalYesAmount + totalNoAmount));
  const yesAmount = Number(formatEther(totalYesAmount));
  const noAmount = Number(formatEther(totalNoAmount));
  const yesPercentage = totalPool > 0 ? (yesAmount / totalPool) * 100 : 50;
  const noPercentage = totalPool > 0 ? (noAmount / totalPool) * 100 : 50;

  // User position
  const userYesAmount = positionData
    ? Number(formatEther((Array.from(positionData) as unknown[])[0] as bigint))
    : 0;
  const userNoAmount = positionData
    ? Number(formatEther((Array.from(positionData) as unknown[])[1] as bigint))
    : 0;
  const hasClaimed = positionData ? ((Array.from(positionData) as unknown[])[2] as boolean) : false;
  const hasPosition = userYesAmount > 0 || userNoAmount > 0;

  // On-chain claim only when the contract itself is resolved (soft-resolve cannot pay out yet)
  const canClaim =
    chainResolved &&
    hasPosition &&
    !hasClaimed &&
    ((outcome && userYesAmount > 0) || (!outcome && userNoAmount > 0));

  const handlePlaceBet = async (position: boolean) => {
    if (!isConnected) return;
    if (bettingClosed || resolved) {
      alert('This market is closed — past-year events are settled for 2026.');
      return;
    }

    try {
      setSelectedPosition(position);
      
      // PRIORITY 1: x402 Pool (100% gasless if user has credit)
      if (useGasless && canUseX402Pool && parseFloat(x402CreditFormatted) >= parseFloat(betAmount)) {
        console.log('[Bet] Using x402 Pool - 100% GASLESS!');
        const result = await placeBetX402Pool(marketId, position, betAmount);
        
        if (result.success) {
          setGaslessTxHash(result.transactionHash || null);
          setIsGaslessSuccess(true);
          await refetchX402Credit();
        }
      }
      // PRIORITY 2: x402 with WSOMNIA3009 signature
      else if (useGasless && canUseGasless && parseFloat(wbnbFormatted) >= parseFloat(betAmount)) {
        console.log('[Bet] Using x402 gasless with WSOMNIA3009');
        const amount = BigInt(Math.floor(parseFloat(betAmount) * 1e18));
        const result = await placeBetGasless(marketId, position, amount);
        
        if (result.success) {
          setGaslessTxHash(result.transactionHash || null);
          setIsGaslessSuccess(true);
          await fetchSponsorship();
        }
      }
      // Standard flow: User pays gas directly
      else {
        console.log('[Bet] Using standard bet (user pays gas)');
        await placeBet(marketId, position, betAmount);
      }
      // Transaction modal will show automatically via useEffect
    } catch (_error) {
      // Error handled by wagmi or x402 hook
    }
  };

  const handleClaim = async () => {
    if (!isConnected) return;

    try {
      if (useGaslessClaim) {
        const result = await claimGasless(marketId);
        if (result.success && result.transactionHash) {
          setGaslessTxHash(result.transactionHash);
          setShowTxModal(true);
        }
      } else {
        await claimWinnings(marketId);
      }
    } catch (_error) {
      // Error handled by wagmi or gasless hook
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      // Silently fail if clipboard not available
    }
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      {/* Market Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                {category}
              </span>
              {aiOracleEnabled && (
                <span className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs rounded flex items-center gap-1">
                  🤖 AI Oracle
                </span>
              )}
              {resolved && (
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded">
                  ✓ Resolved{softResolved ? ' (2026 settlement)' : ''}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">{question}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">
                {hasEnded ? 'Ended' : 'Ends'}
              </p>
              <p className="text-sm font-medium">
                {formatDistanceToNow(endDate, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Pool</p>
              <p className="text-sm font-medium">{totalPool.toFixed(4)} STT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Participants</p>
              <p className="text-sm font-medium">
                {totalPool > 0 ? Math.floor(totalPool * 100) + 1 : 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Your Position</p>
              <p className="text-sm font-medium">
                {(userYesAmount + userNoAmount).toFixed(4)} STT
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* x402 Gasless Betting Card */}
      {isConnected && useGasless && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h4 className="font-semibold text-green-900">x402 Gasless Mode</h4>
                {hasX402Credit ? (
                  <>
                    <p className="text-2xl font-bold text-green-700">
                      {parseFloat(x402CreditFormatted).toFixed(4)} STT Credit
                    </p>
                    <p className="text-xs text-green-600">
                      ✅ 100% gasless betting active! Just sign to bet.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-green-800">
                      Deposit STT once → All bets become 100% gasless!
                    </p>
                    <p className="text-xs text-green-600">
                      0.5% fee • Your STT: {parseFloat(bnbFormatted).toFixed(4)}
                    </p>
                  </>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowDepositModal(true)}
              className="border-green-400 text-green-800 hover:bg-green-100"
            >
              {hasX402Credit ? 'Add Credit' : 'Deposit STT'}
            </Button>
          </div>
          {!hasX402Credit && (
            <div className="mt-3 p-2 bg-green-100 rounded-lg text-xs text-green-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Deposit STT to start gasless betting. You only pay gas once for the deposit!
            </div>
          )}
        </Card>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Deposit to x402 Pool</h3>
              <button onClick={() => setShowDepositModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Deposit STT once, then all your bets are <strong>100% gasless</strong>. Just sign with your wallet - no gas fees!
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Amount (STT)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span>Current Credit:</span>
                  <span className="font-medium">{parseFloat(x402CreditFormatted).toFixed(4)} STT</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Your STT Balance:</span>
                  <span className="font-medium">{parseFloat(bnbFormatted).toFixed(4)} STT</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>After Deposit:</span>
                  <span className="font-medium">
                    {(parseFloat(x402CreditFormatted) + parseFloat(depositAmount || '0')).toFixed(4)} STT
                  </span>
                </div>
              </div>
              <Button
                onClick={async () => {
                  const result = await depositToPool(depositAmount);
                  if (result.success) {
                    await refetchX402Credit();
                    setShowDepositModal(false);
                  }
                }}
                disabled={isDepositingToPool || parseFloat(depositAmount) <= 0}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {isDepositingToPool ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Depositing...
                  </>
                ) : (
                  'Deposit STT'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Legacy WSOMNIA3009 Balance Card - Fallback */}
      {isConnected && useGasless && !hasX402Credit && parseFloat(wbnbFormatted) > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h4 className="font-semibold text-yellow-900">WSOMNIA3009 Balance (Legacy)</h4>
                <p className="text-sm text-yellow-800">
                  {parseFloat(wbnbFormatted).toFixed(4)} WSOMNIA3009
                </p>
                <p className="text-xs text-yellow-700">
                  Can also be used for gasless betting via EIP-3009
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowWrapModal(true)}
              className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
            >
              Manage
            </Button>
          </div>
        </Card>
      )}

      {/* Platform Features Banner */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* x402 Protocol Gasless Trading */}
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🚀</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-green-900">x402 Protocol</h4>
                {canUseGasless && (
                  <button
                    onClick={() => setUseGasless(!useGasless)}
                    className={`px-2 py-1 text-xs rounded ${
                      useGasless
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {useGasless ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>
              <p className="text-xs text-green-700">
                {canUseGasless
                  ? `✓ Active • ${sponsoredAmount ? (Number(sponsoredAmount) / 1e18).toFixed(4) : '0'} STT sponsored`
                  : `${gaslessReason || 'Connect wallet'}`}
              </p>
              {gaslessError && (
                <p className="text-xs text-red-600 mt-1">⚠️ {gaslessError}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Copy Trading */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-blue-900 mb-1">Copy Trading</h4>
              <p className="text-xs text-blue-700">
                Follow top performers • <Link href="/leaderboard" className="underline hover:text-blue-900">View leaderboard</Link>
              </p>
            </div>
          </div>
        </Card>

        {/* On-Chain Reputation */}
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🏆</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-purple-900 mb-1">On-Chain Reputation</h4>
              <p className="text-xs text-purple-700">
                Accuracy scores stored immutably • <Link href="/reputation" className="underline hover:text-purple-900">View yours</Link>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Oracle Rules */}
      {aiOracleEnabled && (
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h3 className="text-lg font-semibold">AI Oracle Rules & Resolution</h3>
          </div>
          
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2">✅ Fairness Guarantees</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• <strong>Multi-Source Verification:</strong> Data cross-checked from 3+ independent sources</li>
                <li>• <strong>80% Confidence Threshold:</strong> Only high-certainty outcomes auto-resolve</li>
                <li>• <strong>Transparent Evidence:</strong> Complete reasoning stored immutably on IPFS</li>
                <li>• <strong>Bias Detection:</strong> AI checks for data inconsistencies before resolving</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">⚡ Resolution Process</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• <strong>Step 1:</strong> Fetch real-time data from official sources</li>
                <li>• <strong>Step 2:</strong> GPT-4 analyzes evidence with category-specific rules</li>
                <li>• <strong>Step 3:</strong> Evidence package uploaded to IPFS</li>
                <li>• <strong>Step 4:</strong> Smart contract resolves market on-chain</li>
                <li>• <strong>Time:</strong> ~30 seconds average resolution</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">🎯 {category} Market Rules</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                {category === 'NFT' && (
                  <>
                    <li>• Verify on-chain contract addresses and mint events</li>
                    <li>• Check OpenSea, Blur, and X2Y2 for collection data</li>
                    <li>• Use floor prices and trading volume as supporting evidence</li>
                  </>
                )}
                {category === 'Music' && (
                  <>
                    <li>• Use official Spotify/Apple Music chart data</li>
                    <li>• Verify Billboard rankings and streaming counts</li>
                    <li>• Check artist/label official announcements</li>
                  </>
                )}
                {category === 'Fashion' && (
                  <>
                    <li>• Verify from official brand press releases</li>
                    <li>• Check product availability on brand websites</li>
                    <li>• Review coverage from Vogue, WWD, and Highsnobiety</li>
                  </>
                )}
                {category === 'DeFi' && (
                  <>
                    <li>• Use DEX aggregator data (CoinGecko, DeFiLlama)</li>
                    <li>• Check multiple DEXs for price consensus</li>
                    <li>• Verify TVL from blockchain explorers</li>
                  </>
                )}
                {!['NFT', 'Music', 'Fashion', 'DeFi'].includes(category) && (
                  <>
                    <li>• Cross-verify data from multiple reputable sources</li>
                    <li>• Require official announcements or on-chain proof</li>
                    <li>• Consider time zones and exact event timing</li>
                  </>
                )}
              </ul>
            </div>

            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Fast Payouts:</strong> Winners can claim immediately after resolution.
                Disputes can be filed within 24 hours if new evidence emerges.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Resolution Display */}
      {resolved && (
        <Card className="p-6 mb-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">
                Market Resolved: {outcome ? 'YES' : 'NO'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Resolved{' '}
                {resolvedAt
                  ? formatDistanceToNow(new Date(Number(resolvedAt) * 1000), {
                      addSuffix: true,
                    })
                  : 'recently'}
              </p>
              {softResolved && resolutionNote && (
                <p className="text-sm mt-2 text-amber-700 dark:text-amber-400">
                  {resolutionNote} Betting is closed. On-chain payout unlocks when the
                  contract endTime passes (or after a force-resolve deploy).
                </p>
              )}
              {softResolved && hasPosition && (
                <p className="text-sm mt-1 font-medium">
                  Your result:{' '}
                  {(outcome && userYesAmount > 0) || (!outcome && userNoAmount > 0)
                    ? 'Won (display) — claim when on-chain settlement is available'
                    : 'Lost (display) — stake stays in the pool until on-chain settle'}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Claim Winnings */}
      {canClaim && (
        <Card className="p-6 mb-6 bg-gradient-to-r from-yellow-500/10 to-green-500/10 border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="text-lg font-semibold">You Won! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  Claim your winnings now
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg">
                <input
                  type="checkbox"
                  id="gasless-claim"
                  checked={useGaslessClaim}
                  onChange={(e) => setUseGaslessClaim(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="gasless-claim" className="text-sm cursor-pointer">
                  🆓 Gasless
                </label>
              </div>
              <Button
                onClick={handleClaim}
                disabled={isClaiming || isGaslessClaimPending}
                className="gap-2"
              >
                {(isClaiming || isGaslessClaimPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {useGaslessClaim ? '🆓 Claiming...' : 'Claiming...'}
                  </>
                ) : (
                  <>
                    {useGaslessClaim && '🆓 '}
                    Claim Winnings
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Trading Interface - Polymarket Style */}
      {!resolved && !hasEnded && (
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-6">Trade</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* YES Side */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <h4 className="text-lg font-bold">YES</h4>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-500">{yesPercentage.toFixed(0)}¢</div>
                  <div className="text-xs text-muted-foreground">{yesPercentage.toFixed(1)}% chance</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Amount (STT)
                    {useGasless && canUseGasless && (
                      <span className="text-xs text-muted-foreground ml-2">min: {MIN_BET_GASLESS} for gasless</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={selectedPosition === true ? betAmount : '0.1'}
                    onChange={e => {
                      setBetAmount(e.target.value);
                      setSelectedPosition(true);
                    }}
                    onFocus={() => setSelectedPosition(true)}
                    step="0.001"
                    min={useGasless && canUseGasless ? MIN_BET_GASLESS : MIN_BET}
                    placeholder="0.1"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
                  />
                </div>

                {selectedPosition === true && (
                  <div className="p-3 bg-green-500/10 rounded-lg space-y-1 text-sm border border-green-500/20">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg price</span>
                      <span className="font-medium">{yesPercentage.toFixed(1)}¢</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. shares</span>
                      <span className="font-medium">{(Number(betAmount) * 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Potential return</span>
                      <span className="font-medium text-green-500">+{potentialWinnings} STT</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handlePlaceBet(true)}
                  disabled={!isConnected || isBetting || isGaslessPending || isX402PoolBetting || Number(betAmount) < (useGasless && canUseX402Pool ? MIN_BET_GASLESS : MIN_BET)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                >
                  {((isBetting || isGaslessPending || isX402PoolBetting) && selectedPosition === true) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {useGasless && hasX402Credit ? '⚡ Gasless...' : useGasless ? '🆓 Signing...' : 'Buying...'}
                    </>
                  ) : (
                    <>
                      {useGasless && hasX402Credit && '⚡ '}
                      {useGasless && !hasX402Credit && canUseGasless && '🆓 '}
                      Buy YES
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-3 border-t space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total volume</span>
                  <span className="font-medium">{yesAmount.toFixed(4)} STT</span>
                </div>
                <div className="flex justify-between">
                  <span>Your position</span>
                  <span className="font-medium">{userYesAmount.toFixed(4)} STT</span>
                </div>
              </div>
            </div>

            {/* NO Side */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <h4 className="text-lg font-bold">NO</h4>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-500">{noPercentage.toFixed(0)}¢</div>
                  <div className="text-xs text-muted-foreground">{noPercentage.toFixed(1)}% chance</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Amount (STT)
                    {useGasless && canUseGasless && (
                      <span className="text-xs text-muted-foreground ml-2">min: {MIN_BET_GASLESS} for gasless</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={selectedPosition === false ? betAmount : '0.1'}
                    onChange={e => {
                      setBetAmount(e.target.value);
                      setSelectedPosition(false);
                    }}
                    onFocus={() => setSelectedPosition(false)}
                    step="0.001"
                    min={useGasless && canUseGasless ? MIN_BET_GASLESS : MIN_BET}
                    placeholder="0.1"
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-background"
                  />
                </div>

                {selectedPosition === false && (
                  <div className="p-3 bg-red-500/10 rounded-lg space-y-1 text-sm border border-red-500/20">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg price</span>
                      <span className="font-medium">{noPercentage.toFixed(1)}¢</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. shares</span>
                      <span className="font-medium">{(Number(betAmount) * 100).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Potential return</span>
                      <span className="font-medium text-green-500">+{potentialWinnings} STT</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handlePlaceBet(false)}
                  disabled={!isConnected || isBetting || isGaslessPending || isX402PoolBetting || Number(betAmount) < (useGasless && canUseX402Pool ? MIN_BET_GASLESS : MIN_BET)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white"
                  size="lg"
                >
                  {((isBetting || isGaslessPending || isX402PoolBetting) && selectedPosition === false) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {useGasless && hasX402Credit ? '⚡ Gasless...' : useGasless ? '🆓 Signing...' : 'Buying...'}
                    </>
                  ) : (
                    <>
                      {useGasless && hasX402Credit && '⚡ '}
                      {useGasless && !hasX402Credit && canUseGasless && '🆓 '}
                      Buy NO
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-3 border-t space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total volume</span>
                  <span className="font-medium">{noAmount.toFixed(4)} STT</span>
                </div>
                <div className="flex justify-between">
                  <span>Your position</span>
                  <span className="font-medium">{userNoAmount.toFixed(4)} STT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error display for gasless betting */}
          {gaslessError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">Bet Failed</p>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">{gaslessError}</p>
                </div>
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Connect your wallet to start trading
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Market Ended - Show final odds */}
      {(hasEnded || resolved) && (
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Final Odds</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* YES Side */}
            <div className={`p-4 rounded-lg border-2 ${resolved && outcome ? 'bg-green-500/10 border-green-500' : 'border-muted'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <h4 className="text-lg font-bold">YES</h4>
                </div>
                {resolved && outcome && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>
              <div className="text-3xl font-bold text-green-500 mb-2">{yesPercentage.toFixed(0)}¢</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total volume</span>
                  <span className="font-medium">{yesAmount.toFixed(4)} STT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your position</span>
                  <span className="font-medium">{userYesAmount.toFixed(4)} STT</span>
                </div>
              </div>
            </div>

            {/* NO Side */}
            <div className={`p-4 rounded-lg border-2 ${resolved && !outcome ? 'bg-red-500/10 border-red-500' : 'border-muted'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  <h4 className="text-lg font-bold">NO</h4>
                </div>
                {resolved && !outcome && (
                  <CheckCircle className="w-6 h-6 text-red-500" />
                )}
              </div>
              <div className="text-3xl font-bold text-red-500 mb-2">{noPercentage.toFixed(0)}¢</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total volume</span>
                  <span className="font-medium">{noAmount.toFixed(4)} STT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your position</span>
                  <span className="font-medium">{userNoAmount.toFixed(4)} STT</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Transaction Status Modal */}
      {showTxModal && (betTxHash || claimTxHash) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Transaction Status</h3>
                <button
                  onClick={() => setShowTxModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {/* Transaction Status */}
              <div className="space-y-3">
                {/* Pending */}
                {(isBetting || isClaiming) && (
                  <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Waiting for wallet confirmation...</span>
                  </div>
                )}

                {/* Confirming */}
                {(isBetConfirming || isClaimConfirming) && (
                  <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Transaction confirming on blockchain...</span>
                  </div>
                )}

                {/* Success */}
                {(isBetSuccess || isClaimSuccess) && (
                  <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Transaction successful!</span>
                  </div>
                )}

                {/* Transaction Hash */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Transaction Hash:
                  </p>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg">
                    <code className="text-xs flex-1 overflow-x-auto">
                      {betTxHash || claimTxHash}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(betTxHash || claimTxHash || '')
                      }
                      className="p-1 hover:bg-background rounded"
                      title="Copy transaction hash"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Explorer Link */}
                {chainId &&
                  getExplorerUrl(
                    chainId,
                    betTxHash || claimTxHash || ''
                  ) && (
                    <a
                      href={
                        getExplorerUrl(
                          chainId,
                          betTxHash || claimTxHash || ''
                        ) || '#'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <span>View on Block Explorer</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                {/* Localhost message */}
                {chainId === 31337 && (
                  <p className="text-xs text-muted-foreground text-center">
                    No block explorer available for local network
                  </p>
                )}
              </div>

              {/* Close button for success */}
              {(isBetSuccess || isClaimSuccess) && (
                <Button
                  onClick={() => {
                    setShowTxModal(false);
                    if (isBetSuccess) {
                      _setShowBetForm(false);
                      setBetAmount('0.1');
                      setSelectedPosition(null);
                    }
                  }}
                  className="w-full"
                >
                  Close
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Wrap STT Modal */}
      <WrapSOMNIAModal 
        isOpen={showWrapModal} 
        onClose={() => {
          setShowWrapModal(false);
          refetchWSOMNIA();
        }}
        requiredAmount={betAmount}
      />
    </div>
  );
}
