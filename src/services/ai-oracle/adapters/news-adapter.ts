/**
 * News and Web Search Adapter
 * Fetches real-time news and web data for market analysis
 */

import { BaseAdapter } from './base-adapter';
import { SourceData, MarketCategory, ResolutionQuery } from '../types';

interface NewsArticle {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  relevanceScore: number;
}

interface WebSearchResult {
  title: string;
  snippet: string;
  link: string;
}

export class NewsAdapter extends BaseAdapter {
  public readonly name = 'News & Web Search';
  public readonly category = [
    MarketCategory.POLITICS,
    MarketCategory.TECHNOLOGY,
    MarketCategory.ENTERTAINMENT,
    MarketCategory.OTHER,
  ];
  public readonly priority = 2;

  // Free news APIs
  private readonly GNEWS_API = 'https://gnews.io/api/v4';
  private readonly MEDIASTACK_API = 'http://api.mediastack.com/v1';
  
  // Free search APIs (Brave Search, DuckDuckGo)
  private readonly DUCKDUCKGO_API = 'https://api.duckduckgo.com';
  private readonly BRAVE_API = 'https://api.search.brave.com/res/v1';

  async fetchData(query: ResolutionQuery): Promise<SourceData> {
    const question = query.market.question;
    const category = query.market.category;

    try {
      // Try multiple sources and combine results
      const [newsResults, webResults] = await Promise.all([
        this.fetchNews(question),
        this.fetchWebSearch(question),
      ]);

      const allArticles = [...newsResults, ...this.convertWebToArticles(webResults)];
      const analysis = this.analyzeNewsForMarket(allArticles, question);

      return {
        source: this.name,
        category: category as MarketCategory,
        fetchedAt: new Date(),
        data: {
          question,
          articles: allArticles.slice(0, 10),
          analysis,
          sentiment: this.calculateSentiment(allArticles, question),
          keyFacts: this.extractKeyFacts(allArticles, question),
        },
        confidence: allArticles.length > 0 ? 7500 : 5000,
        metadata: {
          articlesFound: allArticles.length,
          sources: [...new Set(allArticles.map(a => a.source))],
        },
      };
    } catch (error) {
      console.error('[News Adapter] Error:', error);
      return this.getFallbackData(question, category);
    }
  }

  private async fetchNews(query: string): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    // Try GNews API (100 requests/day free)
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
      try {
        const searchQuery = this.buildSearchQuery(query);
        const url = `${this.GNEWS_API}/search?q=${encodeURIComponent(searchQuery)}&lang=en&max=10&apikey=${gnewsKey}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.articles) {
            articles.push(...data.articles.map((a: any) => ({
              title: a.title,
              description: a.description || '',
              source: a.source?.name || 'GNews',
              url: a.url,
              publishedAt: a.publishedAt,
              relevanceScore: this.calculateRelevance(a.title + ' ' + a.description, query),
            })));
          }
        }
      } catch (error) {
        console.log('[News Adapter] GNews failed:', error);
      }
    }

    // Try MediaStack API (500 requests/month free)
    const mediastackKey = process.env.MEDIASTACK_API_KEY;
    if (mediastackKey && articles.length < 5) {
      try {
        const searchQuery = this.buildSearchQuery(query);
        const url = `${this.MEDIASTACK_API}/news?access_key=${mediastackKey}&keywords=${encodeURIComponent(searchQuery)}&languages=en&limit=10`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            articles.push(...data.data.map((a: any) => ({
              title: a.title,
              description: a.description || '',
              source: a.source || 'MediaStack',
              url: a.url,
              publishedAt: a.published_at,
              relevanceScore: this.calculateRelevance(a.title + ' ' + a.description, query),
            })));
          }
        }
      } catch (error) {
        console.log('[News Adapter] MediaStack failed:', error);
      }
    }

    // Sort by relevance
    return articles.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private async fetchWebSearch(query: string): Promise<WebSearchResult[]> {
    const results: WebSearchResult[] = [];

    // Try DuckDuckGo Instant Answer API (unlimited, free)
    try {
      const searchQuery = this.buildSearchQuery(query);
      const url = `${this.DUCKDUCKGO_API}/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1`;
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Extract abstract if available
        if (data.Abstract) {
          results.push({
            title: data.Heading || 'DuckDuckGo Summary',
            snippet: data.Abstract,
            link: data.AbstractURL || '',
          });
        }

        // Extract related topics
        if (data.RelatedTopics) {
          for (const topic of data.RelatedTopics.slice(0, 5)) {
            if (topic.Text) {
              results.push({
                title: topic.Text.split(' - ')[0] || 'Related Topic',
                snippet: topic.Text,
                link: topic.FirstURL || '',
              });
            }
          }
        }
      }
    } catch (error) {
      console.log('[News Adapter] DuckDuckGo failed:', error);
    }

    // Try Brave Search API if available
    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    if (braveKey && results.length < 5) {
      try {
        const searchQuery = this.buildSearchQuery(query);
        const url = `${this.BRAVE_API}/web/search?q=${encodeURIComponent(searchQuery)}&count=10`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveKey,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.web?.results) {
            results.push(...data.web.results.map((r: any) => ({
              title: r.title,
              snippet: r.description,
              link: r.url,
            })));
          }
        }
      } catch (error) {
        console.log('[News Adapter] Brave Search failed:', error);
      }
    }

    return results;
  }

  private buildSearchQuery(question: string): string {
    // Remove common question words and punctuation for better search
    return question
      .replace(/^(will|when|what|who|where|how|is|are|does|did|can|should|would)/i, '')
      .replace(/\?/g, '')
      .trim()
      .slice(0, 100); // Limit query length
  }

  private convertWebToArticles(webResults: WebSearchResult[]): NewsArticle[] {
    return webResults.map(r => ({
      title: r.title,
      description: r.snippet,
      source: 'Web Search',
      url: r.link,
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.5,
    }));
  }

  private calculateRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (word.length > 3 && textLower.includes(word)) {
        matches++;
      }
    }
    
    return matches / Math.max(queryWords.length, 1);
  }

  private analyzeNewsForMarket(articles: NewsArticle[], _question: string): string {
    if (articles.length === 0) {
      return 'No relevant news articles found. Unable to provide data-driven analysis.';
    }

    const topArticles = articles.slice(0, 5);
    const headlines = topArticles.map(a => `- "${a.title}" (${a.source})`).join('\n');
    
    return `Found ${articles.length} relevant articles.\n\nTop headlines:\n${headlines}\n\nConsider these sources when determining market outcome.`;
  }

  private calculateSentiment(articles: NewsArticle[], _question: string): { positive: number; negative: number; neutral: number } {
    const positiveWords = ['success', 'win', 'achieve', 'approved', 'passed', 'confirmed', 'yes', 'will', 'announces', 'launches'];
    const negativeWords = ['fail', 'lose', 'reject', 'denied', 'cancelled', 'no', 'won\'t', 'delays', 'problems', 'issues'];
    
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    for (const article of articles) {
      const text = (article.title + ' ' + article.description).toLowerCase();
      let posCount = 0;
      let negCount = 0;

      for (const word of positiveWords) {
        if (text.includes(word)) posCount++;
      }
      for (const word of negativeWords) {
        if (text.includes(word)) negCount++;
      }

      if (posCount > negCount) positive++;
      else if (negCount > posCount) negative++;
      else neutral++;
    }

    const total = articles.length || 1;
    return {
      positive: Math.round((positive / total) * 100),
      negative: Math.round((negative / total) * 100),
      neutral: Math.round((neutral / total) * 100),
    };
  }

  private extractKeyFacts(articles: NewsArticle[], question: string): string[] {
    const facts: string[] = [];
    const questionLower = question.toLowerCase();

    // Extract key entities from question
    const entities = this.extractEntities(questionLower);

    for (const article of articles.slice(0, 5)) {
      const text = article.title + ' ' + article.description;
      
      // Look for sentences containing key entities
      const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 20);
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        if (entities.some(e => sentenceLower.includes(e)) && facts.length < 5) {
          facts.push(sentence.trim());
        }
      }
    }

    return facts;
  }

  private extractEntities(text: string): string[] {
    // Extract potential named entities (simple heuristic)
    const words = text.split(/\s+/);
    const entities: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^a-zA-Z0-9]/g, '');
      // Skip common words
      if (word.length > 3 && !['will', 'when', 'what', 'where', 'which', 'with', 'have', 'that', 'this', 'from', 'been', 'they', 'their', 'there', 'about', 'would', 'could', 'should'].includes(word.toLowerCase())) {
        entities.push(word.toLowerCase());
      }
    }
    
    return [...new Set(entities)];
  }

  private getFallbackData(question: string, category: string): SourceData {
    return {
      source: this.name,
      category: category as MarketCategory,
      fetchedAt: new Date(),
      data: {
        question,
        articles: [],
        analysis: 'News APIs unavailable. Consider checking major news sources manually.',
        sentiment: { positive: 33, negative: 33, neutral: 34 },
        keyFacts: [],
        suggestedSources: [
          'https://news.google.com',
          'https://www.reuters.com',
          'https://apnews.com',
        ],
      },
      confidence: 4000,
      metadata: { fallback: true },
    };
  }

  canHandle(query: ResolutionQuery): boolean {
    // Can handle most non-crypto markets
    return ![MarketCategory.CRYPTO, MarketCategory.FINANCE].includes(
      query.market.category as MarketCategory
    );
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return typeof d.title === 'string' || typeof d.snippet === 'string';
  }
}
