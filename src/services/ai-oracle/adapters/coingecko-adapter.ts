/**
 * CoinGecko Data Source Adapter
 * Fetches cryptocurrency price and market data from CoinGecko API
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

interface CoinGeckoPrice {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
    usd_market_cap?: number;
  };
}

interface CoinGeckoHistoricalData {
  market_data: {
    current_price: {
      [currency: string]: number;
    };
  };
}

export class CoinGeckoAdapter extends BaseAdapter {
  public category = [MarketCategory.CRYPTO];
  public priority = 1; // Highest priority for crypto markets

  constructor(apiKey?: string) {
    super({
      name: 'CoinGecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      apiKey: apiKey,
      timeout: 15000,
      retry: {
        maxAttempts: 3,
        delayMs: 2000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
      },
      rateLimit: {
        requestsPerMinute: apiKey ? 500 : 50, // Free tier vs Pro
        requestsPerHour: apiKey ? 10000 : 1000,
      },
      cacheEnabled: true,
      cacheTTL: 60, // 60 seconds cache
    });
  }

  /**
   * Fetch data for a resolution query
   */
  async fetchData(query: ResolutionQuery): Promise<SourceData> {
    const { market } = query;

    // Extract coin symbol from market question
    const coinSymbol = this.extractCoinSymbol(market.question);
    if (!coinSymbol) {
      throw new OracleError(
        'Could not extract coin symbol from market question',
        ErrorCode.INVALID_MARKET,
        { question: market.question }
      );
    }

    // Determine if we need historical data
    const needsHistorical = this.needsHistoricalData(market.question);
    const targetDate = this.extractTargetDate(market.question);

    let data: CryptoData;

    if (needsHistorical && targetDate) {
      data = await this.getHistoricalPrice(coinSymbol, targetDate);
    } else {
      data = await this.getCurrentPrice(coinSymbol);
    }

    // Validate data
    if (!this.validate(data)) {
      throw new OracleError(
        'Invalid data received from CoinGecko',
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
          remaining: 50 - this.requestCount,
          reset: new Date(Date.now() + 60000),
        },
      },
    };
  }

  /**
   * Get current price for a cryptocurrency
   */
  private async getCurrentPrice(symbol: string): Promise<CryptoData> {
    const cacheKey = `current_${symbol}_usd`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Get coin ID from symbol
    const coinId = await this.getCoinId(symbol);

    // Fetch current price
    const response = await this.makeRequest(
      `/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`
    );

    const priceData: CoinGeckoPrice = await response.json();

    if (!priceData[coinId]) {
      throw new OracleError(
        `No price data found for ${symbol}`,
        ErrorCode.DATA_SOURCE_INVALID_RESPONSE,
        { symbol, coinId }
      );
    }

    const data: CryptoData = {
      symbol: symbol.toUpperCase(),
      price: priceData[coinId].usd,
      priceChange24h: priceData[coinId].usd_24h_change,
      volume24h: priceData[coinId].usd_24h_vol,
      marketCap: priceData[coinId].usd_market_cap,
      timestamp: new Date(),
      source: this.name,
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get historical price for a specific date
   */
  private async getHistoricalPrice(
    symbol: string,
    date: Date
  ): Promise<CryptoData> {
    const cacheKey = `historical_${symbol}_${date.toISOString()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Get coin ID from symbol
    const coinId = await this.getCoinId(symbol);

    // Format date as DD-MM-YYYY
    const dateStr = `${date.getDate()}-${
      date.getMonth() + 1
    }-${date.getFullYear()}`;

    // Fetch historical price
    const response = await this.makeRequest(
      `/coins/${coinId}/history?date=${dateStr}`
    );

    const historicalData: CoinGeckoHistoricalData = await response.json();

    if (!historicalData.market_data?.current_price?.usd) {
      throw new OracleError(
        `No historical price data found for ${symbol} on ${dateStr}`,
        ErrorCode.DATA_SOURCE_INVALID_RESPONSE,
        { symbol, date: dateStr }
      );
    }

    const data: CryptoData = {
      symbol: symbol.toUpperCase(),
      price: historicalData.market_data.current_price.usd,
      timestamp: date,
      source: this.name,
    };

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Get CoinGecko coin ID from symbol
   */
  private async getCoinId(symbol: string): Promise<string> {
    const cacheKey = `coinId_${symbol}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    // Common mappings
    const commonMappings: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      ADA: 'cardano',
      SOL: 'solana',
      DOGE: 'dogecoin',
      DOT: 'polkadot',
      MATIC: 'matic-network',
      AVAX: 'avalanche-2',
      LINK: 'chainlink',
      UNI: 'uniswap',
      ATOM: 'cosmos',
      XRP: 'ripple',
      LTC: 'litecoin',
      BCH: 'bitcoin-cash',
    };

    const normalizedSymbol = symbol.toUpperCase();
    if (commonMappings[normalizedSymbol]) {
      this.setCache(cacheKey, commonMappings[normalizedSymbol]);
      return commonMappings[normalizedSymbol];
    }

    // Search for coin by symbol
    const response = await this.makeRequest(`/search?query=${symbol}`);
    const searchData = await response.json();

    const coin = searchData.coins?.find(
      (c: any) => c.symbol.toUpperCase() === normalizedSymbol
    );

    if (!coin) {
      throw new OracleError(
        `Could not find CoinGecko ID for symbol: ${symbol}`,
        ErrorCode.DATA_SOURCE_INVALID_RESPONSE,
        { symbol }
      );
    }

    this.setCache(cacheKey, coin.id);
    return coin.id;
  }

  /**
   * Extract coin symbol from market question
   */
  private extractCoinSymbol(question: string): string | null {
    // Look for common patterns
    const patterns = [
      /\b([A-Z]{2,5})\b/, // BTC, ETH, etc.
      /Bitcoin/i,
      /Ethereum/i,
      /BNB/i,
      /Binance Coin/i,
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match) {
        // Convert common names to symbols
        const nameToSymbol: Record<string, string> = {
          bitcoin: 'BTC',
          ethereum: 'ETH',
          'binance coin': 'BNB',
        };

        const matched = match[1] || match[0];
        return nameToSymbol[matched.toLowerCase()] || matched;
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
    ];

    return historicalKeywords.some(keyword =>
      question.toLowerCase().includes(keyword)
    );
  }

  /**
   * Extract target date from question
   */
  private extractTargetDate(question: string): Date | null {
    // Look for date patterns
    const now = new Date();

    if (question.toLowerCase().includes('yesterday')) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }

    if (question.toLowerCase().includes('last week')) {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return lastWeek;
    }

    if (question.toLowerCase().includes('last month')) {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return lastMonth;
    }

    // Try to parse explicit dates (DD/MM/YYYY or MM/DD/YYYY)
    const dateMatch = question.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      return new Date(
        parseInt(dateMatch[3]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[1])
      );
    }

    return null;
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(data: CryptoData): number {
    let confidence = 9000; // Start with 90%

    // Reduce confidence if data is old
    const dataAge = Date.now() - data.timestamp.getTime();
    if (dataAge > 5 * 60 * 1000) {
      // > 5 minutes
      confidence -= 500;
    }
    if (dataAge > 15 * 60 * 1000) {
      // > 15 minutes
      confidence -= 1000;
    }

    // Increase confidence if we have additional data
    if (data.volume24h !== undefined) confidence += 300;
    if (data.marketCap !== undefined) confidence += 200;

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
      typeof cryptoData.price === 'number' &&
      cryptoData.price > 0 &&
      cryptoData.timestamp instanceof Date &&
      typeof cryptoData.source === 'string'
    );
  }
}
