/**
 * Sports Data Adapter
 * Fetches real sports data from multiple free APIs
 */

import { BaseAdapter } from './base-adapter';
import { SourceData, MarketCategory, ResolutionQuery } from '../types';

interface SportScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
  league: string;
  date: string;
}

interface SportsAPIResponse {
  results: SportScore[];
  source: string;
}

export class SportsAdapter extends BaseAdapter {
  public readonly name = 'Sports Data API';
  public readonly category = [MarketCategory.SPORTS];
  public readonly priority = 1;

  // Free sports data sources
  private readonly ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports';
  private readonly THESPORTSDB_API = 'https://www.thesportsdb.com/api/v1/json/3';

  async fetchData(query: ResolutionQuery): Promise<SourceData> {
    const question = query.market.question.toLowerCase();
    const description = query.market.description?.toLowerCase() || '';
    const combinedText = `${question} ${description}`;

    try {
      // Detect sport type and fetch appropriate data
      const sportData = await this.detectAndFetchSport(combinedText, question);
      
      return {
        source: this.name,
        category: MarketCategory.SPORTS,
        fetchedAt: new Date(),
        data: sportData,
        confidence: sportData.results.length > 0 ? 8500 : 5000,
        metadata: {
          sport: sportData.sport,
          matchesFound: sportData.results.length,
        },
      };
    } catch (error) {
      console.error('[Sports Adapter] Error:', error);
      return this.getFallbackData(question);
    }
  }

  private async detectAndFetchSport(combinedText: string, question: string): Promise<any> {
    // Detect sport type
    const sportPatterns: Record<string, { type: string; espnPath: string; keywords: string[] }> = {
      football: {
        type: 'football',
        espnPath: 'football/nfl',
        keywords: ['nfl', 'football', 'touchdown', 'quarterback', 'super bowl', 'chiefs', 'eagles', 'cowboys'],
      },
      soccer: {
        type: 'soccer',
        espnPath: 'soccer/eng.1',
        keywords: ['soccer', 'premier league', 'uefa', 'champions league', 'world cup', 'fifa', 'manchester', 'liverpool', 'arsenal', 'chelsea'],
      },
      basketball: {
        type: 'basketball',
        espnPath: 'basketball/nba',
        keywords: ['nba', 'basketball', 'lakers', 'celtics', 'warriors', 'lebron', 'dunk', 'three-pointer'],
      },
      baseball: {
        type: 'baseball',
        espnPath: 'baseball/mlb',
        keywords: ['mlb', 'baseball', 'world series', 'yankees', 'dodgers', 'home run'],
      },
      hockey: {
        type: 'hockey',
        espnPath: 'hockey/nhl',
        keywords: ['nhl', 'hockey', 'stanley cup', 'puck'],
      },
      tennis: {
        type: 'tennis',
        espnPath: 'tennis',
        keywords: ['tennis', 'wimbledon', 'us open', 'french open', 'australian open', 'grand slam'],
      },
      mma: {
        type: 'mma',
        espnPath: 'mma',
        keywords: ['ufc', 'mma', 'knockout', 'submission', 'cage'],
      },
      boxing: {
        type: 'boxing',
        espnPath: 'boxing',
        keywords: ['boxing', 'heavyweight', 'title fight', 'knockout', 'bout'],
      },
    };

    let detectedSport = 'general';
    let espnPath = 'football/nfl'; // Default

    for (const [sport, config] of Object.entries(sportPatterns)) {
      if (config.keywords.some(kw => combinedText.includes(kw))) {
        detectedSport = sport;
        espnPath = config.espnPath;
        break;
      }
    }

    // Try ESPN API first
    try {
      const espnData = await this.fetchESPNScoreboard(espnPath);
      if (espnData.results.length > 0) {
        return {
          sport: detectedSport,
          results: espnData.results,
          source: 'ESPN',
          question: question,
          analysis: this.analyzeResults(espnData.results, question),
        };
      }
    } catch (error) {
      console.log('[Sports Adapter] ESPN API failed, trying fallback');
    }

    // Fallback to TheSportsDB
    try {
      const sportsDbData = await this.fetchTheSportsDB(detectedSport);
      return {
        sport: detectedSport,
        results: sportsDbData.results,
        source: 'TheSportsDB',
        question: question,
        analysis: this.analyzeResults(sportsDbData.results, question),
      };
    } catch (error) {
      console.log('[Sports Adapter] TheSportsDB failed');
    }

    return {
      sport: detectedSport,
      results: [],
      source: 'none',
      question: question,
      analysis: 'Unable to fetch live sports data. Manual verification required.',
    };
  }

  private async fetchESPNScoreboard(sportPath: string): Promise<SportsAPIResponse> {
    const url = `${this.ESPN_API}/${sportPath}/scoreboard`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PredictSOMNIA/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status}`);
    }

    const data = await response.json();
    const results: SportScore[] = [];

    if (data.events) {
      for (const event of data.events.slice(0, 10)) {
        const competition = event.competitions?.[0];
        if (competition) {
          const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
          const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');
          
          results.push({
            homeTeam: homeTeam?.team?.displayName || 'Unknown',
            awayTeam: awayTeam?.team?.displayName || 'Unknown',
            homeScore: parseInt(homeTeam?.score || '0'),
            awayScore: parseInt(awayTeam?.score || '0'),
            status: event.status?.type?.description || 'Unknown',
            league: event.league?.name || sportPath,
            date: event.date || new Date().toISOString(),
          });
        }
      }
    }

    return { results, source: 'ESPN' };
  }

  private async fetchTheSportsDB(sport: string): Promise<SportsAPIResponse> {
    // TheSportsDB free tier - get recent events
    const leagueIds: Record<string, string> = {
      soccer: '4328', // EPL
      football: '4391', // NFL
      basketball: '4387', // NBA
      baseball: '4424', // MLB
      hockey: '4380', // NHL
    };

    const leagueId = leagueIds[sport] || '4328';
    const url = `${this.THESPORTSDB_API}/eventsseason.php?id=${leagueId}&s=${new Date().getFullYear()}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`TheSportsDB error: ${response.status}`);
    }

    const data = await response.json();
    const results: SportScore[] = [];

    if (data.events) {
      for (const event of data.events.slice(0, 10)) {
        results.push({
          homeTeam: event.strHomeTeam || 'Unknown',
          awayTeam: event.strAwayTeam || 'Unknown',
          homeScore: parseInt(event.intHomeScore || '0'),
          awayScore: parseInt(event.intAwayScore || '0'),
          status: event.strStatus || 'Finished',
          league: event.strLeague || sport,
          date: event.dateEvent || new Date().toISOString(),
        });
      }
    }

    return { results, source: 'TheSportsDB' };
  }

  private analyzeResults(results: SportScore[], question: string): string {
    if (results.length === 0) {
      return 'No matching games found in recent data.';
    }

    // Try to find relevant game from question
    const questionLower = question.toLowerCase();
    const relevantGames = results.filter(game => 
      questionLower.includes(game.homeTeam.toLowerCase()) ||
      questionLower.includes(game.awayTeam.toLowerCase())
    );

    if (relevantGames.length > 0) {
      const game = relevantGames[0];
      return `Found relevant match: ${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam} (${game.status})`;
    }

    return `Found ${results.length} recent games. Most recent: ${results[0].homeTeam} vs ${results[0].awayTeam}`;
  }

  private getFallbackData(question: string): SourceData {
    return {
      source: this.name,
      category: MarketCategory.SPORTS,
      fetchedAt: new Date(),
      data: {
        sport: 'unknown',
        results: [],
        source: 'fallback',
        question: question,
        analysis: 'Sports data APIs unavailable. Resolution requires manual verification.',
        note: 'Consider checking ESPN, official league websites, or sports news for results.',
      },
      confidence: 3000,
      metadata: { fallback: true },
    };
  }

  canHandle(query: ResolutionQuery): boolean {
    const question = query.market.question.toLowerCase();
    const sportsKeywords = [
      'win', 'beat', 'score', 'game', 'match', 'championship', 'final', 'playoff',
      'tournament', 'league', 'season', 'team', 'player', 'mvp', 'goal', 'point',
      'nfl', 'nba', 'mlb', 'nhl', 'ufc', 'fifa', 'uefa', 'premier league',
    ];
    return sportsKeywords.some(kw => question.includes(kw));
  }

  validate(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return Array.isArray(d.results) || typeof d.sport === 'string';
  }
}
