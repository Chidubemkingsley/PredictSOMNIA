'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp, TrendingDown, Zap, Info, Loader2 } from 'lucide-react';
import { AIAnalysis } from '@/types/market';

interface PredictionModalProps {
  marketId: string;
  question: string;
  yesOdds: number;
  noOdds: number;
  onClose: () => void;
  onSubmit: (position: boolean, amount: string) => void;
  isSubmitting?: boolean;
}

export function PredictionModal({
  marketId,
  question,
  yesOdds,
  noOdds,
  onClose,
  onSubmit,
  isSubmitting = false,
}: PredictionModalProps) {
  const [position, setPosition] = useState<boolean | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Fetch AI analysis when requested
  useEffect(() => {
    if (showAIAnalysis && !aiAnalysis) {
      const fetchAIAnalysis = async () => {
        setLoadingAnalysis(true);
        try {
          const response = await fetch(`/api/ai-analysis/${marketId}`);
          if (!response.ok) throw new Error('Failed to fetch AI analysis');
          const data = await response.json();
          setAiAnalysis(data);
        } catch (_error) {
          // Failed to fetch analysis
        } finally {
          setLoadingAnalysis(false);
        }
      };
      fetchAIAnalysis();
    }
  }, [showAIAnalysis, marketId, aiAnalysis]);

  /**
   * POLYMARKET-STYLE POTENTIAL WINNINGS
   * 
   * In Polymarket:
   * - You buy shares at current price (e.g., 65¢ for YES)
   * - If you win, each share pays $1
   * - Profit per share = $1 - price = $0.35
   * - Return % = (1 / price) - 1 = 53.8%
   * 
   * In our parimutuel system:
   * - Your payout = (your_bet / winning_pool) * total_pool
   * - Profit = payout - your_bet
   * 
   * Edge cases:
   * - If odds = 0%: The market is empty on your side, you get ALL the opposing pool
   * - If odds = 100%: Everyone agrees with you, minimal profit (just your share back)
   */
  const calculatePotentialWinnings = () => {
    if (position === null || !amount) return { profit: '0', multiplier: '1.00x', returnPct: '0' };
    const investAmount = parseFloat(amount);
    if (isNaN(investAmount) || investAmount <= 0) return { profit: '0', multiplier: '1.00x', returnPct: '0' };
    
    // Current price (probability) for chosen position
    const chosenPrice = position ? yesOdds / 100 : noOdds / 100;
    
    // Handle edge cases for empty or one-sided markets
    // If odds are 0% or very close to 0, you're the first better on this side
    // Maximum theoretical return: you get the entire opposing pool + your stake
    if (chosenPrice <= 0.01) {
      // Near-zero odds = very high return potential (cap at 100x for display)
      const multiplier = 100;
      const payout = investAmount * multiplier;
      const profit = payout - investAmount;
      return {
        profit: profit.toFixed(4),
        payout: payout.toFixed(4),
        multiplier: '100x+',
        returnPct: '9900+',
      };
    }
    
    // If odds are 100% or very close, everyone is on this side
    // Minimal return: mostly just your money back
    if (chosenPrice >= 0.99) {
      // Near-100% odds = minimal return
      return {
        profit: '0.0001',
        payout: (investAmount + 0.0001).toFixed(4),
        multiplier: '1.00x',
        returnPct: '~0',
      };
    }
    
    // Normal case: Polymarket-style calculation
    // Shares you get = investment / price
    // If you win, payout = shares * $1 = investment / price
    // Profit = (investment / price) - investment = investment * ((1 / price) - 1)
    const multiplier = 1 / chosenPrice;
    const payout = investAmount * multiplier;
    const profit = payout - investAmount;
    const returnPct = ((multiplier - 1) * 100).toFixed(1);
    
    return {
      profit: profit.toFixed(4),
      payout: payout.toFixed(4),
      multiplier: multiplier.toFixed(2) + 'x',
      returnPct,
    };
  };

  const winnings = calculatePotentialWinnings();

  const getSentimentLabel = (sentiment: number): string => {
    if (sentiment > 0.3) return 'Bullish';
    if (sentiment < -0.3) return 'Bearish';
    return 'Neutral';
  };

  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0.3) return 'text-green-600';
    if (sentiment < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Make Your Prediction</CardTitle>
          <CardDescription className="text-base mt-2">
            {question}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Analysis Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-purple-900 mb-1">
                  AI-Powered Analysis Available
                </div>
                <p className="text-sm text-purple-700 mb-2">
                  Get real-time AI insights and market sentiment analysis
                  powered by our advanced oracle system.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                  className="text-purple-600 border-purple-300"
                >
                  {showAIAnalysis ? 'Hide' : 'Show'} AI Analysis
                </Button>
              </div>
            </div>
          </div>

          {showAIAnalysis && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              {loadingAnalysis ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    Loading AI analysis...
                  </p>
                </div>
              ) : aiAnalysis ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      AI Confidence:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {aiAnalysis.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Sentiment:</span>
                    <span
                      className={`text-lg font-bold ${getSentimentColor(aiAnalysis.sentiment)}`}
                    >
                      {getSentimentLabel(aiAnalysis.sentiment)}
                    </span>
                  </div>
                  {aiAnalysis.factors && aiAnalysis.factors.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <div className="font-semibold mb-1">Key Factors:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {aiAnalysis.factors.map((factor, index) => (
                          <li key={index}>
                            {factor.name} (
                            {factor.impact > 0.7
                              ? 'High'
                              : factor.impact > 0.4
                                ? 'Medium'
                                : 'Low'}{' '}
                            Impact)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 italic">
                    Last updated:{' '}
                    {new Date(aiAnalysis.lastUpdated * 1000).toLocaleString()} •
                    Sources: {aiAnalysis.sources?.length || 0} analyzed
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    No AI analysis available
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Position Selection - Polymarket Style */}
          <div className="space-y-3">
            <label className="text-sm font-semibold">
              Choose Your Position
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPosition(true)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  position === true
                    ? 'border-green-500 bg-green-50 shadow-lg'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-bold text-lg text-green-700">YES</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {yesOdds.toFixed(1)}¢
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {yesOdds.toFixed(0)}% chance
                </div>
                <div className="text-xs text-green-600 mt-2 font-medium">
                  {yesOdds <= 1 ? '9900%+ return' : yesOdds >= 99 ? '~0% return' : `${((1 / (yesOdds / 100) - 1) * 100).toFixed(0)}% potential return`}
                </div>
              </button>
              <button
                onClick={() => setPosition(false)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  position === false
                    ? 'border-red-500 bg-red-50 shadow-lg'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-bold text-lg text-red-700">NO</span>
                </div>
                <div className="text-3xl font-bold text-red-600">
                  {noOdds.toFixed(1)}¢
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {noOdds.toFixed(0)}% chance
                </div>
                <div className="text-xs text-red-600 mt-2 font-medium">
                  {noOdds <= 1 ? '9900%+ return' : noOdds >= 99 ? '~0% return' : `${((1 / (noOdds / 100) - 1) * 100).toFixed(0)}% potential return`}
                </div>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Investment Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                className="w-full p-3 pr-16 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-semibold text-gray-600">
                STT
              </span>
            </div>
            <div className="flex gap-2">
              {['0.1', '0.5', '1', '5'].map(preset => (
                <Button
                  key={preset}
                  size="sm"
                  variant="outline"
                  onClick={() => setAmount(preset)}
                >
                  {preset} STT
                </Button>
              ))}
            </div>
          </div>

          {/* Potential Winnings - Polymarket Style */}
          {position !== null && amount && parseFloat(amount) > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">If {position ? 'YES' : 'NO'} wins</div>
                  <div className="text-2xl font-bold text-green-600">
                    +{winnings.profit} STT
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Total Payout</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {winnings.payout || (parseFloat(amount) + parseFloat(winnings.profit)).toFixed(4)} STT
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Multiplier: <span className="font-bold text-indigo-600">{winnings.multiplier}</span>
                </span>
                <span className="text-gray-600">
                  Return: <span className="font-bold text-green-600">+{winnings.returnPct}%</span>
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-blue-100">
                Buy {position ? 'YES' : 'NO'} shares at {position ? yesOdds.toFixed(1) : noOdds.toFixed(1)}¢. If correct, each share pays $1.
              </div>
            </div>
          )}

          {/* Gasless Transaction Info */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-yellow-800">
                <span className="font-semibold">Gasless Transaction:</span> This
                transaction uses account abstraction technology. No gas fees
                required!
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={position === null || !amount || parseFloat(amount) <= 0 || isSubmitting}
              onClick={() => onSubmit(position!, amount)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm Prediction'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
