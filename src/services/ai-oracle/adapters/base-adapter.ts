/**
 * Base Data Source Adapter
 * Provides common functionality for all data source adapters
 */

import {
  DataSourceAdapter,
  ResolutionQuery,
  SourceData,
  MarketCategory,
  RetryConfig,
  RateLimitConfig,
  OracleError,
  ErrorCode,
} from '../types';

export interface AdapterConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
  timeout?: number; // milliseconds
  retry?: RetryConfig;
  rateLimit?: RateLimitConfig;
  cacheEnabled?: boolean;
  cacheTTL?: number; // seconds
}

export abstract class BaseAdapter implements DataSourceAdapter {
  public name: string;
  public abstract category: MarketCategory[];
  public abstract priority: number;

  protected config: AdapterConfig;
  protected requestCount: number = 0;
  protected lastRequest: Date | null = null;
  protected cache: Map<string, { data: any; expiresAt: Date }> = new Map();

  constructor(config: AdapterConfig) {
    this.name = config.name;
    this.config = {
      timeout: 10000, // 10s default
      retry: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
      },
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
      cacheEnabled: true,
      cacheTTL: 60, // 60s default
      ...config,
    };
  }

  /**
   * Fetch data from the source (to be implemented by subclasses)
   */
  abstract fetchData(query: ResolutionQuery): Promise<SourceData>;

  /**
   * Validate response data (to be implemented by subclasses)
   */
  abstract validate(data: unknown): boolean;

  /**
   * Check if data source is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/', 'GET');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const retry = this.config.retry!;

    for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
      try {
        // Rate limiting check
        await this.checkRateLimit();

        // Prepare headers
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        if (this.config.apiKey) {
          requestHeaders['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        // Make request
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout!),
        });

        this.requestCount++;
        this.lastRequest = new Date();

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : retry.delayMs * Math.pow(retry.backoffMultiplier, attempt);

            if (attempt < retry.maxAttempts - 1) {
              await this.sleep(Math.min(delay, retry.maxDelayMs));
              continue;
            }

            throw new OracleError(
              `Rate limit exceeded for ${this.name}`,
              ErrorCode.DATA_SOURCE_RATE_LIMIT,
              { source: this.name, status: response.status }
            );
          }

          // Retry on server errors
          if (response.status >= 500 && attempt < retry.maxAttempts - 1) {
            const delay =
              retry.delayMs * Math.pow(retry.backoffMultiplier, attempt);
            await this.sleep(Math.min(delay, retry.maxDelayMs));
            continue;
          }

          throw new OracleError(
            `HTTP error from ${this.name}: ${response.status}`,
            ErrorCode.DATA_SOURCE_INVALID_RESPONSE,
            { source: this.name, status: response.status }
          );
        }

        return response;
      } catch (error) {
        if (error instanceof OracleError) throw error;

        // Timeout error
        if (error instanceof Error && error.name === 'TimeoutError') {
          if (attempt < retry.maxAttempts - 1) {
            const delay =
              retry.delayMs * Math.pow(retry.backoffMultiplier, attempt);
            await this.sleep(Math.min(delay, retry.maxDelayMs));
            continue;
          }

          throw new OracleError(
            `Request timeout for ${this.name}`,
            ErrorCode.DATA_SOURCE_TIMEOUT,
            { source: this.name, timeout: this.config.timeout }
          );
        }

        // Network error
        if (attempt < retry.maxAttempts - 1) {
          const delay =
            retry.delayMs * Math.pow(retry.backoffMultiplier, attempt);
          await this.sleep(Math.min(delay, retry.maxDelayMs));
          continue;
        }

        throw new OracleError(
          `Network error for ${this.name}: ${(error as Error).message}`,
          ErrorCode.NETWORK_ERROR,
          { source: this.name, error: (error as Error).message }
        );
      }
    }

    throw new OracleError(
      `Max retry attempts reached for ${this.name}`,
      ErrorCode.DATA_SOURCE_UNAVAILABLE,
      { source: this.name, attempts: retry.maxAttempts }
    );
  }

  /**
   * Check rate limiting before making request
   */
  protected async checkRateLimit(): Promise<void> {
    const rateLimit = this.config.rateLimit!;
    const now = new Date();

    if (this.lastRequest) {
      const timeSinceLastRequest = now.getTime() - this.lastRequest.getTime();
      const minInterval = 60000 / rateLimit.requestsPerMinute; // ms per request

      if (timeSinceLastRequest < minInterval) {
        const delay = minInterval - timeSinceLastRequest;
        await this.sleep(delay);
      }
    }
  }

  /**
   * Get data from cache if available
   */
  protected getCached(key: string): any | null {
    if (!this.config.cacheEnabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = new Date();
    if (now > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store data in cache
   */
  protected setCache(key: string, data: any): void {
    if (!this.config.cacheEnabled) return;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.config.cacheTTL!);

    this.cache.set(key, { data, expiresAt });

    // Clean up expired entries
    this.cleanCache();
  }

  /**
   * Clean expired cache entries
   */
  protected cleanCache(): void {
    const now = new Date();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract keywords from market question
   */
  protected extractKeywords(question: string): string[] {
    // Remove common words and split
    const stopWords = [
      'will',
      'the',
      'be',
      'to',
      'a',
      'an',
      'in',
      'on',
      'at',
      'by',
      'above',
      'below',
      'reach',
      'hit',
      'before',
      'after',
    ];

    const words = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Get adapter statistics
   */
  public getStats() {
    return {
      name: this.name,
      requestCount: this.requestCount,
      lastRequest: this.lastRequest,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.requestCount = 0;
    this.lastRequest = null;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
