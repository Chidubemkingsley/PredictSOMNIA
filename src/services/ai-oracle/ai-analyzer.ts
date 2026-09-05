/**
 * AI Resolution Analyzer
 * Uses OpenAI GPT-4 to analyze market data and provide resolution suggestions
 */

import OpenAI from 'openai';
import {
  AIAnalysisRequest,
  AIAnalysisResponse,
  MarketCategory,
  OracleError,
  ErrorCode,
  SourceData,
} from './types';

export interface AIAnalyzerConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  minConfidence?: number;
}

export class AIAnalyzer {
  private openai: OpenAI;
  private config: Required<AIAnalyzerConfig>;

  constructor(config: AIAnalyzerConfig) {
    this.config = {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      maxTokens: 2000,
      temperature: 0.1, // Low temperature for consistent, factual responses
      minConfidence: 8000, // 80% — DreamDEX voided at < threshold pays 0.5
      ...config,
    };

    // Groq is OpenAI-compatible — use GROQ baseURL when GROQ_API_KEY present (fast Somnia verifier)
    const isGroq = !!process.env.GROQ_API_KEY;
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: isGroq ? 'https://api.groq.com/openai/v1' : undefined,
    });
  }

  /**
   * Analyze market data and provide resolution
   */
  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const { market, sourceData } = request;

    try {
      // Build the analysis prompt
      const prompt = this.buildPrompt(market, sourceData);

      // Call OpenAI with function calling
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(market.category),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        functions: [this.getResolutionFunction()],
        function_call: { name: 'resolve_prediction_market' },
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0];

      if (!response.message.function_call) {
        throw new OracleError(
          'AI did not provide a function call response',
          ErrorCode.AI_ANALYSIS_FAILED,
          { response }
        );
      }

      // Parse the function call arguments
      const args = JSON.parse(response.message.function_call.arguments);

      // Validate confidence threshold
      if (args.confidence < this.config.minConfidence) {
        throw new OracleError(
          `AI confidence (${args.confidence / 100}%) below minimum threshold (${this.config.minConfidence / 100}%)`,
          ErrorCode.AI_LOW_CONFIDENCE,
          { confidence: args.confidence, threshold: this.config.minConfidence }
        );
      }

      const result: AIAnalysisResponse = {
        outcome: args.outcome,
        confidence: args.confidence,
        reasoning: args.reasoning || [],
        dataPoints: args.dataPoints || [],
        warnings: args.warnings || [],
        alternativeOutcomes: args.alternativeOutcomes || [],
        model: this.config.model,
        tokensUsed: completion.usage?.total_tokens || 0,
        cost: this.calculateCost(completion.usage?.total_tokens || 0),
        timestamp: new Date(),
      };

      return result;
    } catch (error) {
      if (error instanceof OracleError) throw error;

      // Handle OpenAI API errors
      if (error instanceof Error) {
        throw new OracleError(
          `AI analysis failed: ${error.message}`,
          ErrorCode.AI_API_ERROR,
          { error: error.message }
        );
      }

      throw new OracleError(
        'Unknown error during AI analysis',
        ErrorCode.AI_ANALYSIS_FAILED,
        { error }
      );
    }
  }

  /**
   * Build the analysis prompt from market and source data
   */
  private buildPrompt(
    market: AIAnalysisRequest['market'],
    sourceData: SourceData[]
  ): string {
    const dataSection = sourceData
      .map(source => {
        return `
**Source: ${source.source}**
- Category: ${source.category}
- Fetched: ${source.fetchedAt.toISOString()}
- Confidence: ${source.confidence / 100}%
- Data: ${JSON.stringify(source.data, null, 2)}
`;
      })
      .join('\n');

    return `
# Prediction Market Resolution Analysis

## Market Information
- **Question:** ${market.question}
- **Description:** ${market.description}
- **Category:** ${market.category}
- **Market End Time:** ${market.endTime.toISOString()}
- **Created by:** ${market.creator}

## Data from Multiple Sources
${dataSection}

## Your Task
Analyze the data from all sources and determine:
1. Should the market resolve to YES or NO?
2. What is your confidence level (0-10000, where 10000 = 100%)?
3. What are the key reasoning steps that led to your conclusion?
4. What specific data points support your decision?
5. Are there any warnings or concerns?

## Requirements
- Be objective and data-driven
- Cross-reference multiple sources when available
- Note any discrepancies between sources
- Minimum confidence threshold: ${this.config.minConfidence / 100}%
- If confidence is below threshold, explain why

Analyze carefully and provide your resolution.
`;
  }

  /**
   * Get system prompt based on market category
   */
  private getSystemPrompt(category: MarketCategory): string {
    const basePrompt = `You are an AI oracle for a prediction market platform. Your role is to analyze data from multiple sources and provide accurate, unbiased resolutions to prediction markets.

You must:
- Be strictly objective and fact-based
- Cross-verify data from multiple sources
- Identify and report any data inconsistencies
- Only provide high-confidence resolutions
- Clearly explain your reasoning
- Consider edge cases and potential errors

You must NOT:
- Make assumptions without data
- Favor any particular outcome
- Ignore contradictory data
- Provide resolutions with low confidence`;

    const categorySpecificPrompts: Record<MarketCategory, string> = {
      [MarketCategory.CRYPTO]: `
${basePrompt}

For cryptocurrency markets:
- Use exact price data from exchanges
- Compare multiple exchange prices to detect anomalies
- Consider volume and market cap for context
- Note any flash crashes or manipulation
- Be precise with decimal places
- Account for different time zones`,

      [MarketCategory.SPORTS]: `
${basePrompt}

For sports markets:
- Use official results only
- Verify final scores from multiple sources
- Check for overturned calls or penalties
- Note any postponements or cancellations
- Consider overtime/extra time rules
- Be clear about winning conditions`,

      [MarketCategory.POLITICS]: `
${basePrompt}

For political markets:
- Use official government sources
- Wait for certified results
- Note any recounts or challenges
- Consider different reporting timelines
- Verify with multiple news agencies
- Be cautious of preliminary results`,

      [MarketCategory.WEATHER]: `
${basePrompt}

For weather markets:
- Use official meteorological data
- Note measurement location and time
- Consider measurement precision
- Verify with multiple weather services
- Account for local vs UTC time
- Note any data corrections`,

      [MarketCategory.ENTERTAINMENT]: `
${basePrompt}

For entertainment markets:
- Use official sources (award shows, studios, etc.)
- Verify with industry publications
- Note any ties or special circumstances
- Consider different categories carefully
- Verify dates and eligibility`,

      [MarketCategory.TECHNOLOGY]: `
${basePrompt}

For technology markets:
- Use official product releases
- Verify with company announcements
- Check technical specifications carefully
- Note any delays or changes
- Consider beta vs full release`,

      [MarketCategory.FINANCE]: `
${basePrompt}

For finance markets:
- Use official market data
- Note market close times
- Consider adjusted vs unadjusted prices
- Verify with multiple financial sources
- Account for stock splits, dividends
- Be precise with decimal places`,

      [MarketCategory.OTHER]: basePrompt,
    };

    return categorySpecificPrompts[category] || basePrompt;
  }

  /**
   * Get the function definition for OpenAI function calling
   */
  private getResolutionFunction(): OpenAI.Chat.ChatCompletionCreateParams.Function {
    return {
      name: 'resolve_prediction_market',
      description:
        'Analyze the market data and provide a resolution with confidence score',
      parameters: {
        type: 'object',
        properties: {
          outcome: {
            type: 'boolean',
            description:
              'The resolution outcome: true for YES, false for NO. Base this strictly on the data provided.',
          },
          confidence: {
            type: 'number',
            description:
              'Confidence level from 0-10000 (0-100%). Must be >= 8000 (80%) to proceed with automatic resolution.',
            minimum: 0,
            maximum: 10000,
          },
          reasoning: {
            type: 'array',
            description:
              'Step-by-step reasoning that led to this conclusion. Each step should be clear and data-driven.',
            items: {
              type: 'string',
            },
          },
          dataPoints: {
            type: 'array',
            description:
              'Specific data points from the sources that support this resolution. Include source name and exact values.',
            items: {
              type: 'string',
            },
          },
          warnings: {
            type: 'array',
            description:
              'Any concerns, data inconsistencies, or edge cases to be aware of. Leave empty if none.',
            items: {
              type: 'string',
            },
          },
          alternativeOutcomes: {
            type: 'array',
            description:
              'Other possible interpretations or outcomes with their probabilities. Useful for borderline cases.',
            items: {
              type: 'object',
              properties: {
                outcome: { type: 'boolean' },
                probability: {
                  type: 'number',
                  description: '0-100',
                },
                reasoning: { type: 'string' },
              },
            },
          },
        },
        required: ['outcome', 'confidence', 'reasoning', 'dataPoints'],
      },
    };
  }

  /**
   * Calculate cost based on tokens used
   * GPT-4 Turbo pricing: $0.01 per 1K input tokens, $0.03 per 1K output tokens
   * Using average of $0.02 per 1K tokens for simplicity
   */
  private calculateCost(tokens: number): number {
    const costPerThousandTokens = 0.02; // $0.02 per 1K tokens
    return (tokens / 1000) * costPerThousandTokens;
  }

  /**
   * Validate AI response
   */
  validateResponse(response: AIAnalysisResponse): boolean {
    if (typeof response.outcome !== 'boolean') return false;
    if (
      typeof response.confidence !== 'number' ||
      response.confidence < 0 ||
      response.confidence > 10000
    )
      return false;
    if (!Array.isArray(response.reasoning) || response.reasoning.length === 0)
      return false;
    if (!Array.isArray(response.dataPoints) || response.dataPoints.length === 0)
      return false;

    return true;
  }
}
