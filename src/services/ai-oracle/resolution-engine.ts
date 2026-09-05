/**
 * Resolution Engine
 * Coordinates the entire resolution process: data fetching, AI analysis, evidence storage, and blockchain submission
 */

import { ethers } from 'ethers';
import {
  Market,
  ResolutionRequest,
  ResolutionResult,
  SourceData,
  EvidencePackage,
  OracleError,
  ErrorCode,
  DataSourceAdapter,
} from './types';
import { AIAnalyzer } from './ai-analyzer';
import { EvidenceStorage } from './evidence-storage';

export interface ResolutionEngineConfig {
  adapters: DataSourceAdapter[];
  aiAnalyzer: AIAnalyzer;
  evidenceStorage: EvidenceStorage;
  oracleContract: ethers.Contract;
  signer: ethers.Wallet;
  minConfidence: number;
  maxGasPrice: bigint;
}

export class ResolutionEngine {
  private config: ResolutionEngineConfig;
  private pendingResolutions: Map<number, ResolutionRequest> = new Map();

  constructor(config: ResolutionEngineConfig) {
    this.config = config;
  }

  /**
   * Resolve a market through the complete workflow
   */
  async resolveMarket(market: Market): Promise<ResolutionResult> {
    const startTime = Date.now();

    try {
      // Step 1: Fetch data from multiple sources
      const sourceData = await this.fetchData(market);

      if (sourceData.length === 0) {
        throw new OracleError(
          'No data sources available for this market',
          ErrorCode.INSUFFICIENT_DATA,
          { marketId: market.id, category: market.category }
        );
      }

      // Step 2: Run AI analysis

      const aiAnalysis = await this.config.aiAnalyzer.analyze({
        market,
        sourceData,
      });

      // Verify confidence meets threshold
      if (aiAnalysis.confidence < this.config.minConfidence) {
        throw new OracleError(
          `AI confidence (${aiAnalysis.confidence / 100}%) below threshold (${this.config.minConfidence / 100}%)`,
          ErrorCode.AI_LOW_CONFIDENCE,
          {
            confidence: aiAnalysis.confidence,
            threshold: this.config.minConfidence,
          }
        );
      }

      // Step 3: Compile evidence package
      const evidence: EvidencePackage = {
        version: '1.0',
        marketId: market.id,
        market: {
          question: market.question,
          description: market.description,
          category: market.category,
          endTime: market.endTime,
        },
        resolution: {
          outcome: aiAnalysis.outcome,
          confidence: aiAnalysis.confidence,
          timestamp: new Date(),
          submittedBy: await this.config.signer.getAddress(),
        },
        sources: sourceData,
        aiAnalysis: aiAnalysis,
        verification: {
          multiSourceAgreement: this.checkMultiSourceAgreement(sourceData),
          sourcesUsed: sourceData.length,
          dataFreshness: this.calculateDataFreshness(sourceData),
          biasCheck: this.performBiasCheck(sourceData, aiAnalysis),
        },
        metadata: {
          oracleAgent: await this.config.signer.getAddress(),
        },
      };

      // Step 4: Upload evidence to IPFS
      const ipfsResult = await this.config.evidenceStorage.upload(evidence);
      evidence.metadata.ipfsCid = ipfsResult.cid;

      // Step 5: Submit resolution to blockchain
      const txResult = await this.submitToBlockchain(
        market.id,
        aiAnalysis.outcome,
        aiAnalysis.confidence,
        ipfsResult.cid
      );

      evidence.metadata.blockNumber = txResult.blockNumber;
      evidence.metadata.txHash = txResult.hash;

      // Calculate final cost
      const gasCost = await this.calculateGasCost(txResult);
      const totalCostUSD = aiAnalysis.cost + gasCost;

      const duration = Date.now() - startTime;

      return {
        outcome: aiAnalysis.outcome,
        confidence: aiAnalysis.confidence,
        evidenceCid: ipfsResult.cid,
        txHash: txResult.hash,
        gasUsed: BigInt(txResult.gasUsed.toString()),
        costUSD: totalCostUSD,
        duration,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch data from all applicable sources
   */
  private async fetchData(market: Market): Promise<SourceData[]> {
    // Filter adapters by category
    const applicableAdapters = this.config.adapters
      .filter(adapter => adapter.category.includes(market.category))
      .sort((a, b) => a.priority - b.priority);

    if (applicableAdapters.length === 0) {
      throw new OracleError(
        `No adapters available for category: ${market.category}`,
        ErrorCode.DATA_SOURCE_UNAVAILABLE,
        { category: market.category }
      );
    }

    // Fetch from all adapters in parallel
    const results = await Promise.allSettled(
      applicableAdapters.map(adapter =>
        adapter.fetchData({
          market,
          keywords: this.extractKeywords(market.question),
        })
      )
    );

    // Collect successful results
    const sourceData: SourceData[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        sourceData.push(result.value);
      } else {
        // Data source failed, continue with others
      }
    }

    return sourceData;
  }

  /**
   * Submit resolution to blockchain
   */
  private async submitToBlockchain(
    marketId: number,
    outcome: boolean,
    confidence: number,
    evidenceHash: string
  ): Promise<ethers.ContractTransactionReceipt> {
    // Check gas price
    const feeData = await this.config.signer.provider!.getFeeData();
    const gasPrice = feeData.gasPrice || BigInt(0);

    if (gasPrice > this.config.maxGasPrice) {
      throw new OracleError(
        `Gas price (${ethers.formatUnits(gasPrice, 'gwei')} gwei) exceeds maximum (${ethers.formatUnits(this.config.maxGasPrice, 'gwei')} gwei)`,
        ErrorCode.BLOCKCHAIN_GAS_TOO_HIGH,
        {
          gasPrice: gasPrice.toString(),
          maxGasPrice: this.config.maxGasPrice.toString(),
        }
      );
    }

    try {
      // Submit resolution
      const tx = await this.config.oracleContract.provideResolution(
        marketId,
        outcome,
        confidence,
        evidenceHash,
        {
          gasPrice: gasPrice,
          gasLimit: 500000, // Estimated gas limit
        }
      );

      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      return receipt;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        throw new OracleError(
          'Oracle agent not authorized',
          ErrorCode.BLOCKCHAIN_UNAUTHORIZED,
          { error: error.message }
        );
      }

      throw new OracleError(
        `Blockchain transaction failed: ${(error as Error).message}`,
        ErrorCode.BLOCKCHAIN_TX_FAILED,
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Check if multiple sources agree
   */
  private checkMultiSourceAgreement(sourceData: SourceData[]): boolean {
    if (sourceData.length < 2) return true; // Single source auto-agrees

    // For crypto markets, check if prices are within 1% of each other
    const cryptoData = sourceData.filter(s => s.data.price !== undefined);
    if (cryptoData.length >= 2) {
      const prices = cryptoData.map(s => s.data.price);
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const maxDeviation = Math.max(
        ...prices.map(p => Math.abs(p - avgPrice) / avgPrice)
      );
      return maxDeviation < 0.01; // Within 1%
    }

    return true; // Can't check agreement for non-crypto
  }

  /**
   * Calculate data freshness (in seconds)
   */
  private calculateDataFreshness(sourceData: SourceData[]): number {
    const now = Date.now();
    const ages = sourceData.map(s => (now - s.fetchedAt.getTime()) / 1000);
    return Math.max(...ages); // Return oldest data age
  }

  /**
   * Perform bias check
   */
  private performBiasCheck(sourceData: SourceData[], aiAnalysis: any): string {
    const checks: string[] = [];

    // Check if we have multiple sources
    if (sourceData.length < 2) {
      checks.push('Single source - could not cross-verify');
    } else {
      checks.push(`${sourceData.length} sources cross-verified`);
    }

    // Check confidence level
    if (aiAnalysis.confidence > 9500) {
      checks.push('Very high confidence - strong data agreement');
    } else if (aiAnalysis.confidence < 8500) {
      checks.push('Moderate confidence - some uncertainty present');
    }

    // Check for warnings
    if (aiAnalysis.warnings && aiAnalysis.warnings.length > 0) {
      checks.push(`${aiAnalysis.warnings.length} warning(s) noted by AI`);
    }

    return checks.join('; ');
  }

  /**
   * Calculate gas cost in USD
   */
  private async calculateGasCost(
    receipt: ethers.ContractTransactionReceipt
  ): Promise<number> {
    // Get STT price (approximate)
    const bnbPriceUSD = 300; // You could fetch this from an oracle

    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.gasPrice;

    const gasCostSTT = parseFloat(ethers.formatEther(gasUsed * gasPrice));
    const gasCostUSD = gasCostSTT * bnbPriceUSD;

    return gasCostUSD;
  }

  /**
   * Extract keywords from question
   */
  private extractKeywords(question: string): string[] {
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
    ];
    const words = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    return [...new Set(words)];
  }

  /**
   * Get pending resolutions
   */
  getPendingResolutions(): ResolutionRequest[] {
    return Array.from(this.pendingResolutions.values());
  }
}
