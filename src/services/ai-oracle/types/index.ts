/**
 * Type Definitions for AI Oracle Service
 * Maintainable, type-safe interfaces for all oracle operations
 */

// ============================================================================
// Market & Resolution Types
// ============================================================================

export interface Market {
  id: number;
  question: string;
  description: string;
  category: MarketCategory;
  creator: string;
  endTime: Date;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  resolved: boolean;
  outcome?: boolean;
  resolvedAt?: Date;
  aiOracleEnabled: boolean;
}

export enum MarketCategory {
  CRYPTO = 'crypto',
  SPORTS = 'sports',
  POLITICS = 'politics',
  WEATHER = 'weather',
  ENTERTAINMENT = 'entertainment',
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  OTHER = 'other',
}

export interface ResolutionRequest {
  requestId: number;
  marketId: number;
  market: Market;
  dataSource: string;
  timestamp: Date;
  status: ResolutionStatus;
}

export enum ResolutionStatus {
  PENDING = 'pending',
  FETCHING_DATA = 'fetching_data',
  ANALYZING = 'analyzing',
  UPLOADING_EVIDENCE = 'uploading_evidence',
  SUBMITTING = 'submitting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  MANUAL_REVIEW = 'manual_review',
}

// ============================================================================
// Data Source Types
// ============================================================================

export interface DataSourceAdapter {
  name: string;
  category: MarketCategory[];
  priority: number;
  fetchData(query: ResolutionQuery): Promise<SourceData>;
  validate(data: unknown): boolean;
  isAvailable(): Promise<boolean>;
}

export interface ResolutionQuery {
  market: Market;
  keywords: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SourceData {
  source: string;
  category: MarketCategory;
  fetchedAt: Date;
  data: Record<string, any>;
  confidence: number; // 0-10000 (0-100%)
  metadata: {
    apiVersion?: string;
    rateLimit?: {
      remaining: number;
      reset: Date;
    };
    cost?: number; // in USD
    [key: string]: any; // Allow additional properties
  };
}

export interface CryptoData {
  symbol: string;
  price: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  timestamp: Date;
  source: string;
}

export interface SportsData {
  event: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  timestamp: Date;
  source: string;
}

export interface WeatherData {
  location: string;
  temperature?: number;
  condition?: string;
  precipitation?: number;
  timestamp: Date;
  source: string;
}

// ============================================================================
// AI Analysis Types
// ============================================================================

export interface AIAnalysisRequest {
  market: Market;
  sourceData: SourceData[];
  previousAnalysis?: AIAnalysisResponse[]; // For multi-step reasoning
}

export interface AIAnalysisResponse {
  outcome: boolean; // true = YES, false = NO
  confidence: number; // 0-10000 (0-100%)
  reasoning: string[];
  dataPoints: string[];
  warnings: string[];
  alternativeOutcomes?: {
    outcome: boolean;
    probability: number;
    reasoning: string;
  }[];
  model: string;
  tokensUsed: number;
  cost: number; // in USD
  timestamp: Date;
}

export interface AIPrompt {
  system: string;
  user: string;
  functions?: GPTFunction[];
}

export interface GPTFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ============================================================================
// Evidence & IPFS Types
// ============================================================================

export interface EvidencePackage {
  version: string;
  marketId: number;
  market: {
    question: string;
    description: string;
    category: MarketCategory;
    endTime: Date;
  };
  resolution: {
    outcome: boolean;
    confidence: number;
    timestamp: Date;
    submittedBy: string;
  };
  sources: SourceData[];
  aiAnalysis: AIAnalysisResponse;
  verification: {
    multiSourceAgreement: boolean;
    sourcesUsed: number;
    dataFreshness: number; // seconds
    biasCheck: string;
  };
  metadata: {
    oracleAgent: string;
    blockNumber?: number;
    txHash?: string;
    ipfsCid?: string;
  };
}

export interface IPFSUploadResult {
  cid: string; // Content Identifier
  url: string;
  size: number; // in bytes
  pinned: boolean;
  timestamp: Date;
}

// ============================================================================
// Oracle Agent Types
// ============================================================================

export interface OracleAgentConfig {
  privateKey: string;
  contractAddresses: {
    predictionMarket: string;
    aiOracle: string;
  };
  rpcUrl: string;
  checkInterval: number; // milliseconds
  maxGasPrice: bigint; // in wei
  minConfidence: number; // 0-10000
}

export interface OracleAgentState {
  isRunning: boolean;
  lastCheck: Date;
  pendingResolutions: number;
  completedResolutions: number;
  failedResolutions: number;
  averageConfidence: number;
  totalCostUSD: number;
}

export interface ResolutionJob {
  id: string;
  request: ResolutionRequest;
  status: ResolutionStatus;
  attempts: number;
  maxAttempts: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
  result?: ResolutionResult;
}

export interface ResolutionResult {
  outcome: boolean;
  confidence: number;
  evidenceCid: string;
  txHash: string;
  gasUsed: bigint;
  costUSD: number;
  duration: number; // milliseconds
}

// ============================================================================
// Error Types
// ============================================================================

export class OracleError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'OracleError';
  }
}

export enum ErrorCode {
  // Data Source Errors
  DATA_SOURCE_UNAVAILABLE = 'DATA_SOURCE_UNAVAILABLE',
  DATA_SOURCE_RATE_LIMIT = 'DATA_SOURCE_RATE_LIMIT',
  DATA_SOURCE_INVALID_RESPONSE = 'DATA_SOURCE_INVALID_RESPONSE',
  DATA_SOURCE_TIMEOUT = 'DATA_SOURCE_TIMEOUT',

  // AI Analysis Errors
  AI_ANALYSIS_FAILED = 'AI_ANALYSIS_FAILED',
  AI_LOW_CONFIDENCE = 'AI_LOW_CONFIDENCE',
  AI_API_ERROR = 'AI_API_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',

  // IPFS Errors
  IPFS_UPLOAD_FAILED = 'IPFS_UPLOAD_FAILED',
  IPFS_RETRIEVAL_FAILED = 'IPFS_RETRIEVAL_FAILED',
  IPFS_PIN_FAILED = 'IPFS_PIN_FAILED',

  // Blockchain Errors
  BLOCKCHAIN_TX_FAILED = 'BLOCKCHAIN_TX_FAILED',
  BLOCKCHAIN_GAS_TOO_HIGH = 'BLOCKCHAIN_GAS_TOO_HIGH',
  BLOCKCHAIN_UNAUTHORIZED = 'BLOCKCHAIN_UNAUTHORIZED',
  BLOCKCHAIN_CONTRACT_ERROR = 'BLOCKCHAIN_CONTRACT_ERROR',

  // Validation Errors
  INVALID_MARKET = 'INVALID_MARKET',
  MARKET_NOT_ENDED = 'MARKET_NOT_ENDED',
  MARKET_ALREADY_RESOLVED = 'MARKET_ALREADY_RESOLVED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',

  // System Errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// Utility Types
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number; // in MB
}

export interface MonitoringMetrics {
  timestamp: Date;
  resolutions: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
  };
  performance: {
    averageResolutionTime: number; // seconds
    averageConfidence: number;
    averageCostUSD: number;
  };
  dataSources: {
    name: string;
    requests: number;
    failures: number;
    averageLatency: number; // milliseconds
  }[];
  ai: {
    requests: number;
    tokensUsed: number;
    costUSD: number;
    averageConfidence: number;
  };
  ipfs: {
    uploads: number;
    failures: number;
    totalSize: number; // bytes
  };
  blockchain: {
    transactions: number;
    failures: number;
    totalGasUsed: bigint;
    averageGasPrice: bigint;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ServiceConfig {
  oracle: OracleAgentConfig;
  ai: {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    apiKey: string;
    maxTokens: number;
    temperature: number;
    minConfidence: number;
  };
  ipfs: {
    provider: 'pinata' | 'web3storage' | 'infura';
    apiKey: string;
    secretKey?: string;
    gateway: string;
  };
  dataSources: {
    coingecko?: {
      apiKey?: string;
      baseUrl: string;
    };
    binance?: {
      apiKey?: string;
      secretKey?: string;
      baseUrl: string;
    };
    theodds?: {
      apiKey?: string;
      baseUrl: string;
    };
  };
  monitoring: {
    enabled: boolean;
    sentryDsn?: string;
    discordWebhook?: string;
    metricsInterval: number; // milliseconds
  };
  cache: CacheConfig;
  retry: RetryConfig;
}
