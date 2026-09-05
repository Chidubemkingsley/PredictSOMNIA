// Prediction Market Contract ABI
export const PREDICTION_MARKET_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'marketId', type: 'uint256' },
      { indexed: false, name: 'question', type: 'string' },
      { indexed: false, name: 'endTime', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
    ],
    name: 'MarketCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'marketId', type: 'uint256' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'position', type: 'bool' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'PositionTaken',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'marketId', type: 'uint256' },
      { indexed: false, name: 'outcome', type: 'bool' },
      { indexed: false, name: 'resolvedAt', type: 'uint256' },
    ],
    name: 'MarketResolved',
    type: 'event',
  },
  // Read Functions
  {
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'getMarket',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'question', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'endTime', type: 'uint256' },
          { name: 'totalYesAmount', type: 'uint256' },
          { name: 'totalNoAmount', type: 'uint256' },
          { name: 'resolved', type: 'bool' },
          { name: 'outcome', type: 'bool' },
          { name: 'resolvedAt', type: 'uint256' },
        ],
        name: 'market',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'user', type: 'address' },
    ],
    name: 'getUserPosition',
    outputs: [
      { name: 'yesAmount', type: 'uint256' },
      { name: 'noAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'getMarketOdds',
    outputs: [
      { name: 'yesOdds', type: 'uint256' },
      { name: 'noOdds', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Write Functions
  {
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'endTime', type: 'uint256' },
    ],
    name: 'createMarket',
    outputs: [{ name: 'marketId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'position', type: 'bool' }, // true = YES, false = NO
    ],
    name: 'buyPosition',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'position', type: 'bool' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'sellPosition',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'bool' },
    ],
    name: 'resolveMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Oracle Contract ABI (AI-Assisted Fast Resolution)
export const AI_ORACLE_ABI = [
  {
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'dataSource', type: 'string' },
    ],
    name: 'requestResolution',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'getResolutionStatus',
    outputs: [
      { name: 'pending', type: 'bool' },
      { name: 'confidence', type: 'uint256' },
      { name: 'suggestedOutcome', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
