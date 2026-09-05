/**
 * Create Market Component
 * Form for creating new prediction markets
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useCreateMarket, useReputationScore, useMinReputationToCreate } from '@/hooks/useContracts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Loader2,
  Calendar,
  Tag,
  FileText,
  HelpCircle,
  Sparkles,
  Brain,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Shield,
  TrendingUp,
  Award,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'crypto', label: 'Crypto', icon: '₿' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'politics', label: 'Politics', icon: '🏛️' },
  { value: 'weather', label: 'Weather', icon: '🌤️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'finance', label: 'Finance', icon: '📈' },
  { value: 'other', label: 'Other', icon: '📌' },
];

export default function CreateMarketPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createMarket, isPending, isConfirming, isSuccess, error } =
    useCreateMarket();

  // Reputation hooks
  const { data: reputationScore } = useReputationScore(address);
  const { data: minReputationRequired } = useMinReputationToCreate();
  
  const currentReputation = reputationScore ? Number(reputationScore) : 0;
  const minReputation = minReputationRequired ? Number(minReputationRequired) : 50;
  const hasEnoughReputation = currentReputation >= minReputation;

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('crypto');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [aiOracleEnabled, setAiOracleEnabled] = useState(true);
  const [rules, setRules] = useState('');
  
  // AI Review states
  const [aiReviewStatus, setAiReviewStatus] = useState<'idle' | 'reviewing' | 'reviewed'>('idle');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiApprovalScore, setAiApprovalScore] = useState<number>(0);
  const [showReview, setShowReview] = useState(false);

  const handleAIReview = async () => {
    setAiReviewStatus('reviewing');
    setShowReview(true);
    
    // Simulate AI review (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const suggestions: string[] = [];
    let score = 100;
    
    // Check question clarity
    if (question.length < 20) {
      suggestions.push('Question is too short. Add more context for clarity.');
      score -= 15;
    }
    if (!question.includes('?')) {
      suggestions.push('Question should end with a question mark.');
      score -= 5;
    }
    if (question.toLowerCase().includes('moon') || question.toLowerCase().includes('dump')) {
      suggestions.push('Avoid vague terms like "moon" or "dump". Use specific numbers.');
      score -= 20;
    }
    
    // Check description
    if (description.length < 50) {
      suggestions.push('Description is too brief. Provide more details about resolution criteria.');
      score -= 15;
    }
    if (!description.toLowerCase().includes('source') && category !== 'other') {
      suggestions.push('Consider specifying data sources for verification.');
      score -= 10;
    }
    
    // Check rules
    if (!rules || rules.length < 20) {
      suggestions.push('Add specific rules for market resolution. Example: "Market resolves YES if BTC closes above $50,000 on CoinGecko at 11:59 PM UTC on the end date."');
      score -= 20;
    }
    
    // Check end date
    const endDateTime = new Date(`${endDate}T${endTime}`);
    const hoursDiff = (endDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      suggestions.push('Market duration is too short. Recommend at least 24 hours for fair participation.');
      score -= 15;
    }
    
    // Positive feedback if score is high
    if (score >= 80) {
      suggestions.unshift('✅ Market structure looks good! Minor improvements suggested below.');
    } else if (score >= 60) {
      suggestions.unshift('⚠️ Market needs some improvements for better clarity.');
    } else {
      suggestions.unshift('❌ Market needs significant improvements before approval.');
    }
    
    setAiSuggestions(suggestions);
    setAiApprovalScore(Math.max(0, score));
    setAiReviewStatus('reviewed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    // Require AI review before submission
    if (aiReviewStatus !== 'reviewed') {
      alert('Please review your market with AI before submitting');
      setShowReview(true);
      return;
    }

    if (aiApprovalScore < 50) {
      alert('Market approval score is too low. Please address AI suggestions before submitting.');
      return;
    }

    try {
      const endDateTime = new Date(`${endDate}T${endTime}`);

      if (endDateTime <= new Date()) {
        alert('End date must be in the future');
        return;
      }

      await createMarket({
        question,
        description,
        category,
        endTime: endDateTime,
        aiOracleEnabled,
      });

      // Wait for success
      if (isSuccess) {
        router.push('/markets');
      }
    } catch (_err) {
      // Error handled by hook
    }
  };

  // Set minimum date to tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Create Prediction Market</h1>
        <p className="text-muted-foreground">
          Create a new market for others to predict on. Markets can be resolved
          automatically by our AI Oracle or manually.
        </p>
      </div>

      {/* Reputation Status Card */}
      {isConnected && (
        <Card className={`p-6 mb-6 ${hasEnoughReputation ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${hasEnoughReputation ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
              <Award className={`w-6 h-6 ${hasEnoughReputation ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {hasEnoughReputation ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Eligible to Create Markets
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      Build Reputation to Create Markets
                    </>
                  )}
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Your Reputation: <span className="font-bold">{currentReputation}</span></span>
                    <span>Required: <span className="font-bold">{minReputation}</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${hasEnoughReputation ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min((currentReputation / minReputation) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                
                {!hasEnoughReputation && (
                  <div className="p-3 bg-background/50 rounded-lg">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      How to Earn Reputation:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      <li>• Place predictions on any market: <span className="font-semibold text-foreground">+10 points</span></li>
                      <li>• Win a prediction: <span className="font-semibold text-green-500">+20 bonus points</span></li>
                      <li>• Need {minReputation - currentReputation} more points to create markets</li>
                    </ul>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => router.push('/markets')}
                    >
                      Browse Markets to Start Earning
                    </Button>
                  </div>
                )}
                
                {hasEnoughReputation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    You have enough reputation to create markets. Continue building reputation for higher priority visibility!
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <HelpCircle className="w-4 h-4" />
              Market Question
            </label>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Will Bitcoin reach $100,000 by December 31, 2027?"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific and unambiguous. Good: &ldquo;Will BTC close above $50k on
              Nov 1?&rdquo; Bad: &ldquo;Will BTC moon?&rdquo;
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide context and resolution criteria..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-32"
              required
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Explain what the market is about and how it will be resolved.
              Include sources if applicable.
            </p>
          </div>

          {/* Resolution Rules */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Shield className="w-4 h-4" />
              Resolution Rules <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rules}
              onChange={e => setRules(e.target.value)}
              placeholder="Example: Market resolves YES if Bitcoin closes above $50,000 on CoinGecko at 11:59 PM UTC on the specified end date. Market resolves NO otherwise. In case of exchange downtime, CoinMarketCap will be used as backup source."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-40"
              required
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Important:</strong> Define exact conditions for YES/NO resolution, data sources, 
              edge cases, and backup sources. Clear rules prevent disputes and ensure fair resolution.
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Tag className="w-4 h-4" />
              Category
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-1 transition-all ${
                    category === cat.value
                      ? 'border-primary bg-primary/10 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={minDateStr}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4" />
                End Time (UTC)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* AI Oracle Option */}
          <div className="p-4 border rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiOracleEnabled}
                onChange={e => setAiOracleEnabled(e.target.checked)}
                className="mt-1 w-4 h-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Enable AI Oracle Resolution
                </div>
                <p className="text-sm text-muted-foreground">
                  {aiOracleEnabled ? (
                    <>
                      ✅ This market will be automatically resolved by our AI
                      Oracle using GPT-4 and multiple data sources. The AI will
                      fetch real-world data and provide evidence-backed
                      resolutions.
                    </>
                  ) : (
                    <>
                      ⚠️ You will need to manually resolve this market. Make
                      sure you can provide proof of the outcome.
                    </>
                  )}
                </p>
              </div>
            </label>
          </div>

          {/* AI Review Section */}
          <Card className="p-6 bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-1">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Market Review
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get AI suggestions to improve your market quality
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAIReview}
                disabled={!question || !description || !rules || aiReviewStatus === 'reviewing'}
                variant="outline"
                className="gap-2"
              >
                {aiReviewStatus === 'reviewing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reviewing...
                  </>
                ) : aiReviewStatus === 'reviewed' ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Review Again
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Review Market
                  </>
                )}
              </Button>
            </div>

            {showReview && aiReviewStatus === 'reviewed' && (
              <div className="space-y-4">
                {/* Approval Score */}
                <div className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Approval Score</span>
                    <span className={`text-2xl font-bold ${
                      aiApprovalScore >= 80 ? 'text-green-600' :
                      aiApprovalScore >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {aiApprovalScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        aiApprovalScore >= 80 ? 'bg-green-600' :
                        aiApprovalScore >= 60 ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${aiApprovalScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {aiApprovalScore >= 80 && '✅ Excellent! Market is ready for submission.'}
                    {aiApprovalScore >= 60 && aiApprovalScore < 80 && '⚠️ Good, but improvements recommended.'}
                    {aiApprovalScore < 60 && '❌ Score too low. Address issues before submitting.'}
                  </p>
                </div>

                {/* AI Suggestions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    AI Suggestions
                  </div>
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border text-sm ${
                        suggestion.startsWith('✅') ? 'bg-green-500/5 border-green-500/20' :
                        suggestion.startsWith('⚠️') ? 'bg-yellow-500/5 border-yellow-500/20' :
                        suggestion.startsWith('❌') ? 'bg-red-500/5 border-red-500/20' :
                        'bg-background'
                      }`}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Preview */}
          {question && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Preview</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Question:</strong> {question}
                </p>
                <p>
                  <strong>Category:</strong>{' '}
                  {CATEGORIES.find(c => c.value === category)?.label}
                </p>
                <p>
                  <strong>Ends:</strong>{' '}
                  {endDate && endTime
                    ? new Date(`${endDate}T${endTime}`).toLocaleString()
                    : 'Not set'}
                </p>
                <p>
                  <strong>Resolution:</strong>{' '}
                  {aiOracleEnabled ? '🤖 AI Oracle' : '👤 Manual'}
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">Error: {error.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isConnected || !hasEnoughReputation || isPending || isConfirming || aiReviewStatus !== 'reviewed' || aiApprovalScore < 50}
              className="flex-1 gap-2"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isPending ? 'Confirm in Wallet...' : 'Creating Market...'}
                </>
              ) : !hasEnoughReputation ? (
                <>
                  <Award className="w-4 h-4" />
                  Insufficient Reputation ({currentReputation}/{minReputation})
                </>
              ) : aiReviewStatus === 'reviewed' && aiApprovalScore >= 50 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Market (Approved)
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Review Required
                </>
              )}
            </Button>
          </div>

          {/* Review Status Messages */}
          {aiReviewStatus !== 'reviewed' && question && description && rules && (
            <div className="p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Click &quot;Review Market&quot; to get AI feedback before submitting
              </p>
            </div>
          )}

          {aiReviewStatus === 'reviewed' && aiApprovalScore < 50 && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Market approval score is too low. Please address the AI suggestions above.
              </p>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✅ Market created successfully! Redirecting...
              </p>
            </div>
          )}

          {!isConnected && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ Please connect your wallet to create a market
              </p>
            </div>
          )}
        </form>
      </Card>

      {/* Tips */}
      <Card className="mt-6 p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          Tips for Creating High-Quality Markets
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>🤖 Use AI Review:</strong> Let our AI analyze your market and suggest improvements
          </li>
          <li>
            <strong>📋 Define Clear Rules:</strong> Specify exact resolution criteria, data sources, and edge cases
          </li>
          <li>
            <strong>🎯 Be Specific:</strong> &ldquo;BTC above $50k&rdquo; not &ldquo;BTC moon&rdquo; - avoid vague terms
          </li>
          <li>
            <strong>📊 Cite Sources:</strong> Mention where data will come from (CoinGecko, CoinMarketCap, etc.)
          </li>
          <li>
            <strong>⏰ Reasonable Timeline:</strong> At least 24 hours recommended for fair participation
          </li>
          <li>
            <strong>✨ Choose AI Oracle:</strong> For crypto/sports markets with clear, verifiable data sources
          </li>
          <li>
            <strong>🔍 Cover Edge Cases:</strong> What happens if data source is unavailable? Define backups
          </li>
          <li>
            <strong>🎬 Popular Topics:</strong> Markets on trending topics get more liquidity and engagement
          </li>
        </ul>
        
        <div className="mt-4 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
          <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">
            💡 Pro Tip: Higher approval scores attract more traders!
          </p>
          <p className="text-xs text-muted-foreground">
            Markets with 80+ approval scores are featured and get priority visibility on the platform.
          </p>
        </div>
      </Card>
    </div>
  );
}
