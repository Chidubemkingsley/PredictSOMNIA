'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MarketCard } from '@/components/MarketCard';
import { PredictionModal } from '@/components/PredictionModal';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { calculateMarketOdds } from '@/lib/market-data';
import { Market, MarketCategoryInfo } from '@/types/market';
import {
  TrendingUp,
  Zap,
  Shield,
  Sparkles,
  Search,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAllMarkets } from '@/hooks/useContracts';
import { useX402Bet } from '@/hooks/useX402Bet';
import { useRouter } from 'next/navigation';
import { parseEther, formatEther } from 'viem';

export default function HomePage() {
  const router = useRouter();
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [categories] = useState<MarketCategoryInfo[]>([
    { id: 'all', name: 'All Markets', icon: '🎯', count: 0 },
    { id: 'Cryptocurrency', name: 'Crypto', icon: '₿', count: 0 },
    { id: 'Movies', name: 'Movies', icon: '🎬', count: 0 },
    { id: 'Music', name: 'Music', icon: '🎵', count: 0 },
    { id: 'Relationships', name: 'Relationships', icon: '💕', count: 0 },
    { id: 'Entertainment', name: 'Entertainment', icon: '🌟', count: 0 },
    { id: 'DeFi', name: 'DeFi', icon: '💎', count: 0 },
    { id: 'NFT', name: 'NFT', icon: '🖼️', count: 0 },
    { id: 'Blockchain', name: 'Blockchain', icon: '⛓️', count: 0 },
    { id: 'Technology', name: 'Technology', icon: '💻', count: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const marketsLoadedRef = useRef(false); // Prevent infinite loop

  // X402 Gasless Betting hook
  const { placeBetGasless, isPending: isBetting, error: _betError } = useX402Bet();
  const [isSuccess, setIsSuccess] = useState(false);

  // Get ALL markets from blockchain using batch query
  const { markets: blockchainMarkets, marketCount, isLoading: isLoadingMarkets, error: _marketsError } = useAllMarkets();

  // Convert blockchain market data to Market format for display
  useEffect(() => {
    if (marketsLoadedRef.current && markets.length > 0) {
      return; // Already loaded
    }

    if (blockchainMarkets.length > 0) {
      const convertedMarkets: Market[] = blockchainMarkets.map((m) => {
        const { yesOdds, noOdds } = calculateMarketOdds(m.totalYesAmount, m.totalNoAmount);
        const totalVolume = m.totalYesAmount + m.totalNoAmount;
        const totalPoolNum = Number(formatEther(totalVolume));
        return {
          id: m.id.toString(),
          question: m.question,
          description: m.description,
          category: m.category,
          creator: m.creator,
          endTime: m.endTime,
          totalYesAmount: m.totalYesAmount,
          totalNoAmount: m.totalNoAmount,
          resolved: m.resolved,
          outcome: m.outcome,
          resolvedAt: m.resolvedAt,
          aiOracleEnabled: m.aiOracleEnabled,
          yesOdds,
          noOdds,
          totalVolume,
          participantCount: totalPoolNum > 0 ? Math.floor(totalPoolNum * 100) + 1 : 0, // deterministic from volume (was Math.random)
        };
      });
      setMarkets(convertedMarkets);
      setLoading(false);
      setError(null);
      marketsLoadedRef.current = true;
    } else if (!isLoadingMarkets && marketCount > 0) {
      // Still loading
    } else if (!isLoadingMarkets && marketCount === 0) {
      setMarkets([]);
      setLoading(false);
      setError('No markets available. Please ensure you are connected to Somnia Shannon Testnet.');
    }
  }, [blockchainMarkets, marketCount, isLoadingMarkets, markets.length]);

  // Timeout fallback - stop loading after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  const filteredForDisplay = markets.filter(m => !(m.question.includes('2025') && new Date().getFullYear() >= 2026));
  const selectedMarket = filteredForDisplay.find(m => m.id === selectedMarketId);
  const filteredMarkets = filteredForDisplay.filter(market => {
    const matchesCategory =
      selectedCategory === 'all' || market.category === selectedCategory;
    const matchesSearch =
      market.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Limit homepage to first 6 markets for better organization
  const displayedMarkets = filteredMarkets.slice(0, 6);
  const hasMoreMarkets = filteredMarkets.length > 6;

  // Calculate category counts — hide 2025 past
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return filteredForDisplay.length;
    return filteredForDisplay.filter(m => m.category === categoryId).length;
  };

  const handlePredictionSubmit = async (position: boolean, amount: string) => {
    if (!selectedMarketId) return;
    
    try {
      // Convert amount string to bigint wei
      const amountInWei = parseEther(amount);
      
      // Use X402 gasless betting
      const result = await placeBetGasless(
        parseInt(selectedMarketId), 
        position, 
        amountInWei
      );
      
      if (result.success) {
        setIsSuccess(true);
        // Close modal after successful transaction
        setSelectedMarketId(null);
        // Navigate to market detail page to see the result
        router.push(`/markets/${selectedMarketId}`);
      } else {
        console.error('Gasless bet failed:', result.error);
        // Keep modal open so user can retry
      }
    } catch (error) {
      console.error('Failed to place bet:', error);
      // Keep modal open so user can retry
    }
  };

  // Close modal and redirect to market when transaction succeeds
  useEffect(() => {
    if (isSuccess && selectedMarketId) {
      setTimeout(() => {
        setSelectedMarketId(null);
        router.push(`/markets/${selectedMarketId}`);
      }, 2000);
    }
  }, [isSuccess, selectedMarketId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        {/* Demo Mode Banner */}
        <DemoModeBanner />
        
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-800">
              Powered by Somnia Network
            </span>
          </div>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Create Your Prediction
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            From Crypto & DeFi to Movies, Music & Celebrity Relationships
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-3xl mx-auto">
            Predict anything with x402 gasless technology. Create markets for crypto enthusiasts, entertainment fans, sports bettors, and niche communities. Every prediction is backed by AI-verified resolution rules and transparent on-chain data.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link href="/create/new">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg text-lg px-8 py-6 h-auto gap-3">
                <Sparkles className="h-6 w-6" />
                Create Prediction
              </Button>
            </Link>
            <Link href="/markets">
              <Button size="lg" variant="outline" className="gap-2 text-lg px-8 py-6 h-auto">
                <TrendingUp className="h-5 w-5" />
                Browse Markets
              </Button>
            </Link>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <div className="p-6 bg-white/80 backdrop-blur rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all shadow-lg">
              <CheckCircle className="h-10 w-10 text-purple-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2 text-lg">Clear Rules Required</h3>
              <p className="text-sm text-gray-600">
                Every prediction must have verifiable resolution criteria reviewed by AI
              </p>
            </div>
            <div className="p-6 bg-white/80 backdrop-blur rounded-xl border-2 border-green-200 hover:border-green-400 transition-all shadow-lg">
              <Brain className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2 text-lg">
                AI Verification
              </h3>
              <p className="text-sm text-gray-600">
                AI oracle checks data sources and ensures fair resolution in minutes
              </p>
            </div>
            <div className="p-6 bg-white/80 backdrop-blur rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all shadow-lg">
              <Zap className="h-10 w-10 text-blue-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 mb-2 text-lg">
                x402 Gasless Trading
              </h3>
              <p className="text-sm text-gray-600">Pay-to-predict without transaction fees using HTTP 402 protocol</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>AI-Assisted Oracles</CardTitle>
              <CardDescription>
                Fast market resolution with AI-powered data analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Our advanced AI oracle system analyzes multiple data sources to
                provide faster, more accurate market resolutions compared to
                traditional methods.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>x402 Gasless Protocol</CardTitle>
              <CardDescription>
                Pay-to-predict without blockchain transaction fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Using HTTP 402 payment protocol, our facilitator handles gas fees for you. 
                Just sign transactions and trade instantly—no native tokens needed, no complex wallets.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Markets for Everyone</CardTitle>
              <CardDescription>
                Diverse categories from crypto to pop culture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Predict Bitcoin prices, DeFi protocols, movie releases, celebrity relationships, 
                music charts, and more. We serve both crypto degens and mainstream audiences with 
                markets that matter to your community.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Market Categories */}
        <div className="mb-12">
          <div className="mb-6">
            <h3 className="text-3xl font-bold mb-2">Active Prediction Markets</h3>
            <p className="text-gray-600 text-lg">
              From crypto whales to movie buffs—explore markets tailored for both niche communities and mainstream audiences. 
              <span className="font-medium text-purple-600"> Trade gaslessly with x402</span>, powered by AI-verified resolution rules.
            </p>
          </div>
          
          {/* Category Filter */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
            {/* Header with All Markets button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`flex-1 px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className="text-lg">🎯</span>
                <span>All Markets</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === 'all' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {getCategoryCount('all')}
                </span>
              </button>
              <button
                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                className="ml-3 px-4 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 font-medium"
              >
                <span>Categories</span>
                {categoriesExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Collapsible Categories Grid */}
            {categoriesExpanded && (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {categories.filter(cat => cat.id !== 'all').map(cat => {
                  const count = getCategoryCount(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setCategoriesExpanded(false); // Auto-collapse after selection
                      }}
                      className={`px-4 py-3 rounded-lg font-medium transition-all shadow-sm flex flex-col items-center gap-2 ${
                        selectedCategory === cat.id
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-200 ring-2 ring-purple-300'
                          : count > 0 
                            ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-purple-300'
                            : 'bg-gray-50 text-gray-400 border border-gray-100 cursor-not-allowed opacity-60'
                      }`}
                      disabled={count === 0}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-sm">{cat.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === cat.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected category indicator (when not 'all') */}
            {selectedCategory !== 'all' && (
              <div className="px-4 py-3 bg-purple-50 border-t border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-purple-700 font-medium">
                    Showing: {categories.find(c => c.id === selectedCategory)?.icon}{' '}
                    {categories.find(c => c.id === selectedCategory)?.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 text-purple-700">
                    {getCategoryCount(selectedCategory)} markets
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search markets by keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm text-lg"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Results Count */}
        {!loading && !error && filteredMarkets.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                {selectedCategory === 'all' ? (
                  <>Featured Markets <span className="text-gray-500 font-normal">(showing {displayedMarkets.length} of {filteredMarkets.length})</span></>
                ) : (
                  <>
                    {categories.find(c => c.id === selectedCategory)?.icon} {categories.find(c => c.id === selectedCategory)?.name} Markets 
                    <span className="text-gray-500 font-normal">(showing {displayedMarkets.length} of {filteredMarkets.length})</span>
                  </>
                )}
              </h4>
              {searchQuery && (
                <span className="text-sm text-gray-600">
                  Matching &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
          </div>
        )}

        {/* Markets Display */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading markets...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔍</span>
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">No markets found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery ? (
                  <>Try adjusting your search or browse all markets</>
                ) : (
                  <>No markets available in this category yet</>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Markets Grid - Show only first 6 on homepage */}
            <div className="grid md:grid-cols-2 gap-6">
              {displayedMarkets.map(market => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onPredict={setSelectedMarketId}
                />
              ))}
            </div>
            
            {/* View All Markets Button */}
            {hasMoreMarkets && (
              <div className="text-center pt-8 pb-4">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border-2 border-purple-200">
                    <h3 className="text-2xl font-bold mb-2">
                      {filteredMarkets.length - displayedMarkets.length} More Markets Available
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Explore all {filteredMarkets.length} markets across Crypto, DeFi, Movies, Music, Relationships & more
                    </p>
                    <Link
                      href="/markets"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl text-lg font-semibold"
                    >
                      <TrendingUp className="w-5 h-5" />
                      View All {filteredMarkets.length} Markets
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && filteredMarkets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No markets found matching your criteria.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p className="mb-2">
            Decentralized Prediction Markets • Powered by Somnia Network
          </p>
          <p className="text-xs">
            AI Oracles • Gasless Transactions • On-Chain Reputation
          </p>
        </div>
      </footer>

      {/* Prediction Modal */}
      {selectedMarket && (
        <PredictionModal
          marketId={selectedMarket.id}
          question={selectedMarket.question}
          yesOdds={
            calculateMarketOdds(
              selectedMarket.totalYesAmount,
              selectedMarket.totalNoAmount
            ).yesOdds
          }
          noOdds={
            calculateMarketOdds(
              selectedMarket.totalYesAmount,
              selectedMarket.totalNoAmount
            ).noOdds
          }
          onClose={() => setSelectedMarketId(null)}
          onSubmit={handlePredictionSubmit}
          isSubmitting={isBetting}
        />
      )}
    </div>
  );
}
