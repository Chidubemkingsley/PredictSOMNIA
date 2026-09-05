/**
 * DEPRECATED - Static Market Data
 * 
 * ⚠️ THIS FILE IS NO LONGER USED
 * 
 * As of December 22, 2025, the application is 100% blockchain-driven
 * with no static data fallback. This file is kept for reference only.
 * 
 * All market data is fetched directly from:
 * - Somnia Shannon Testnet Smart Contracts
 * - PredictionMarket contract (main market data)
 * - TraderReputation contract (user statistics)
 * - AIOracle contract (market resolution)
 * 
 * To use real blockchain data:
 * 1. Connect your wallet
 * 2. Set NEXT_PUBLIC_USE_STATIC_DATA=false in your .env.local
 * 3. Ensure NEXT_PUBLIC_DEFAULT_CHAIN_ID=97 (Somnia Shannon Testnet)
 * 
 * See: src/hooks/useContracts.ts for blockchain data fetching
 */

import { parseEther } from 'viem';

export interface StaticMarketData {
  id: bigint;
  question: string;
  description: string;
  category: string;
  creator: string;
  endTime: bigint;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  resolved: boolean;
  outcome: boolean;
  resolvedAt: bigint;
  aiOracleEnabled: boolean;
}

// Demo wallet addresses (realistic looking)
const DEMO_CREATORS = {
  artist: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  brand: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  community: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
};

// Calculate end times (realistic dates)
const now = Math.floor(Date.now() / 1000);
const DAY = 86400;

export const STATIC_MARKETS: StaticMarketData[] = [
  // CRYPTO PRICE PREDICTIONS
  {
    id: 1n,
    question: "Will Bitcoin reach $150,000 by end of Q1 2026?",
    description: "BTC currently at $106K. Institutional adoption accelerating with BlackRock ETF inflows hitting $2.1B weekly. MicroStrategy buying, halving effects materializing. Resolution: Resolves YES if BTC trades at or above $150,000 on CoinGecko at any point before March 31, 2026 11:59 PM UTC.",
    category: "Crypto",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 103 * DAY),
    totalYesAmount: parseEther('845.2'),
    totalNoAmount: parseEther('634.8'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 2n,
    question: "Will Ethereum reach $6,000 before March 2026?",
    description: "ETH at $3,942. Pectra upgrade launching Jan 2026 with major scalability improvements. Staking yields attractive at 3.2%. Institutional interest growing. Resolution: Resolves YES if ETH trades at or above $6,000 on CoinGecko at any point before March 1, 2026 12:00 AM UTC.",
    category: "Crypto",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 73 * DAY),
    totalYesAmount: parseEther('623.7'),
    totalNoAmount: parseEther('489.3'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 3n,
    question: "Will Solana flip BNB in market cap by February 2026?",
    description: "SOL at $213 ($103B mcap) vs BNB at $108B. Solana's DeFi TVL growing 40% monthly. Firedancer upgrade promising 1M TPS. Memecoin mania driving adoption. Resolution: Resolves YES if SOL market cap exceeds BNB market cap on CoinGecko at any point before February 28, 2026 11:59 PM UTC.",
    category: "Crypto",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 45 * DAY),
    totalYesAmount: parseEther('534.9'),
    totalNoAmount: parseEther('412.1'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // DEFI PROTOCOLS
  {
    id: 4n,
    question: "Will Aave TVL surpass $50B before end of Q1 2026?",
    description: "Currently at $33.2B with strong momentum. V4 launch imminent with cross-chain liquidity. Real-world assets integration attracting institutions. DeFi leader. Resolution: Resolves YES if Aave protocol shows TVL of $50B or more on DeFiLlama at any point before March 31, 2026 11:59 PM UTC.",
    category: "DeFi",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 103 * DAY),
    totalYesAmount: parseEther('712.4'),
    totalNoAmount: parseEther('487.9'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 5n,
    question: "Will Uniswap v4 process $100B total volume by March 2026?",
    description: "V4 hooks revolutionizing AMM design. Currently processing $1.8B daily. Fee switch debate resolved. Institutional integrations with Paradigm backing. Resolution: Resolves YES if Uniswap v4 cumulative volume since launch reaches $100B on Dune Analytics before March 20, 2026 11:59 PM UTC.",
    category: "DeFi",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 92 * DAY),
    totalYesAmount: parseEther('489.6'),
    totalNoAmount: parseEther('398.4'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 6n,
    question: "Will MakerDAO migrate 80%+ of DAI to USDS before February 2026?",
    description: "USDS stablecoin replacing DAI. $5B locked in migration contracts. Governance vote passed 89%. New tokenomics launching. DeFi OG's biggest transformation. Resolution: Resolves YES if 80% or more of DAI supply is converted to USDS according to official Sky Protocol dashboard before February 28, 2026 11:59 PM UTC.",
    category: "DeFi",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 62 * DAY),
    totalYesAmount: parseEther('612.8'),
    totalNoAmount: parseEther('445.2'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // NFT & GAMING
  {
    id: 7n,
    question: "Will Azuki Elementals floor price exceed 3 ETH by Q1 2026?",
    description: "Currently at 1.2 ETH. Anime studio partnership announced. Physical redemptions launching. Chiru Labs rebuilding trust after rocky launch. Community hopeful. Resolution: Resolves YES if Azuki Elementals floor price on OpenSea is 3 ETH or higher at any point before March 31, 2026 11:59 PM UTC.",
    category: "NFT",
    creator: DEMO_CREATORS.artist,
    endTime: BigInt(now + 95 * DAY),
    totalYesAmount: parseEther('234.5'),
    totalNoAmount: parseEther('312.7'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 8n,
    question: "Will Illuvium exceed 100K monthly active players by March 2026?",
    description: "Open beta launched with 45K players. AAA graphics and gameplay. $72M raised. Polygon zkEVM integration smooth. GameFi finally delivering on promise. Resolution: Resolves YES if Illuvium reports 100K+ monthly active users via official blog/Twitter or DappRadar shows 100K+ UAW before March 20, 2026 11:59 PM UTC.",
    category: "NFT",
    creator: DEMO_CREATORS.brand,
    endTime: BigInt(now + 82 * DAY),
    totalYesAmount: parseEther('456.9'),
    totalNoAmount: parseEther('378.1'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // ALTCOINS
  {
    id: 9n,
    question: "Will Chainlink reach $50 before end of Q1 2026?",
    description: "LINK at $28.34. CCIP adoption exploding with SWIFT partnership. Staking v0.2 launching. Banking giants testing oracles. 900+ integrations and growing. Resolution: Resolves YES if LINK trades at or above $50 on CoinGecko at any point before March 31, 2026 11:59 PM UTC.",
    category: "Crypto",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 103 * DAY),
    totalYesAmount: parseEther('678.3'),
    totalNoAmount: parseEther('521.7'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 10n,
    question: "Will Arbitrum TVL exceed Optimism by February 2026?",
    description: "ARB at $8.2B TVL vs OP at $7.1B. Stylus upgrade enabling Rust contracts. Gaming partnerships announced. L2 wars heating up. Ethereum scaling battle. Resolution: Resolves YES if Arbitrum TVL exceeds Optimism TVL on L2Beat at any point before February 14, 2026 11:59 PM UTC.",
    category: "DeFi",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 58 * DAY),
    totalYesAmount: parseEther('512.6'),
    totalNoAmount: parseEther('434.4'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // CRYPTO EVENTS
  {
    id: 11n,
    question: "Will Bitcoin ETF options launch before March 2026?",
    description: "SEC reviewing applications from Cboe, CME. BlackRock lobbying heavily. $56B in ETF inflows creating demand. Options could unlock $100B+ in derivatives. Resolution: Resolves YES if any U.S. exchange (Cboe, CME, Nasdaq) begins trading options on a spot Bitcoin ETF with SEC approval before March 10, 2026 11:59 PM UTC.",
    category: "Crypto",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 82 * DAY),
    totalYesAmount: parseEther('723.4'),
    totalNoAmount: parseEther('512.6'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 12n,
    question: "Will Ethereum ETF inflows exceed $10B by end of Q1 2026?",
    description: "Currently at $3.2B total inflows. Grayscale conversion complete. Fidelity, BlackRock marketing ramping up. Staking yields attracting institutions. Resolution: Resolves YES if cumulative net inflows to all U.S. spot Ethereum ETFs reach $10B according to Bloomberg ETF data before March 31, 2026 11:59 PM UTC.",
    category: "Crypto",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 103 * DAY),
    totalYesAmount: parseEther('598.7'),
    totalNoAmount: parseEther('489.3'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // MUSIC & ARTISTS
  {
    id: 13n,
    question: "Will Beyoncé officially announce new album before March 2026?",
    description: "Cryptic Instagram posts hint at studio sessions. Renaissance tour film broke records. Fans analyzing lyrics for clues. Parkwood Entertainment tight-lipped. Resolution: Resolves YES if Beyoncé or Parkwood Entertainment makes official announcement (via Instagram, website, or press release) of a new studio album with release date before March 13, 2026 11:59 PM UTC.",
    category: "Music",
    creator: DEMO_CREATORS.artist,
    endTime: BigInt(now + 85 * DAY),
    totalYesAmount: parseEther('456.8'),
    totalNoAmount: parseEther('378.2'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 14n,
    question: "Will Drake's 'For All The Dogs' reach #1 on Billboard 200 by February 2026?",
    description: "Album dropped with mixed reviews. Streaming numbers strong at 400M+ first week. Competition from Doja Cat and Bad Bunny. Chart battle heating up. Resolution: Resolves YES if 'For All The Dogs' appears at #1 on the official Billboard 200 chart at any point before February 11, 2026 11:59 PM UTC.",
    category: "Music",
    creator: DEMO_CREATORS.artist,
    endTime: BigInt(now + 55 * DAY),
    totalYesAmount: parseEther('389.4'),
    totalNoAmount: parseEther('312.6'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // MOVIES & TV
  {
    id: 15n,
    question: "Will Dune 3 release date be officially announced before Q2 2026?",
    description: "Denis Villeneuve confirmed working on Messiah. Part Two grossed $714M. Legendary Pictures eager. Script in development. Fans demanding trilogy conclusion. Resolution: Resolves YES if Legendary Pictures or Warner Bros officially announces a theatrical release date for Dune: Messiah before April 1, 2026 12:00 AM UTC.",
    category: "Movies",
    creator: DEMO_CREATORS.brand,
    endTime: BigInt(now + 163 * DAY),
    totalYesAmount: parseEther('534.7'),
    totalNoAmount: parseEther('423.3'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 16n,
    question: "Will Stranger Things Season 5 premiere before July 2026?",
    description: "Final season filming wrapped December 2025. Netflix confirmed 2026 release. Post-production ongoing. Massive finale promised. 286M+ viewers waiting. Resolution: Resolves YES if first episode of Stranger Things Season 5 is available on Netflix before July 1, 2026 12:00 AM UTC.",
    category: "Movies",
    creator: DEMO_CREATORS.brand,
    endTime: BigInt(now + 195 * DAY),
    totalYesAmount: parseEther('612.9'),
    totalNoAmount: parseEther('478.1'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // CELEBRITY RELATIONSHIPS
  {
    id: 17n,
    question: "Will Taylor Swift and Travis Kelce officially announce engagement before Q2 2026?",
    description: "Dating since Sept 2023. NFL season boosting visibility. Travis seen at Tiffany's. Swifties analyzing every appearance. Vegas odds at 3:1. Resolution: Resolves YES if Taylor Swift or Travis Kelce officially announces engagement via social media, statement, or verified media interview before April 1, 2026 12:00 AM UTC. Paparazzi photos or ring sightings without confirmation do NOT count.",
    category: "Entertainment",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 163 * DAY),
    totalYesAmount: parseEther('723.6'),
    totalNoAmount: parseEther('589.4'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 18n,
    question: "Will Bad Bunny release new studio album before March 2026?",
    description: "Last album Oct 2023. Studio sessions reported in Puerto Rico. Collaboration rumors with Drake. 'Most wanted' tour grossed $435M. Fans demanding new music. Resolution: Resolves YES if Bad Bunny releases a new studio album (minimum 8 tracks) on major streaming platforms before March 13, 2026 11:59 PM UTC. Singles, EPs, or compilations do NOT count.",
    category: "Music",
    creator: DEMO_CREATORS.artist,
    endTime: BigInt(now + 85 * DAY),
    totalYesAmount: parseEther('467.8'),
    totalNoAmount: parseEther('398.2'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // MORE RELATIONSHIPS
  {
    id: 19n,
    question: "Will Ariana Grande and Ethan Slater get engaged before June 2026?",
    description: "Dating since Wicked filming. Public appearances increasing. Both divorced in 2023. Sources say relationship is serious. Fans shipping hard. Resolution: Resolves YES if either Ariana Grande or Ethan Slater officially announces engagement via social media, statement, or verified interview before June 1, 2026 12:00 AM UTC.",
    category: "Relationships",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 165 * DAY),
    totalYesAmount: parseEther('289.5'),
    totalNoAmount: parseEther('412.3'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 20n,
    question: "Will Zendaya and Tom Holland announce wedding date before Q2 2026?",
    description: "Been dating since Spider-Man filming. Both at peak careers. Family approvals secured. Holland dropped engagement hints in interviews. Gen-Z's favorite couple. Resolution: Resolves YES if wedding date is officially announced by either party, their reps, or verified media before April 1, 2026 12:00 AM UTC.",
    category: "Relationships",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 163 * DAY),
    totalYesAmount: parseEther('567.8'),
    totalNoAmount: parseEther('445.2'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 21n,
    question: "Will Selena Gomez and Benny Blanco get engaged before April 2026?",
    description: "Dating confirmed December 2023. Blanco posted cryptic ring shopping stories. Selena called him 'the one' in interview. Families already close. Wedding bells ringing? Resolution: Resolves YES if engagement is officially announced by either party or their representatives before April 15, 2026 11:59 PM UTC.",
    category: "Relationships",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 118 * DAY),
    totalYesAmount: parseEther('423.1'),
    totalNoAmount: parseEther('389.7'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },

  // MORE MOVIES
  {
    id: 22n,
    question: "Will Avatar 3 release date be delayed past December 2027?",
    description: "Currently scheduled for Dec 19, 2025. Cameron notorious for delays. Post-production intensive. Disney quiet on marketing. Fans nervous after previous delays. Resolution: Resolves YES if Disney/20th Century officially announces new release date after December 19, 2025 before December 1, 2025 12:00 AM UTC.",
    category: "Movies",
    creator: DEMO_CREATORS.brand,
    endTime: BigInt(now - 18 * DAY), // Already passed - for demo
    totalYesAmount: parseEther('678.4'),
    totalNoAmount: parseEther('523.6'),
    resolved: true,
    outcome: true,
    resolvedAt: BigInt(now - 18 * DAY),
    aiOracleEnabled: true,
  },
  {
    id: 23n,
    question: "Will Deadpool 3 gross over $1 billion worldwide by March 2026?",
    description: "Released July 2024, currently at $850M. Still in theaters in some markets. Streaming release pending. MCU's R-rated success. Marvel needs this win. Resolution: Resolves YES if Box Office Mojo shows worldwide gross of $1B+ before March 1, 2026 12:00 AM UTC.",
    category: "Movies",
    creator: DEMO_CREATORS.brand,
    endTime: BigInt(now + 72 * DAY),
    totalYesAmount: parseEther('712.3'),
    totalNoAmount: parseEther('489.7'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 24n,
    question: "Will Barbie win Best Picture at 2026 Oscars?",
    description: "Grossed $1.4B, cultural phenomenon. Greta Gerwig snubbed for Director nomination but film nominated. Up against Oppenheimer and Killers of the Flower Moon. Academy loves comebacks. Resolution: Resolves YES if Barbie wins Best Picture at the 96th Academy Awards ceremony on March 10, 2026.",
    category: "Movies",
    creator: DEMO_CREATORS.community,
    endTime: BigInt(now + 82 * DAY),
    totalYesAmount: parseEther('456.2'),
    totalNoAmount: parseEther('678.8'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
  {
    id: 25n,
    question: "Will The Last of Us Season 2 premiere before June 2026?",
    description: "HBO confirmed 2026 release. Filming completed November 2025. Post-production underway. Episode count reduced to 7. Pedro Pascal and Bella Ramsey returning. Resolution: Resolves YES if first episode of Season 2 is available on HBO Max before June 1, 2026 12:00 AM UTC.",
    category: "Movies",
    creator: DEMO_CREATORS.brand,
    endTime: BigInt(now + 165 * DAY),
    totalYesAmount: parseEther('589.3'),
    totalNoAmount: parseEther('423.7'),
    resolved: false,
    outcome: false,
    resolvedAt: 0n,
    aiOracleEnabled: true,
  },
];

// Helper to get market by ID
export function getStaticMarket(marketId: number): StaticMarketData | undefined {
  return STATIC_MARKETS.find(m => Number(m.id) === marketId);
}

// Helper to get market count
export function getStaticMarketCount(): bigint {
  return BigInt(STATIC_MARKETS.length);
}

// Helper to check if static mode is enabled
export function isStaticMode(): boolean {
  // Check if we're in production or if NEXT_PUBLIC_USE_STATIC_DATA is set
  return (
    process.env.NEXT_PUBLIC_USE_STATIC_DATA === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

// Export for display
export { DEMO_CREATORS };
