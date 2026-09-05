'use client';

/**
 * AI Market Analytics Component
 *
 * Shows AI-powered predictions and trading signals
 * Helps users make informed decisions
 */

import { useEffect, useState } from 'react';
import { aiOracle } from '@/lib/ai-oracle';
import { TrendingUp, TrendingDown, Minus, Brain, Sparkles } from 'lucide-react';

interface MarketAnalysis {
  probability: number;
  reasoning: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  recommendation: string;
  keyFactors: string[];
}

interface AIAnalyticsProps {
  marketId: string;
  marketData: {
    question: string;
    context?: string;
    deadline: number;
    yesPool: string;
    noPool: string;
    category?: string;
  };
  showRecommendation?: boolean;
}

export function AIMarketAnalytics({
  marketId,
  marketData,
  showRecommendation = true,
}: AIAnalyticsProps) {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const analyzeMarket = async () => {
    setLoading(true);
    try {
      // Get AI prediction with category for better data fetching
      const prediction = await aiOracle.predictOutcome({
        question: marketData.question,
        context: marketData.context || '',
        deadline: marketData.deadline,
        category: marketData.category,
      });

      // Calculate market metrics
      const yesPool = parseFloat(marketData.yesPool) || 500;
      const noPool = parseFloat(marketData.noPool) || 500;
      const totalPool = yesPool + noPool;
      const marketProbability = yesPool / totalPool;

      // Determine if there's an opportunity
      const priceDiff = Math.abs(prediction.probability - marketProbability);
      const _hasOpportunity = priceDiff > 0.1; // 10% difference

      // Build key factors from external data if available
      const factors = generateKeyFactors(marketData);
      if (prediction.externalData) {
        factors.unshift(`📊 ${prediction.externalData.source}: Real-time data integrated`);
      }

      const analysis: MarketAnalysis = {
        probability: prediction.probability,
        reasoning: prediction.reasoning,
        signal: prediction.signal,
        confidence: Math.min(0.95, 0.7 + Math.abs(prediction.probability - 0.5) * 0.5), // Higher confidence for decisive predictions
        recommendation: generateRecommendation(
          prediction.probability,
          marketProbability,
          prediction.signal
        ),
        keyFactors: factors,
      };

      setAnalysis(analysis);
    } catch (_error) {
      // Analysis failed
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendation = (
    aiProb: number,
    marketProb: number,
    _signal: string
  ): string => {
    const diff = aiProb - marketProb;

    if (Math.abs(diff) < 0.05) {
      return 'Market is fairly priced. Consider holding position.';
    }

    if (diff > 0.1) {
      return 'AI predicts higher probability than market price. Consider buying YES shares.';
    }

    if (diff < -0.1) {
      return 'AI predicts lower probability than market price. Consider buying NO shares.';
    }

    return 'Market appears balanced. Wait for better entry point.';
  };

  useEffect(() => {
    analyzeMarket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketId]);

  const generateKeyFactors = (market: typeof marketData): string[] => {
    const factors: string[] = [];

    // Time-based factors
    const daysUntilDeadline =
      (market.deadline - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilDeadline < 7) {
      factors.push('⏰ Deadline approaching - high urgency');
    } else if (daysUntilDeadline > 30) {
      factors.push('📅 Long timeframe - more uncertainty');
    }

    // Category-based factors
    if (market.category) {
      factors.push(`🎯 ${market.category} vertical analysis enabled`);
    }

    // Pool size factors
    const totalLiquidity =
      parseFloat(market.yesPool) + parseFloat(market.noPool);
    if (totalLiquidity > 5000) {
      factors.push('💰 High liquidity - stable pricing');
    } else if (totalLiquidity < 1000) {
      factors.push('⚠️ Low liquidity - volatile pricing');
    }

    // AI confidence factors
    factors.push('🤖 AI model: Claude-powered analysis');

    return factors;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-6 w-6 text-purple-600 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-purple-200/50 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-purple-200/50 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-purple-200/50 rounded animate-pulse w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const SignalIcon =
    analysis.signal === 'bullish'
      ? TrendingUp
      : analysis.signal === 'bearish'
        ? TrendingDown
        : Minus;

  const signalColor =
    analysis.signal === 'bullish'
      ? 'text-green-600'
      : analysis.signal === 'bearish'
        ? 'text-red-600'
        : 'text-gray-600';

  const signalBg =
    analysis.signal === 'bullish'
      ? 'bg-green-100'
      : analysis.signal === 'bearish'
        ? 'bg-red-100'
        : 'bg-gray-100';

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            AI Market Analysis
          </h3>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${signalBg}`}
        >
          <SignalIcon className={`h-4 w-4 ${signalColor}`} />
          <span className={`text-sm font-medium ${signalColor} uppercase`}>
            {analysis.signal}
          </span>
        </div>
      </div>

      {/* AI Prediction */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-purple-600">
            {(analysis.probability * 100).toFixed(1)}%
          </span>
          <span className="text-sm text-gray-600">AI Probability</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${analysis.probability * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>0% (NO)</span>
          <span>100% (YES)</span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-4 p-3 bg-white/50 rounded-lg">
        <p className="text-sm text-gray-700 leading-relaxed">
          <Sparkles className="inline h-4 w-4 text-yellow-500 mr-1" />
          {analysis.reasoning}
        </p>
      </div>

      {/* Key Factors */}
      {analysis.keyFactors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
            Key Factors
          </h4>
          <div className="space-y-1.5">
            {analysis.keyFactors.map((factor, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 flex items-start gap-2"
              >
                <span className="text-purple-500">•</span>
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {showRecommendation && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Brain className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-purple-900 mb-1">
                AI Recommendation
              </h4>
              <p className="text-sm text-purple-700">
                {analysis.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Badge */}
      <div className="mt-4 pt-3 border-t border-purple-200 flex items-center justify-between text-xs text-gray-500">
        <span>Confidence: {(analysis.confidence * 100).toFixed(0)}%</span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Powered by Claude AI
        </span>
      </div>
    </div>
  );
}

/**
 * Compact AI Signal Badge (for market cards)
 */
export function AISignalBadge({
  probability,
  signal,
}: {
  probability: number;
  signal: 'bullish' | 'bearish' | 'neutral';
}) {
  const SignalIcon =
    signal === 'bullish'
      ? TrendingUp
      : signal === 'bearish'
        ? TrendingDown
        : Minus;

  const signalColor =
    signal === 'bullish'
      ? 'text-green-600'
      : signal === 'bearish'
        ? 'text-red-600'
        : 'text-gray-600';

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded-full">
      <Brain className="h-3 w-3 text-purple-600" />
      <span className="text-xs font-medium text-purple-900">
        AI: {(probability * 100).toFixed(0)}%
      </span>
      <SignalIcon className={`h-3 w-3 ${signalColor}`} />
    </div>
  );
}
