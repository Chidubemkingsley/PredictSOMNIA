/**
 * IPFS Evidence Storage
 * Handles uploading evidence packages to IPFS via Pinata
 */

import {
  EvidencePackage,
  IPFSUploadResult,
  OracleError,
  ErrorCode,
} from './types';

export interface IPFSStorageConfig {
  provider: 'pinata' | 'web3storage' | 'infura';
  apiKey: string;
  secretKey?: string;
  gateway?: string;
}

export class EvidenceStorage {
  private config: IPFSStorageConfig;
  private cache: Map<string, IPFSUploadResult> = new Map();

  constructor(config: IPFSStorageConfig) {
    this.config = {
      gateway: 'https://gateway.pinata.cloud',
      ...config,
    };
  }

  /**
   * Upload evidence package to IPFS
   */
  async upload(evidence: EvidencePackage): Promise<IPFSUploadResult> {
    // Check cache first (by market ID)
    const cacheKey = `market_${evidence.marketId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      let result: IPFSUploadResult;

      switch (this.config.provider) {
        case 'pinata':
          result = await this.uploadToPinata(evidence);
          break;
        case 'web3storage':
          result = await this.uploadToWeb3Storage(evidence);
          break;
        case 'infura':
          result = await this.uploadToInfura(evidence);
          break;
        default:
          throw new OracleError(
            `Unsupported IPFS provider: ${this.config.provider}`,
            ErrorCode.CONFIG_ERROR,
            { provider: this.config.provider }
          );
      }

      // Cache the result
      this.cache.set(cacheKey, result);

      return result;
    } catch (error) {
      if (error instanceof OracleError) throw error;

      throw new OracleError(
        `Failed to upload evidence to IPFS: ${(error as Error).message}`,
        ErrorCode.IPFS_UPLOAD_FAILED,
        { error: (error as Error).message, provider: this.config.provider }
      );
    }
  }

  /**
   * Upload to Pinata
   */
  private async uploadToPinata(
    evidence: EvidencePackage
  ): Promise<IPFSUploadResult> {
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

    const body = {
      pinataContent: evidence,
      pinataMetadata: {
        name: `PredictSOMNIA_Market_${evidence.marketId}_Evidence`,
        keyvalues: {
          marketId: evidence.marketId.toString(),
          category: evidence.market.category,
          outcome: evidence.resolution.outcome.toString(),
          confidence: evidence.resolution.confidence.toString(),
        },
      },
      pinataOptions: {
        cidVersion: 1,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: this.config.apiKey,
        pinata_secret_api_key: this.config.secretKey || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      cid: data.IpfsHash,
      url: `${this.config.gateway}/ipfs/${data.IpfsHash}`,
      size: data.PinSize,
      pinned: true,
      timestamp: new Date(data.Timestamp),
    };
  }

  /**
   * Upload to Web3.Storage
   */
  private async uploadToWeb3Storage(
    evidence: EvidencePackage
  ): Promise<IPFSUploadResult> {
    const url = 'https://api.web3.storage/upload';

    // Convert evidence to blob
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: 'application/json',
    });

    const formData = new FormData();
    formData.append('file', blob, `evidence_market_${evidence.marketId}.json`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Web3.Storage upload failed: ${response.status} - ${error}`
      );
    }

    const data = await response.json();

    return {
      cid: data.cid,
      url: `https://${data.cid}.ipfs.w3s.link`,
      size: blob.size,
      pinned: true,
      timestamp: new Date(),
    };
  }

  /**
   * Upload to Infura IPFS
   */
  private async uploadToInfura(
    evidence: EvidencePackage
  ): Promise<IPFSUploadResult> {
    const url = 'https://ipfs.infura.io:5001/api/v0/add';

    // Create form data
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: 'application/json',
    });
    const formData = new FormData();
    formData.append('file', blob);

    // Create basic auth header
    const auth = Buffer.from(
      `${this.config.apiKey}:${this.config.secretKey}`
    ).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Infura upload failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      cid: data.Hash,
      url: `https://ipfs.infura.io/ipfs/${data.Hash}`,
      size: parseInt(data.Size),
      pinned: true,
      timestamp: new Date(),
    };
  }

  /**
   * Verify that uploaded content is retrievable
   */
  async verify(cid: string): Promise<boolean> {
    try {
      const url = `${this.config.gateway}/ipfs/${cid}`;
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve evidence from IPFS
   */
  async retrieve(cid: string): Promise<EvidencePackage> {
    try {
      const url = `${this.config.gateway}/ipfs/${cid}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const evidence: EvidencePackage = await response.json();
      return evidence;
    } catch (error) {
      throw new OracleError(
        `Failed to retrieve evidence from IPFS: ${(error as Error).message}`,
        ErrorCode.IPFS_RETRIEVAL_FAILED,
        { cid, error: (error as Error).message }
      );
    }
  }

  /**
   * Pin an existing CID
   */
  async pin(cid: string): Promise<void> {
    if (this.config.provider !== 'pinata') {
      throw new OracleError(
        'Pin operation only supported for Pinata',
        ErrorCode.CONFIG_ERROR,
        { provider: this.config.provider }
      );
    }

    try {
      const url = 'https://api.pinata.cloud/pinning/pinByHash';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.config.apiKey,
          pinata_secret_api_key: this.config.secretKey || '',
        },
        body: JSON.stringify({
          hashToPin: cid,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pin failed: ${response.status} - ${error}`);
      }
    } catch (error) {
      throw new OracleError(
        `Failed to pin CID: ${(error as Error).message}`,
        ErrorCode.IPFS_PIN_FAILED,
        { cid, error: (error as Error).message }
      );
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
