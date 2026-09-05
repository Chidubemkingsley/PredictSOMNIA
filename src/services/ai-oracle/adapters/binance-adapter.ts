/**
 * Binance Data Source Adapter
 * Fetches real-time cryptocurrency data from Binance API
 */

import { BaseAdapter } from './base-adapter';
import {
  ResolutionQuery,
  SourceData,
  MarketCategory,
  CryptoData,
  OracleError,
  ErrorCode,
} from '../types';

interface Binance24hrStats {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
}

interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
}

export class BinanceAdapter extends BaseAdapter {
  public category = [MarketCategory.CRYPTO];
  public priority = 2; // Second priority after CoinGecko

  constructor(apiKey?: string, secretKey?: string) {
    super({
      name: 'Binance',
      baseUrl: 'https://api.binance.com/api/v3',
      apiKey: apiKey,
      secretKey: secretKey,
      timeout: 10000,
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 5000,
      },
      rateLimit: {
        requestsPerMinute: 1200,
        requestsPerDay: 100000,
      },
      cacheEnabled: true,
      cacheTTL: 30, // 30 seconds cache (more frequent updates)
    });
  }

  /**
   * Fetch data for a resolution query
   */
  async fetchData(query: ResolutionQuery): Promise<SourceData> {
    const { market } = query;

    // Extract trading pair from market question
    const symbol = this.extractTradingSymbol(market.question);
    if (!symbol) {
      throw new OracleError(
        'Could not extract trading symbol from market question',
        ErrorCode.INVALID_MARKET,
        { question: market.question }
      );
    }

    // Determine if we need historical data
    const needsHistorical = this.needsHistoricalData(market.question);
    const targetDate = this.extractTargetDate(market.question);

    let data: CryptoData;

    if (needsHistorical && targetDate) {
      data = await this.getHistoricalPrice(symbol, targetDate);
    } else {
      data = await this.getCurrentPrice(symbol);
    }

    // Validate data
    if (!this.validate(data)) {
      throw new OracleError(
        'Invalid data received from Binance',
        ErrorCode.DATA_SOURCE_INVALID_RESPONSE,
        { data }
      );
    }

    return {
      source: this.name,
      category: MarketCategory.CRYPTO,
      fetchedAt: new Date(),
      data: data,
      confidence: this.calculateConfidence(data),
      metadata: {
        apiVersion: 'v3',
        rateLimit: {
          remaining: 1200 - this.requestCount,
          reset: new Date(Date.now() + 60000),
        },
      },
    };
  }

  /**
   * Get current price with 24hr statistics
   */
  private async getCurrentPrice(symbol: string): Promise<CryptoData> {
    const cacheKey = `current_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Fetch 24hr ticker statistics
    const response = await this.makeRequest(`/ticker/24hr?symbol=${symbol}`);
    const stats: Binance24hrStats = await response.json();

    const data: CryptoData = {
      symbol: stats.symbol,
      price: parseFloat(stats.lastPrice),
      priceChange24h: parseFloat(stats.priceChangePercent),
      volume24h: parseFloat(stats.quoteVolume),
      timestamp: new Date(stats.closeTime),
      source: this.name,
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get historical price from klines (candlestick) data
   */
  private async getHistoricalPrice(
    symbol: string,
    date: Date
  ): Promise<CryptoData> {
    const cacheKey = `historical_${symbol}_${date.toISOString()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Get the kline (1 day interval) for the target date
    const startTime = date.getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000; // +24 hours

    const response = await this.makeRequest(
      `/klines?symbol=${symbol}&interval=1d&startTime=${startTime}&endTime=${endTime}&limit=1`
    );

    const klines: BinanceKline[] = await response.json();

    if (!klines || klines.length === 0) {
      throw new OracleError(
        `No historical data found for ${symbol} on ${date.toISOString()}`,
        ErrorCode.DATA_SOURCE_INVALID_RESPONSE,
        { symbol, date: date.toISOString() }
      );
    }

    const kline = klines[0];
    const data: CryptoData = {
      symbol: symbol,
      price: parseFloat(kline.close), // Use closing price
      volume24h: parseFloat(kline.quoteVolume),
      timestamp: new Date(kline.closeTime),
      source: this.name,
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Extract trading symbol from market question
   * Converts natural language to Binance trading pair format
   */
  private extractTradingSymbol(question: string): string | null {
    // Common cryptocurrency mappings to Binance symbols
    const symbolMappings: Record<string, string> = {
      bitcoin: 'BTCUSDT',
      btc: 'BTCUSDT',
      ethereum: 'ETHUSDT',
      eth: 'ETHUSDT',
      bnb: 'BNBUSDT',
      'binance coin': 'BNBUSDT',
      cardano: 'ADAUSDT',
      ada: 'ADAUSDT',
      solana: 'SOLUSDT',
      sol: 'SOLUSDT',
      dogecoin: 'DOGEUSDT',
      doge: 'DOGEUSDT',
      polkadot: 'DOTUSDT',
      dot: 'DOTUSDT',
      matic: 'MATICUSDT',
      polygon: 'MATICUSDT',
      avalanche: 'AVAXUSDT',
      avax: 'AVAXUSDT',
      chainlink: 'LINKUSDT',
      link: 'LINKUSDT',
      uniswap: 'UNIUSDT',
      uni: 'UNIUSDT',
      cosmos: 'ATOMUSDT',
      atom: 'ATOMUSDT',
      ripple: 'XRPUSDT',
      xrp: 'XRPUSDT',
      litecoin: 'LTCUSDT',
      ltc: 'LTCUSDT',
    };

    const lowerQuestion = question.toLowerCase();

    // Try to find a match in the mappings
    for (const [key, symbol] of Object.entries(symbolMappings)) {
      if (lowerQuestion.includes(key)) {
        return symbol;
      }
    }

    // Try to extract direct trading pair (e.g., "BTCUSDT")
    const pairMatch = question.match(/\b([A-Z]{3,6}USDT)\b/);
    if (pairMatch) {
      return pairMatch[1];
    }

    // Try to extract symbol and append USDT
    const symbolMatch = question.match(/\b([A-Z]{2,5})\b/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      // Check if it's a known crypto symbol
      if (['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOGE', 'DOT'].includes(symbol)) {
        return `${symbol}USDT`;
      }
    }

    return null;
  }

  /**
   * Check if question requires historical data
   */
  private needsHistoricalData(question: string): boolean {
    const historicalKeywords = [
      'was',
      'did',
      'historical',
      'past',
      'previous',
      'yesterday',
      'last week',
      'last month',
      'ended',
      'closed',
    ];

    return historicalKeywords.some(keyword =>
      question.toLowerCase().includes(keyword)
    );
  }

  /**
   * Extract target date from question
   */
  private extractTargetDate(question: string): Date | null {
    const now = new Date();

    if (question.toLowerCase().includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return yesterday;
    }

    if (question.toLowerCase().includes('last week')) {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);
      return lastWeek;
    }

    if (question.toLowerCase().includes('last month')) {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setHours(0, 0, 0, 0);
      return lastMonth;
    }

    // Try to parse explicit dates
    const dateMatch = question.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const date = new Date(
        parseInt(dateMatch[3]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[1])
      );
      date.setHours(0, 0, 0, 0);
      return date;
    }

    return null;
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(data: CryptoData): number {
    let confidence = 9500; // Start with 95% (Binance is very reliable)

    // Reduce confidence if data is old
    const dataAge = Date.now() - data.timestamp.getTime();
    if (dataAge > 2 * 60 * 1000) {
      // > 2 minutes
      confidence -= 500;
    }
    if (dataAge > 5 * 60 * 1000) {
      // > 5 minutes
      confidence -= 1000;
    }

    // Increase confidence if we have volume data (indicates active trading)
    if (data.volume24h !== undefined && data.volume24h > 0) {
      confidence += 500;
    }

    return Math.min(Math.max(confidence, 0), 10000);
  }

  /**
   * Validate data structure
   */
  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;

    const cryptoData = data as CryptoData;

    return (
      typeof cryptoData.symbol === 'string' &&
      cryptoData.symbol.length > 0 &&
      typeof cryptoData.price === 'number' &&
      cryptoData.price > 0 &&
      !isNaN(cryptoData.price) &&
      cryptoData.timestamp instanceof Date &&
      typeof cryptoData.source === 'string'
    );
  }

  /**
   * Check if API is available (override to use ping endpoint)
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/ping');
      return response.ok;
    } catch {
      return false;
    }
  }
}
