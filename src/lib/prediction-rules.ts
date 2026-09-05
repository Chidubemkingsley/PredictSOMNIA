/**
 * PREDICTION RULES ENGINE
 * 
 * Clear, explicit rules for every prediction category.
 * These rules ensure accurate, consistent, and fair predictions.
 * 
 * RULE CATEGORIES:
 * 1. Cryptocurrency - Price targets, market conditions
 * 2. Movies - Box office, awards, releases
 * 3. Music - Albums, tours, collaborations
 * 4. Relationships - Celebrity events (with uncertainty disclaimers)
 * 5. Entertainment - Games, streaming, media events
 * 6. Technology - Product launches, AI breakthroughs
 * 7. Sports - Game outcomes, championships
 * 8. Politics - Elections, policy changes
 * 9. Weather - Climate events, temperatures
 * 10. DeFi/NFT/Blockchain - TVL, volume, adoption
 */

export interface PredictionRule {
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  evaluationCriteria: string[];
  confidenceGuidelines: {
    high: string;    // When to use 0.8-1.0
    medium: string;  // When to use 0.5-0.8
    low: string;     // When to use 0.3-0.5
  };
  dataSources: string[];
  redFlags: string[];  // Situations that require extra caution
  examples: {
    question: string;
    expectedOutcome: 'YES' | 'NO' | 'UNCERTAIN';
    reasoning: string;
  }[];
}

export interface CategoryRules {
  category: string;
  icon: string;
  generalPrinciples: string[];
  rules: PredictionRule[];
}

/**
 * MASTER PREDICTION RULES DATABASE
 */
export const PREDICTION_RULES: CategoryRules[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTOCURRENCY RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Cryptocurrency',
    icon: '₿',
    generalPrinciples: [
      'Always check CURRENT price before making predictions',
      'Calculate percentage gain/loss required to reach target',
      'Consider historical volatility and ATH (All-Time High)',
      'Account for market cycles (bull/bear markets)',
      'Never predict with high confidence for >50% price moves in short timeframes',
    ],
    rules: [
      {
        category: 'Cryptocurrency',
        subcategory: 'Price Target',
        name: 'Price Target Prediction',
        description: 'Predicting if a cryptocurrency will reach a specific price by a deadline',
        evaluationCriteria: [
          'CURRENT_PRICE: Fetch real-time price from CoinGecko/CoinMarketCap',
          'TARGET_PRICE: Extract from question',
          'PERCENT_CHANGE: Calculate (TARGET - CURRENT) / CURRENT * 100',
          'TIMEFRAME: Days until deadline',
          'ATH_COMPARISON: Is target above or below all-time high?',
          'MARKET_TREND: Is overall crypto market bullish or bearish?',
        ],
        confidenceGuidelines: {
          high: 'Price is already within 10% of target OR target is well below current price',
          medium: 'Price needs 10-30% move, timeframe is adequate (months)',
          low: 'Price needs >50% move OR very short timeframe (<30 days)',
        },
        dataSources: ['CoinGecko API', 'CoinMarketCap API', 'TradingView', 'On-chain data'],
        redFlags: [
          'Target requires >100% gain in <6 months',
          'Target is significantly above ATH with no clear catalyst',
          'Market is in confirmed bear trend',
          'No specific deadline mentioned',
        ],
        examples: [
          {
            question: 'Will Bitcoin reach $150,000 by end of 2027?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'BTC at ~$88k needs 70% gain. Possible in bull market but not guaranteed. Confidence: 35-45%',
          },
          {
            question: 'Will ETH stay above $2,000 in 2027?',
            expectedOutcome: 'YES',
            reasoning: 'ETH at ~$3k is already above target. Would need 33% drop to lose. Confidence: 75%',
          },
        ],
      },
      {
        category: 'Cryptocurrency',
        subcategory: 'Halving Events',
        name: 'Bitcoin Halving Prediction',
        description: 'Predicting Bitcoin halving events or related price effects',
        evaluationCriteria: [
          'HALVING_DATE: Bitcoin halving occurs every ~4 years (210,000 blocks)',
          'LAST_HALVING: April 20, 2024 (block 840,000)',
          'NEXT_HALVING: Approximately April 2028',
          'POST_HALVING_EFFECT: Historically bullish 12-18 months after halving',
        ],
        confidenceGuidelines: {
          high: 'Question about halving dates - these are mathematically determined',
          medium: 'Price predictions related to halving cycle',
          low: 'Timing of price effects from halving',
        },
        dataSources: ['Bitcoin block explorers', 'Historical halving data'],
        redFlags: [
          'Claiming halving in wrong year',
          'Expecting immediate price pump after halving',
        ],
        examples: [
          {
            question: 'Will Bitcoin halving occur in 2027?',
            expectedOutcome: 'NO',
            reasoning: 'Last halving was April 2024. Next is ~2028. Confidence: 99%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVIES RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Movies',
    icon: '🎬',
    generalPrinciples: [
      'Check if movie has been released and actual box office numbers',
      'Compare to franchise history for sequels',
      'Consider release timing (summer blockbusters vs awards season)',
      'Oscar predictions should account for Academy voting patterns',
      'Be aware of current release schedules and delays',
    ],
    rules: [
      {
        category: 'Movies',
        subcategory: 'Box Office',
        name: 'Box Office Prediction',
        description: 'Predicting if a movie will gross a specific amount',
        evaluationCriteria: [
          'FRANCHISE_HISTORY: Previous installments box office',
          'RELEASE_DATE: When is the movie actually releasing?',
          'MARKET_CONDITIONS: Theater attendance trends',
          'COMPETITION: Other movies releasing same time',
          'BUDGET: Production and marketing budget',
          'CURRENT_GROSS: If released, what are actual numbers?',
        ],
        confidenceGuidelines: {
          high: 'Movie already released and we have actual box office data',
          medium: 'Sequel to proven franchise with consistent performance',
          low: 'Original IP or highly variable franchise',
        },
        dataSources: ['Box Office Mojo', 'The Numbers', 'Deadline Hollywood'],
        redFlags: [
          'Movie has been delayed multiple times',
          'Major cast changes from previous installments',
          'Genre typically underperforms at box office',
        ],
        examples: [
          {
            question: 'Will Avatar 3 gross over $2 billion worldwide?',
            expectedOutcome: 'YES',
            reasoning: 'Avatar ($2.9B) and Avatar 2 ($2.3B) both exceeded $2B. Strong franchise. Confidence: 70%',
          },
        ],
      },
      {
        category: 'Movies',
        subcategory: 'Awards',
        name: 'Oscar/Award Prediction',
        description: 'Predicting Academy Award wins',
        evaluationCriteria: [
          'HISTORICAL_WINS: Has this type of film won before?',
          'ACADEMY_PREFERENCES: Oscar voters favor dramas, biopics',
          'CAMPAIGN_STRENGTH: Studios actively campaign for Oscars',
          'COMPETITION: Other likely nominees',
          'GENRE_BIAS: Superhero/action films rarely win Best Picture',
        ],
        confidenceGuidelines: {
          high: 'Awards already announced and we have results',
          medium: 'Strong critical reception AND fits Academy preferences',
          low: 'Genre that historically doesn\'t win major awards',
        },
        dataSources: ['Oscar history database', 'Critics aggregators', 'Awards season tracking'],
        redFlags: [
          'Superhero movie for Best Picture (only 1 nomination ever)',
          'Comedy for Best Picture (rare wins)',
          'Foreign language for non-International Feature categories',
        ],
        examples: [
          {
            question: 'Will a Marvel movie win Best Picture?',
            expectedOutcome: 'NO',
            reasoning: 'Only Black Panther was nominated (lost). Superhero films don\'t fit Academy preferences. Confidence: 85%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MUSIC RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Music',
    icon: '🎵',
    generalPrinciples: [
      'Check artist\'s release history and patterns',
      'Verify current relationships between artists for collaborations',
      'Consider contract obligations and label situations',
      'Tour announcements are usually made 6-12 months ahead',
      'Album cycles typically 1-3 years for major artists',
    ],
    rules: [
      {
        category: 'Music',
        subcategory: 'Album Release',
        name: 'Album Release Prediction',
        description: 'Predicting if an artist will release an album',
        evaluationCriteria: [
          'RELEASE_HISTORY: How often does this artist release albums?',
          'LAST_ALBUM: When was their most recent release?',
          'ANNOUNCEMENTS: Any official teasers or confirmations?',
          'CURRENT_ACTIVITY: On tour? In studio? Taking break?',
          'CONTRACT_STATUS: Any label disputes or changes?',
        ],
        confidenceGuidelines: {
          high: 'Album officially announced with release date',
          medium: 'Artist due for release based on historical pattern',
          low: 'No announcements, artist on hiatus or irregular schedule',
        },
        dataSources: ['Official artist announcements', 'Music news sites', 'Record label press'],
        redFlags: [
          'Artist on indefinite hiatus',
          'Recent major life changes (health, personal)',
          'Label contract disputes',
        ],
        examples: [
          {
            question: 'Will Taylor Swift release a new album in 2026-2027?',
            expectedOutcome: 'YES',
            reasoning: 'Taylor releases every 1-2 years. Last album April 2024. Pattern suggests 2025-2026 release. Confidence: 80%',
          },
        ],
      },
      {
        category: 'Music',
        subcategory: 'Collaboration',
        name: 'Artist Collaboration Prediction',
        description: 'Predicting if two artists will collaborate',
        evaluationCriteria: [
          'RELATIONSHIP_STATUS: Are they friends, rivals, or neutral?',
          'HISTORY: Have they collaborated before?',
          'GENRE_COMPATIBILITY: Do their styles match?',
          'PUBLIC_STATEMENTS: Any hints or denials?',
          'BEEF_STATUS: Is there active conflict between them?',
        ],
        confidenceGuidelines: {
          high: 'Collaboration already announced or released',
          medium: 'Artists are friends, have collaborated before, no conflicts',
          low: 'Unknown relationship or potential tensions',
        },
        dataSources: ['Social media', 'Interview transcripts', 'Music news'],
        redFlags: [
          'ACTIVE FEUD OR BEEF - Extremely unlikely to collaborate',
          'Diss tracks released against each other',
          'Public statements refusing to work together',
          'Different labels with bad relationships',
        ],
        examples: [
          {
            question: 'Will Drake and Kendrick Lamar collaborate?',
            expectedOutcome: 'NO',
            reasoning: 'ACTIVE BEEF since 2024 with multiple diss tracks. Public feud. Confidence: 95% NO',
          },
          {
            question: 'Will The Weeknd collaborate with Post Malone?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'No beef, similar genres, but no history of collaboration. Confidence: 50%',
          },
        ],
      },
      {
        category: 'Music',
        subcategory: 'Group Reunion',
        name: 'Band/Group Reunion Prediction',
        description: 'Predicting if a band or group will reunite',
        evaluationCriteria: [
          'BREAKUP_REASON: Why did they split? Amicable or bitter?',
          'MEMBER_STATUS: Where are individual members now?',
          'ANNIVERSARY: Any significant anniversaries coming up?',
          'LEGAL_ISSUES: Any lawsuits or rights disputes?',
          'FINANCIAL_INCENTIVE: Reunion tours are lucrative',
        ],
        confidenceGuidelines: {
          high: 'Reunion announced or members publicly discussing it',
          medium: 'Amicable split, members have hinted at reunion',
          low: 'Bitter breakup, ongoing disputes, member deceased',
        },
        dataSources: ['Band/member social media', 'Music news', 'Interview archives'],
        redFlags: [
          'Member has passed away',
          'Ongoing lawsuits between members',
          'Public statements ruling out reunion',
        ],
        examples: [
          {
            question: 'Will BTS reunite for a tour by 2026?',
            expectedOutcome: 'YES',
            reasoning: 'All members completing military service by 2025. Group hiatus (not breakup). Company confirmed reunion plans. Confidence: 85%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATIONSHIPS RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Relationships',
    icon: '💕',
    generalPrinciples: [
      'Celebrity relationship predictions are INHERENTLY SPECULATIVE',
      'Always use LOW confidence (30-50%) unless engagement/wedding announced',
      'Private life events cannot be predicted with accuracy',
      'Media rumors are unreliable indicators',
      'Respect privacy - these are real people',
    ],
    rules: [
      {
        category: 'Relationships',
        subcategory: 'Engagement/Wedding',
        name: 'Celebrity Engagement Prediction',
        description: 'Predicting if celebrities will get engaged or married',
        evaluationCriteria: [
          'RELATIONSHIP_STATUS: Are they currently dating?',
          'RELATIONSHIP_DURATION: How long together?',
          'PUBLIC_STATEMENTS: Any hints about future plans?',
          'PREVIOUS_RELATIONSHIPS: Pattern of long engagements or quick marriages?',
          'AGE_FACTOR: Are they at typical marriage age for their culture?',
        ],
        confidenceGuidelines: {
          high: 'Engagement/wedding already announced - verify date',
          medium: 'NEVER use medium confidence for unannounced relationships',
          low: 'ALL unannounced engagement predictions should be 30-45%',
        },
        dataSources: ['Verified news sources only', 'Official announcements'],
        redFlags: [
          'SPECULATION ONLY - No official announcement',
          'Tabloid rumors are NOT reliable sources',
          'Recent breakup rumors',
          'Known to be very private about relationships',
        ],
        examples: [
          {
            question: 'Will Zendaya and Tom Holland get engaged in 2027?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Dating since 2021, stable relationship, but NO announcements. Private couple. Confidence: MAX 40%',
          },
        ],
      },
      {
        category: 'Relationships',
        subcategory: 'Breakup',
        name: 'Celebrity Breakup Prediction',
        description: 'Predicting if celebrities will break up',
        evaluationCriteria: [
          'CURRENT_STATUS: Any recent public appearances together?',
          'MEDIA_REPORTS: Credible breakup rumors?',
          'RELATIONSHIP_HISTORY: Known for long or short relationships?',
          'WORK_CONFLICTS: Are their careers causing strain?',
        ],
        confidenceGuidelines: {
          high: 'Breakup already confirmed by representatives',
          medium: 'Never - breakup predictions should always be low confidence',
          low: 'All unconfirmed breakup predictions: 30-40%',
        },
        dataSources: ['Official statements', 'Verified news'],
        redFlags: [
          'Predicting breakups can be harmful speculation',
          'Tabloids frequently report false breakups',
        ],
        examples: [
          {
            question: 'Will [celebrity couple] break up in 2027?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Cannot predict private relationship decisions. Max confidence: 35%',
          },
        ],
      },
      {
        category: 'Relationships',
        subcategory: 'Baby Announcement',
        name: 'Celebrity Baby Prediction',
        description: 'Predicting if celebrities will announce pregnancy/baby',
        evaluationCriteria: [
          'CURRENT_CHILDREN: Do they already have kids?',
          'AGE: Is pregnancy medically likely?',
          'PUBLIC_STATEMENTS: Have they discussed wanting (more) children?',
          'RELATIONSHIP_STABILITY: Are they in stable relationship?',
        ],
        confidenceGuidelines: {
          high: 'Pregnancy already announced - verify due date',
          medium: 'Never for unannounced pregnancies',
          low: 'All speculation about future pregnancies: 25-40%',
        },
        dataSources: ['Official announcements only'],
        redFlags: [
          'This is HIGHLY personal speculation',
          'Health information is private',
          'Never assume based on appearance',
        ],
        examples: [
          {
            question: 'Will Royal family announce a new baby?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'William & Kate have 3 children. No announcements. Pure speculation. Confidence: 30-35%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERTAINMENT/GAMING RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Entertainment',
    icon: '🎮',
    generalPrinciples: [
      'Check official announcements from companies',
      'Game delays are COMMON - factor this into predictions',
      'Streaming numbers are usually public or estimated',
      'Consider company track record for release dates',
      'E3/Game Awards often have major announcements',
    ],
    rules: [
      {
        category: 'Entertainment',
        subcategory: 'Game Release',
        name: 'Video Game Release Prediction',
        description: 'Predicting if a game will release by a certain date',
        evaluationCriteria: [
          'OFFICIAL_DATE: Has release date been announced?',
          'COMPANY_HISTORY: Does this company usually delay?',
          'DEVELOPMENT_STATUS: Alpha, beta, gold master?',
          'RECENT_NEWS: Any delay announcements or issues?',
          'MARKETING_PUSH: Are they actively marketing for release?',
        ],
        confidenceGuidelines: {
          high: 'Game has "gone gold" (finished development) OR already released',
          medium: 'Official release date announced, no delay signals',
          low: '"Release window" only (e.g., "Fall 2025") OR history of delays',
        },
        dataSources: ['Official company announcements', 'Gaming news sites', 'Press releases'],
        redFlags: [
          'Company has history of delays (e.g., CD Projekt Red)',
          'Only "release window" not specific date',
          'Development issues reported',
          'Key staff departures',
        ],
        examples: [
          {
            question: 'Will GTA 6 release before December 2027?',
            expectedOutcome: 'YES',
            reasoning: 'Rockstar officially confirmed Fall 2025 release. Trailer released. Active marketing. Confidence: 80-85%',
          },
          {
            question: 'Will Elder Scrolls 6 release in 2027?',
            expectedOutcome: 'NO',
            reasoning: 'Bethesda confirmed it\'s years away. Still in early development. Confidence: 95% NO',
          },
        ],
      },
      {
        category: 'Entertainment',
        subcategory: 'Streaming',
        name: 'Streaming Service Prediction',
        description: 'Predicting streaming susomniariber counts or market position',
        evaluationCriteria: [
          'CURRENT_SUSomniaRIBERS: Latest reported numbers',
          'GROWTH_TREND: Gaining or losing susomniaribers?',
          'CONTENT_SLATE: Major releases planned?',
          'PRICE_CHANGES: Any recent price increases?',
          'COMPETITION: Market share trends',
        ],
        confidenceGuidelines: {
          high: 'Predicting current leader to maintain lead short-term',
          medium: 'Predicting continued trends',
          low: 'Predicting major market shifts',
        },
        dataSources: ['Company earnings reports', 'Industry analysts', 'Trade publications'],
        redFlags: [
          'Streaming market is highly volatile',
          'Susomniariber definitions vary by company',
          'Account sharing crackdowns affect numbers',
        ],
        examples: [
          {
            question: 'Will Netflix be surpassed in susomniaribers by 2026?',
            expectedOutcome: 'NO',
            reasoning: 'Netflix has 280M+ susomniaribers. Nearest competitor ~150M. Would need massive shift. Confidence: 70-75%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TECHNOLOGY RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Technology',
    icon: '💻',
    generalPrinciples: [
      'Check official product announcements and roadmaps',
      'Tech companies often have predictable release cycles',
      '"Breakthrough" predictions are inherently speculative',
      'Consider regulatory environment for certain technologies',
      'AI capabilities are advancing rapidly - be cautious about limits',
    ],
    rules: [
      {
        category: 'Technology',
        subcategory: 'Product Launch',
        name: 'Tech Product Launch Prediction',
        description: 'Predicting if a tech product will launch',
        evaluationCriteria: [
          'OFFICIAL_ANNOUNCEMENTS: Has launch been confirmed?',
          'COMPANY_CYCLE: When does company usually release? (Apple = September)',
          'LEAKS_RUMORS: Credible supply chain reports?',
          'REGULATORY_STATUS: Any approvals needed?',
          'PREVIOUS_DELAYS: History of delays for this product line?',
        ],
        confidenceGuidelines: {
          high: 'Official announcement with date, or product already launched',
          medium: 'Fits company\'s historical release pattern',
          low: 'Rumors only, no official confirmation',
        },
        dataSources: ['Company announcements', 'SEC filings', 'Supply chain reports'],
        redFlags: [
          'Product never officially announced',
          'Component shortages reported',
          'Company restructuring',
        ],
        examples: [
          {
            question: 'Will Apple release iPhone 17 in September 2027?',
            expectedOutcome: 'YES',
            reasoning: 'Apple has released iPhones in September for 10+ years. Predictable cycle. Confidence: 90%',
          },
        ],
      },
      {
        category: 'Technology',
        subcategory: 'AI Breakthrough',
        name: 'AI/Technology Breakthrough Prediction',
        description: 'Predicting major AI or tech breakthroughs',
        evaluationCriteria: [
          'DEFINITION: What specifically counts as a "breakthrough"?',
          'CURRENT_STATE: Where is technology today?',
          'RESEARCH_PROGRESS: Are labs reporting progress?',
          'TIMELINE: Is this achievable in timeframe?',
          'VERIFICATION: How would we verify this occurred?',
        ],
        confidenceGuidelines: {
          high: 'Never - "breakthroughs" are unpredictable by definition',
          medium: 'Incremental improvements on existing capabilities',
          low: 'True novel breakthroughs: 40-50% max',
        },
        dataSources: ['Academic papers', 'Company research blogs', 'AI safety organizations'],
        redFlags: [
          '"Breakthrough" is vague and subjective',
          'AGI predictions are highly speculative',
          'Hype cycles common in AI',
        ],
        examples: [
          {
            question: 'Will AI achieve AGI by 2027?',
            expectedOutcome: 'NO',
            reasoning: 'AGI is not clearly defined. No consensus it\'s close. Confidence: 85% NO',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEFI / NFT / BLOCKCHAIN RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'DeFi',
    icon: '💎',
    generalPrinciples: [
      'Check current TVL (Total Value Locked) on DeFiLlama',
      'TVL is heavily correlated with crypto prices',
      'Protocol-specific risks (hacks, exploits) are unpredictable',
      'Regulatory changes can dramatically affect DeFi',
      'New protocols can rapidly gain or lose TVL',
    ],
    rules: [
      {
        category: 'DeFi',
        subcategory: 'TVL',
        name: 'Total Value Locked Prediction',
        description: 'Predicting TVL targets for DeFi',
        evaluationCriteria: [
          'CURRENT_TVL: Check DeFiLlama for current numbers',
          'HISTORICAL_HIGH: What was peak TVL?',
          'MARKET_CONDITIONS: Bull or bear market?',
          'GROWTH_RATE: Current trajectory',
          'PRICE_CORRELATION: TVL often follows ETH/BTC prices',
        ],
        confidenceGuidelines: {
          high: 'Current TVL already exceeds target',
          medium: 'Target within historical range, market supportive',
          low: 'Target requires new ATH in bear market',
        },
        dataSources: ['DeFiLlama', 'Protocol dashboards', 'Dune Analytics'],
        redFlags: [
          'TVL can drop 50%+ in market crashes',
          'Major hacks can eliminate TVL overnight',
          'Regulatory crackdowns',
        ],
        examples: [
          {
            question: 'Will DeFi TVL exceed $500B in 2027?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Current TVL ~$100B. Would need 5x growth. Possible in extreme bull market only. Confidence: 35%',
          },
        ],
      },
    ],
  },
  {
    category: 'NFT',
    icon: '🖼️',
    generalPrinciples: [
      'NFT market has cooled significantly from 2021-2022 peak',
      'Volume is highly volatile and speculative',
      'Blue-chip NFTs (BAYC, Punks) more stable than overall market',
      'New narratives can revive market temporarily',
      'Many NFT projects have gone to zero',
    ],
    rules: [
      {
        category: 'NFT',
        subcategory: 'Market Volume',
        name: 'NFT Market Volume Prediction',
        description: 'Predicting NFT trading volume',
        evaluationCriteria: [
          'CURRENT_VOLUME: Check OpenSea, Blur, etc.',
          'PEAK_VOLUME: 2021-2022 peak was ~$25B/month',
          'TREND: Is volume increasing or decreasing?',
          'CATALYSTS: Any major NFT launches coming?',
          'MARKET_SENTIMENT: General crypto market health',
        ],
        confidenceGuidelines: {
          high: 'Never for aggressive growth predictions',
          medium: 'Market maintains current range',
          low: 'Predictions of market recovery to 2021 levels',
        },
        dataSources: ['OpenSea', 'Blur', 'CryptoSlam', 'DappRadar'],
        redFlags: [
          'NFT market is highly speculative',
          '90%+ of NFTs have lost significant value',
          'Market structure has changed (royalties, etc.)',
        ],
        examples: [
          {
            question: 'Will NFT market volume exceed $50B in 2027?',
            expectedOutcome: 'NO',
            reasoning: 'Current annual volume ~$10-15B. Market cooled significantly. Would need 3-4x growth. Confidence: 70% NO',
          },
        ],
      },
    ],
  },
  {
    category: 'Blockchain',
    icon: '⛓️',
    generalPrinciples: [
      'Transaction volumes are measurable on block explorers',
      'Network upgrades follow published roadmaps',
      'Adoption metrics vary widely in definition',
      'Layer 2 solutions complicate "activity" measurements',
      'Gas fees indicate network congestion',
    ],
    rules: [
      {
        category: 'Blockchain',
        subcategory: 'Transaction Volume',
        name: 'Blockchain Activity Prediction',
        description: 'Predicting transaction volumes or network activity',
        evaluationCriteria: [
          'CURRENT_METRICS: Check block explorer for current stats',
          'HISTORICAL_DATA: What are typical ranges?',
          'GROWTH_DRIVERS: What would increase activity?',
          'NETWORK_UPGRADES: Any scaling improvements coming?',
          'COMPETITOR_ACTIVITY: Is activity shifting to other chains?',
        ],
        confidenceGuidelines: {
          high: 'Current activity already exceeds target',
          medium: 'Target within historical range',
          low: 'Target requires significant growth beyond historical norms',
        },
        dataSources: ['Block explorers (Etherscan, SomniaScan)', 'L2Beat', 'Artemis'],
        redFlags: [
          'Bot activity can inflate transaction counts',
          'Network congestion can suppress activity',
          'Definition of "transaction" varies',
        ],
        examples: [
          {
            question: 'Will Ethereum process 2M daily transactions?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Current ~1.1M/day. Would need ~80% growth. Possible but not guaranteed. Confidence: 45%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Sports',
    icon: '🏆',
    generalPrinciples: [
      'Check if game/event has already occurred',
      'Verify current standings and team performance',
      'Injuries significantly impact predictions',
      'Home field advantage matters',
      'Historical head-to-head records are relevant',
    ],
    rules: [
      {
        category: 'Sports',
        subcategory: 'Game Outcome',
        name: 'Game Result Prediction',
        description: 'Predicting who wins a specific game',
        evaluationCriteria: [
          'GAME_STATUS: Has game been played? What was result?',
          'TEAM_RECORDS: Current win-loss records',
          'HEAD_TO_HEAD: Historical matchup results',
          'INJURIES: Key players out?',
          'HOME_AWAY: Where is game being played?',
          'BETTING_LINES: What do oddsmakers say?',
        ],
        confidenceGuidelines: {
          high: 'Game already played - verify actual result',
          medium: 'Clear favorite based on standings and betting lines',
          low: 'Evenly matched teams or upset potential',
        },
        dataSources: ['ESPN', 'Official league sites', 'Sports Reference'],
        redFlags: [
          'Upsets happen frequently in sports',
          'Last-minute injuries change everything',
          'Playoff games are more unpredictable',
        ],
        examples: [
          {
            question: 'Will the Chiefs win the Super Bowl?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Strong team but playoffs are unpredictable. Many good teams. Confidence: 30-40%',
          },
        ],
      },
      {
        category: 'Sports',
        subcategory: 'Championship',
        name: 'Championship Prediction',
        description: 'Predicting season/tournament winners',
        evaluationCriteria: [
          'SEASON_STATUS: How far into season? Playoffs started?',
          'CURRENT_STANDINGS: Who is leading?',
          'HISTORICAL_PERFORMANCE: Recent championship history',
          'ROSTER_STRENGTH: Key players, depth',
          'SCHEDULE: Remaining games difficulty',
        ],
        confidenceGuidelines: {
          high: 'Championship already decided OR team has clinched',
          medium: 'Clear frontrunner late in season',
          low: 'Early season OR competitive field',
        },
        dataSources: ['ESPN', 'League official sites', 'Sports analytics sites'],
        redFlags: [
          'Predicting champions before playoffs is risky',
          'Injuries can derail any team',
          '"Best team" doesn\'t always win championship',
        ],
        examples: [
          {
            question: 'Will Team X win the championship?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Championships are hard to predict. Even favorites have <50% chance. Confidence: 25-40%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POLITICS RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Politics',
    icon: '🗳️',
    generalPrinciples: [
      'Elections have occurred or have clear polling data',
      'Policy predictions are highly uncertain',
      'Geopolitical events are unpredictable',
      'Verify current political landscape',
      'Avoid partisan assumptions',
    ],
    rules: [
      {
        category: 'Politics',
        subcategory: 'Elections',
        name: 'Election Outcome Prediction',
        description: 'Predicting election results',
        evaluationCriteria: [
          'ELECTION_DATE: Has election occurred?',
          'POLLING_DATA: What do aggregated polls show?',
          'HISTORICAL_PATTERNS: How does region typically vote?',
          'INCUMBENCY: Is incumbent running?',
          'ECONOMIC_CONDITIONS: Economy affects elections',
        ],
        confidenceGuidelines: {
          high: 'Election already held - verify actual results',
          medium: 'Strong polling lead (>5%) close to election',
          low: 'Tight polls OR election far away',
        },
        dataSources: ['Official election results', 'FiveThirtyEight', 'RealClearPolitics'],
        redFlags: [
          'Polls can be wrong (2016, 2020 lessons)',
          'Late-breaking news changes races',
          'Turnout is unpredictable',
        ],
        examples: [
          {
            question: 'Will [candidate] win [election]?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Elections are inherently uncertain. Even strong leads can evaporate. Max confidence: 60-70%',
          },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER RULES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'Weather',
    icon: '🌤️',
    generalPrinciples: [
      'Short-term forecasts (1-3 days) are reliable',
      'Long-term forecasts (>7 days) become increasingly uncertain',
      'Climate patterns (El Niño, La Niña) affect seasonal predictions',
      'Extreme weather events are hard to predict',
      'Use official meteorological data',
    ],
    rules: [
      {
        category: 'Weather',
        subcategory: 'Temperature',
        name: 'Temperature Prediction',
        description: 'Predicting temperature thresholds',
        evaluationCriteria: [
          'FORECAST_DATA: What do weather services predict?',
          'HISTORICAL_AVERAGES: What is normal for this time/place?',
          'CLIMATE_PATTERNS: Any El Niño/La Niña effects?',
          'TIMEFRAME: How far out is prediction?',
        ],
        confidenceGuidelines: {
          high: '1-3 day forecast with clear weather pattern',
          medium: '4-7 day forecast',
          low: '>7 day forecast OR extreme weather prediction',
        },
        dataSources: ['NOAA', 'Weather.gov', 'Open-Meteo', 'AccuWeather'],
        redFlags: [
          'Long-range forecasts are unreliable',
          'Microclimates can vary significantly',
          'Climate change making historical data less reliable',
        ],
        examples: [
          {
            question: 'Will it snow in NYC on Christmas?',
            expectedOutcome: 'UNCERTAIN',
            reasoning: 'Historical probability ~20-25%. Depends on exact forecast timing. Confidence: 30-40%',
          },
        ],
      },
    ],
  },
];

/**
 * Get rules for a specific category
 */
export function getRulesForCategory(category: string): CategoryRules | undefined {
  return PREDICTION_RULES.find(
    r => r.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get specific rule by category and subcategory
 */
export function getSpecificRule(category: string, subcategory: string): PredictionRule | undefined {
  const categoryRules = getRulesForCategory(category);
  if (!categoryRules) return undefined;
  
  return categoryRules.rules.find(
    r => r.subcategory?.toLowerCase() === subcategory.toLowerCase()
  );
}

/**
 * Get all red flags for a category
 */
export function getRedFlagsForCategory(category: string): string[] {
  const categoryRules = getRulesForCategory(category);
  if (!categoryRules) return [];
  
  const allRedFlags: string[] = [];
  categoryRules.rules.forEach(rule => {
    allRedFlags.push(...rule.redFlags);
  });
  
  return [...new Set(allRedFlags)]; // Remove duplicates
}

/**
 * Detect category from question text
 */
export function detectCategoryFromQuestion(question: string): string {
  const q = question.toLowerCase();
  
  // Cryptocurrency keywords
  if (q.match(/\b(bitcoin|btc|ethereum|eth|bnb|crypto|solana|cardano|xrp|dogecoin|defi|nft)\b/)) {
    if (q.includes('tvl') || q.includes('defi')) return 'DeFi';
    if (q.includes('nft')) return 'NFT';
    return 'Cryptocurrency';
  }
  
  // Movies
  if (q.match(/\b(movie|film|box office|oscar|academy award|gross|billion|avatar|marvel|nolan)\b/)) {
    return 'Movies';
  }
  
  // Music
  if (q.match(/\b(album|song|tour|concert|artist|singer|band|taylor swift|drake|kendrick|bts|grammy)\b/)) {
    return 'Music';
  }
  
  // Relationships
  if (q.match(/\b(engag|wedding|married|dating|relationship|couple|baby|pregnant|divorce|kardashian|royal)\b/)) {
    return 'Relationships';
  }
  
  // Entertainment/Gaming
  if (q.match(/\b(game|gta|playstation|xbox|nintendo|streaming|netflix|disney\+|release|launch)\b/)) {
    return 'Entertainment';
  }
  
  // Technology
  if (q.match(/\b(ai|artificial intelligence|iphone|apple|google|microsoft|breakthrough|tech|agi)\b/)) {
    return 'Technology';
  }
  
  // Sports
  if (q.match(/\b(super bowl|nfl|nba|mlb|championship|team|player|score|win|game|playoffs)\b/)) {
    return 'Sports';
  }
  
  // Politics
  if (q.match(/\b(election|vote|president|senate|congress|political|policy|law)\b/)) {
    return 'Politics';
  }
  
  // Weather
  if (q.match(/\b(weather|temperature|rain|snow|hurricane|climate|forecast)\b/)) {
    return 'Weather';
  }
  
  // Blockchain
  if (q.match(/\b(blockchain|transaction|network|layer 2|scaling|upgrade)\b/)) {
    return 'Blockchain';
  }
  
  return 'General';
}

/**
 * Build a rules-based prompt enhancement for AI
 */
export function buildRulesPrompt(question: string, category: string): string {
  const categoryRules = getRulesForCategory(category);
  
  if (!categoryRules) {
    return `
## General Prediction Rules
- Be honest about uncertainty
- Use data-driven analysis
- Calibrate confidence appropriately
- Consider if event has already occurred
`;
  }
  
  let prompt = `
## CATEGORY: ${categoryRules.category} ${categoryRules.icon}

### General Principles for ${categoryRules.category}:
${categoryRules.generalPrinciples.map(p => `- ${p}`).join('\n')}

### Evaluation Criteria:
`;

  // Add relevant rules
  for (const rule of categoryRules.rules) {
    prompt += `
#### ${rule.name}
${rule.evaluationCriteria.map(c => `- ${c}`).join('\n')}

**Confidence Guidelines:**
- HIGH (0.8-1.0): ${rule.confidenceGuidelines.high}
- MEDIUM (0.5-0.8): ${rule.confidenceGuidelines.medium}
- LOW (0.3-0.5): ${rule.confidenceGuidelines.low}

**RED FLAGS (reduce confidence if present):**
${rule.redFlags.map(r => `⚠️ ${r}`).join('\n')}
`;
  }

  return prompt;
}

/**
 * Special case handlers for known predictions
 */
export const SPECIAL_CASE_RULES: Record<string, {
  pattern: RegExp;
  outcome: boolean | 'uncertain';
  confidence: number;
  reasoning: string;
}> = {
  // Drake + Kendrick = NO (active beef)
  'drake_kendrick_collab': {
    pattern: /drake.*kendrick|kendrick.*drake/i,
    outcome: false,
    confidence: 0.95,
    reasoning: 'Drake and Kendrick Lamar have been in an active feud since 2024 with multiple diss tracks. Collaboration is extremely unlikely.',
  },
  // Bitcoin halving timing
  'btc_halving_2025': {
    pattern: /bitcoin.*halving.*202[5-7]|halving.*bitcoin.*202[5-7]/i,
    outcome: false,
    confidence: 0.99,
    reasoning: 'Bitcoin halving occurred in April 2024. Next halving is approximately April 2028.',
  },
  // GTA 6 release
  'gta6_2025': {
    pattern: /gta\s*(6|vi).*202[5]/i,
    outcome: true,
    confidence: 0.85,
    reasoning: 'Rockstar officially announced GTA 6 for Fall 2025. Trailer released December 2023.',
  },
  // BTS reunion
  'bts_reunion': {
    pattern: /bts.*reunion|bts.*tour.*202[5-6]/i,
    outcome: true,
    confidence: 0.85,
    reasoning: 'All BTS members complete military service by 2025. HYBE has confirmed group activities will resume.',
  },
};

/**
 * Check if question matches any special case
 */
export function checkSpecialCase(question: string): {
  outcome: boolean | 'uncertain';
  confidence: number;
  reasoning: string;
} | null {
  for (const [, rule] of Object.entries(SPECIAL_CASE_RULES)) {
    if (rule.pattern.test(question)) {
      return {
        outcome: rule.outcome,
        confidence: rule.confidence,
        reasoning: rule.reasoning,
      };
    }
  }
  return null;
}

export default PREDICTION_RULES;
