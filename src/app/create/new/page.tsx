/**
 * Modern iOS-Style Market Creation Wizard
 * Clean, simple, and fun market creation experience
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useCreateMarket, useReputationScore, useMinReputationToCreate } from '@/hooks/useContracts';
import { useCreateMarketGasless } from '@/hooks/useX402Extended';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';

// Crypto & DeFi focused categories
const CATEGORIES = [
  {
    id: 'price',
    name: 'Price Prediction',
    icon: '📈',
    color: 'from-green-500 to-emerald-500',
    description: 'Token price movements and targets',
    templates: [
      {
        question: 'Will STT reach $1,000 by end of 2027?',
        description: 'STT price prediction. Will it hit $1,000 by December 31, 2027?',
        suggestedEnd: '2027-12-31'
      },
      {
        question: 'Will Bitcoin break $150,000 in Q1 2026?',
        description: 'Bitcoin bull run prediction for early 2026. Will BTC reach new all-time high above $150k?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will ETH stay above $4,000 for 30 consecutive days?',
        description: 'Ethereum price stability prediction. Will ETH maintain above $4,000 for a full month?',
        suggestedEnd: '2026-02-28'
      },
      {
        question: 'Will SOL outperform ETH in the next quarter?',
        description: 'Solana vs Ethereum performance comparison. Which will have better % gains?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will any token in the top 10 drop below $1 by year end?',
        description: 'Market crash prediction for major tokens. Will a top 10 token fall under $1?',
        suggestedEnd: '2027-12-31'
      }
    ]
  },
  {
    id: 'defi',
    name: 'DeFi Protocol',
    icon: '🏦',
    color: 'from-blue-500 to-cyan-500',
    description: 'DeFi TVL, yields, and protocol metrics',
    templates: [
      {
        question: 'Will PancakeSwap TVL exceed $5 billion by Q2 2026?',
        description: 'PancakeSwap growth prediction. Will Total Value Locked reach $5B?',
        suggestedEnd: '2026-06-30'
      },
      {
        question: 'Will any Somnia Network DEX surpass Uniswap in daily volume?',
        description: 'DEX competition prediction. Will a Somnia DEX flip Uniswap in 24h trading volume?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will stablecoin yields on Venus drop below 5% APY?',
        description: 'DeFi yield prediction for Venus Protocol. Will USDT/USDC yields fall under 5%?',
        suggestedEnd: '2026-02-28'
      },
      {
        question: 'Will a new DeFi protocol on Somnia reach $1B TVL in 2026?',
        description: 'New protocol growth prediction. Will any newly launched Somnia DeFi hit $1B TVL?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will Somnia Network DeFi TVL overtake Ethereum by end of 2026?',
        description: 'Chain dominance prediction. Will Somnia Shannon total DeFi TVL exceed Ethereum?',
        suggestedEnd: '2026-12-31'
      }
    ]
  },
  {
    id: 'nft',
    name: 'NFT & Gaming',
    icon: '🎮',
    color: 'from-purple-500 to-pink-500',
    description: 'NFT collections, gaming tokens, and metaverse',
    templates: [
      {
        question: 'Will BAYC floor price recover to 50 ETH by mid-2026?',
        description: 'Bored Ape Yacht Club NFT floor price prediction. Will it reach 50 ETH?',
        suggestedEnd: '2026-06-30'
      },
      {
        question: 'Will a Somnia gaming token reach top 50 by market cap?',
        description: 'GameFi growth prediction. Will any Somnia Network gaming token enter top 50?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will NFT trading volume on Somnia exceed Ethereum in a single month?',
        description: 'NFT marketplace competition. Will Somnia Network NFT volume surpass ETH for 30 days?',
        suggestedEnd: '2026-06-30'
      },
      {
        question: 'Will a play-to-earn game on Somnia hit 1 million daily users?',
        description: 'GameFi adoption prediction. Will any P2E game on Somnia reach 1M DAU?',
        suggestedEnd: '2026-12-31'
      }
    ]
  },
  {
    id: 'altcoins',
    name: 'Altcoin Season',
    icon: '🚀',
    color: 'from-orange-500 to-red-500',
    description: 'Altcoin pumps, new launches, and meme coins',
    templates: [
      {
        question: 'Will any new token do a 100x in Q1 2026?',
        description: 'Moonshot prediction. Will a token launched in Q1 2026 achieve 100x gains?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will meme coins collectively reach $100B market cap?',
        description: 'Meme coin market prediction. Will all meme coins combined exceed $100B?',
        suggestedEnd: '2026-06-30'
      },
      {
        question: 'Will PEPE overtake DOGE in market cap?',
        description: 'Meme coin flippening. Will Pepe surpass Dogecoin in total market capitalization?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will Somnia Network have more daily active addresses than Ethereum?',
        description: 'Network activity prediction. Will Somnia daily active users exceed Ethereum?',
        suggestedEnd: '2026-03-31'
      }
    ]
  },
  {
    id: 'events',
    name: 'Crypto Events',
    icon: '📅',
    color: 'from-indigo-500 to-purple-500',
    description: 'Exchange listings, token unlocks, and launches',
    templates: [
      {
        question: 'Will a major CEX list PEPE by Q2 2026?',
        description: 'Exchange listing prediction. Will Coinbase or Binance list PEPE token?',
        suggestedEnd: '2026-06-30'
      },
      {
        question: 'Will Bitcoin ETF inflows exceed $10B in Q1 2026?',
        description: 'Institutional adoption prediction. Will spot Bitcoin ETFs see $10B+ net inflows?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will a token unlock crash price by more than 50%?',
        description: 'Token unlock impact prediction. Will a major unlock cause 50%+ price drop?',
        suggestedEnd: '2026-02-28'
      },
      {
        question: 'Will PancakeSwap announce a major partnership with Binance?',
        description: 'Partnership prediction. Will PancakeSwap and Binance announce strategic collaboration?',
        suggestedEnd: '2026-06-30'
      }
    ]
  },
  {
    id: 'music',
    name: 'Music & Artists',
    icon: '🎵',
    color: 'from-pink-500 to-rose-500',
    description: 'Album releases, chart positions, and awards',
    templates: [
      {
        question: 'Will Taylor Swift release a new album in 2026?',
        description: 'Album release prediction for major artist. Will there be a new Taylor Swift album next year?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will Bad Bunny have a #1 Billboard hit in Q1 2026?',
        description: 'Chart performance prediction. Will Bad Bunny top Billboard Hot 100 in early 2026?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will BTS announce a reunion tour by end of 2026?',
        description: 'K-Pop reunion prediction. Will BTS announce comeback tour dates?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will Spotify announce over 1 billion monthly active users?',
        description: 'Music streaming milestone. Will Spotify reach 1B MAU by year end?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will a female artist win Album of the Year at Grammys 2026?',
        description: 'Grammy Awards prediction for Album of the Year category.',
        suggestedEnd: '2026-02-28'
      }
    ]
  },
  {
    id: 'movies',
    name: 'Movies & TV',
    icon: '🎬',
    color: 'from-purple-500 to-indigo-500',
    description: 'Box office, streaming, and entertainment',
    templates: [
      {
        question: 'Will Avatar 3 gross over $2 billion worldwide?',
        description: 'Box office prediction. Will Avatar 3 surpass $2B in global box office?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will Netflix lose susomniaribers in Q1 2026?',
        description: 'Streaming service prediction. Will Netflix report negative susomniariber growth?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will Dune 3 be announced by end of 2026?',
        description: 'Sequel announcement prediction. Will Warner Bros officially announce Dune Part Three?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will a superhero movie win Best Picture at Oscars 2027?',
        description: 'Academy Awards prediction. Will a comic book film win Best Picture?',
        suggestedEnd: '2027-03-31'
      },
      {
        question: 'Will Stranger Things Season 5 release in 2026?',
        description: 'Netflix series release prediction. Will the final season drop next year?',
        suggestedEnd: '2026-12-31'
      }
    ]
  },
  {
    id: 'relationships',
    name: 'Celebrity Couples',
    icon: '💑',
    color: 'from-red-500 to-pink-500',
    description: 'Celebrity relationships, breakups, and drama',
    templates: [
      {
        question: 'Will Taylor Swift and Travis Kelce get engaged in 2026?',
        description: 'Celebrity engagement prediction. Will they announce an engagement?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will Kim Kardashian start dating someone new by Q2 2026?',
        description: 'Celebrity dating prediction. Will Kim K be in a new public relationship?',
        suggestedEnd: '2026-06-30'
      },
      {
        question: 'Will a major celebrity couple announce divorce in Q1 2026?',
        description: 'Hollywood breakup prediction. Will a high-profile couple split?',
        suggestedEnd: '2026-03-31'
      },
      {
        question: 'Will Bad Bunny get married in 2026?',
        description: 'Latin music star wedding prediction. Will Bad Bunny tie the knot?',
        suggestedEnd: '2026-12-31'
      },
      {
        question: 'Will a celebrity baby announcement get 10M+ likes on Instagram?',
        description: 'Social media milestone prediction. Will a baby announcement go mega-viral?',
        suggestedEnd: '2026-12-31'
      }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Market',
    icon: '✨',
    color: 'from-yellow-500 to-amber-500',
    description: 'Create your own unique prediction',
    templates: [
      {
        question: 'Create your own prediction...',
        description: 'Start from scratch with your custom market idea',
        suggestedEnd: ''
      }
    ]
  }
];

export default function CreateMarketWizard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createMarket, isPending, isConfirming } = useCreateMarket();
  const { createMarketGasless, isPending: isGaslessPending } = useCreateMarketGasless();
  
  // Reputation
  const { data: reputationScore } = useReputationScore(address);
  const { data: minReputationRequired } = useMinReputationToCreate();
  const currentReputation = reputationScore ? Number(reputationScore) : 0;
  const minReputation = minReputationRequired ? Number(minReputationRequired) : 50;
  const hasEnoughReputation = currentReputation >= minReputation;

  // Wizard state
  const [step, setStep] = useState(1); // 1: Category, 2: Template, 3: Details, 4: Review
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [_selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [_customMode, setCustomMode] = useState(false);
  
  // Form data
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('12:00');
  const [aiOracleEnabled, setAiOracleEnabled] = useState(true);
  const [useGasless, setUseGasless] = useState(true);

  const handleCategorySelect = (category: typeof CATEGORIES[0]) => {
    setSelectedCategory(category);
    if (category.id === 'custom') {
      setCustomMode(true);
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setQuestion(template.question);
    setDescription(template.description);
    if (template.suggestedEnd) {
      setEndDate(template.suggestedEnd);
    }
    setStep(3);
  };

  const handleCustom = () => {
    setCustomMode(true);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!hasEnoughReputation) return;
    
    try {
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      if (useGasless) {
        const result = await createMarketGasless({
          question,
          description,
          category: selectedCategory?.id || 'other',
          endTime: endDateTime,
          aiOracleEnabled,
        });
        if (result.success) {
          router.push('/markets');
        }
      } else {
        await createMarket({
          question,
          description,
          category: selectedCategory?.id || 'other',
          endTime: endDateTime,
          aiOracleEnabled,
        });
        router.push('/markets');
      }
    } catch (error) {
      console.error('Failed to create market:', error);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Create Your Prediction</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Connect wallet to create predictions with AI-verified rules
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Set clear resolution criteria, get AI approval, launch your market
          </p>
        </Card>
      </div>
    );
  }

  // Insufficient reputation state
  if (!hasEnoughReputation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-0 shadow-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Award className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-center">Build Your Reputation First</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-2 text-center">
            You need {minReputation} reputation to create markets with rules
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
            This ensures quality predictions with clear resolution criteria
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Your Progress</span>
                <span className="font-bold text-indigo-600">{currentReputation}/{minReputation}</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min((currentReputation / minReputation) * 100, 100)}%` }}
                />
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-xl">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                How to Earn Reputation:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>Place predictions: <span className="font-bold text-indigo-600">+10 points</span></span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span>Win predictions: <span className="font-bold text-purple-600">+20 bonus</span></span>
                </li>
              </ul>
            </div>
          </div>
          
          <Button
            onClick={() => router.push('/markets')}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-lg h-12 text-base font-semibold"
          >
            Browse Markets
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    s === step ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500' :
                    s < step ? 'w-2 bg-indigo-400' : 'w-2 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full mb-4">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">AI-Verified Rules Required</span>
              </div>
              <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create Your Prediction
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
                Choose category, set clear rules, get AI verification
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                All predictions require verifiable resolution criteria with specific data sources and deadlines
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {CATEGORIES.map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="group relative p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-transparent hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800 overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <div className="relative flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>
                      {category.icon}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {category.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {category.templates.length} {category.id === 'custom' ? 'option' : 'templates'}
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Template Selection */}
        {step === 2 && selectedCategory && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center text-4xl mx-auto mb-4 shadow-xl`}>
                {selectedCategory.icon}
              </div>
              <h1 className="text-4xl font-bold mb-3">{selectedCategory.name}</h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Choose a template or start from scratch
              </p>
            </div>

            <div className="space-y-3">
              {selectedCategory.templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 group-hover:text-indigo-600 transition-colors">
                        {template.question}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Zap className="w-3 h-3" />
                        <span>Quick setup with AI</span>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </button>
              ))}

              <button
                onClick={handleCustom}
                className="w-full p-6 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all duration-300"
              >
                <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-300 hover:text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Create Custom Market</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-3">Market Details</h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Fill in the specifics for your prediction
              </p>
            </div>

            <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-xl">
              <div className="space-y-6">
                {/* Question */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Question <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What will happen?"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-colors bg-white dark:bg-gray-700"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide more details about this prediction..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-colors resize-none bg-white dark:bg-gray-700"
                  />
                </div>

                {/* Deadline */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-colors bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:outline-none transition-colors bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* AI Oracle */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiOracleEnabled}
                      onChange={(e) => setAiOracleEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-indigo-500 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        AI Oracle Resolution
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Let AI automatically resolve this market (recommended)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(4)}
                disabled={!question || !endDate}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-lg h-14 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-3">Review Your Market</h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg">
                Everything looks good? Let&apos;s create it!
              </p>
            </div>

            <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-xl">
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Category</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedCategory?.icon}</span>
                    <p className="text-xl font-semibold">{selectedCategory?.name}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Question</p>
                  <p className="text-xl font-semibold">{question}</p>
                </div>

                {description && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                    <p className="text-gray-700 dark:text-gray-300">{description}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ends On</p>
                    <p className="font-semibold">
                      {new Date(`${endDate}T${endTime}`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Resolution</p>
                    <p className="font-semibold flex items-center gap-2">
                      {aiOracleEnabled ? (
                        <>
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          AI Oracle
                        </>
                      ) : (
                        'Manual'
                      )}
                    </p>
                  </div>
                </div>

                {!aiOracleEnabled && (
                  <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-semibold mb-1">Manual Resolution Required</p>
                        <p>You&apos;ll need to manually resolve this market after it ends.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="gasless-create"
                  checked={useGasless}
                  onChange={(e) => setUseGasless(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="gasless-create" className="text-sm cursor-pointer flex items-center gap-2">
                  🆓 <span className="font-medium">Create Gaslessly (No transaction fee)</span>
                </label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isPending || isConfirming || isGaslessPending}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 shadow-lg h-14 text-lg font-semibold"
          >
            {(isPending || isConfirming || isGaslessPending) ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isPending ? 'Confirm in Wallet...' : (isGaslessPending ? '🆓 Creating Gaslessly...' : 'Creating...')}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                {useGasless && '🆓 '}Create Market
              </>
            )}
          </Button>
          </div>
        )}
      </div>
    </div>
  );
}
