/**
 * Smart Contract ABIs
 * Generated from compiled contracts
 */

export const PREDICTION_MARKET_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_marketId', type: 'uint256' }],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: '_question', type: 'string' },
      { internalType: 'string', name: '_description', type: 'string' },
      { internalType: 'string', name: '_category', type: 'string' },
      { internalType: 'uint256', name: '_endTime', type: 'uint256' },
      { internalType: 'bool', name: '_aiOracleEnabled', type: 'bool' },
    ],
    name: 'createMarket',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'marketCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'markets',
    outputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'string', name: 'question', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'string', name: 'category', type: 'string' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'totalYesAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalNoAmount', type: 'uint256' },
      { internalType: 'bool', name: 'resolved', type: 'bool' },
      { internalType: 'bool', name: 'outcome', type: 'bool' },
      { internalType: 'uint256', name: 'resolvedAt', type: 'uint256' },
      { internalType: 'bool', name: 'aiOracleEnabled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_marketId', type: 'uint256' },
      { internalType: 'bool', name: '_position', type: 'bool' },
    ],
    name: 'buyPosition',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_marketId', type: 'uint256' },
      { internalType: 'bool', name: '_outcome', type: 'bool' },
    ],
    name: 'resolveMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_marketId', type: 'uint256' },
      { internalType: 'bool', name: '_outcome', type: 'bool' },
    ],
    name: 'forceResolveMarket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'positions',
    outputs: [
      { internalType: 'uint256', name: 'yesAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'noAmount', type: 'uint256' },
      { internalType: 'bool', name: 'claimed', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const AI_ORACLE_ABI = [
  // View Functions
  'function resolutionRequests(uint256) external view returns (uint256 marketId, string dataSource, uint256 timestamp, bool resolved, bool outcome, uint256 confidence, string evidenceHash)',
  'function dataSources(string) external view returns (string name, string apiEndpoint, bool active, uint256 successRate)',
  'function aiAgents(address) external view returns (bool)',
  'function predictionMarketContract() external view returns (address)',
  'function requestCount() external view returns (uint256)',
  'function MIN_CONFIDENCE() external view returns (uint256)',

  // Write Functions
  'function requestResolution(uint256 _marketId, string memory _dataSource) external',
  'function provideResolution(uint256 _requestId, bool _outcome, uint256 _confidence, string memory _evidenceHash) external',
  'function addDataSource(string memory _name, string memory _apiEndpoint) external',
  'function setAIAgent(address _agent, bool _authorized) external',
  'function updateDataSource(string memory _name, bool _active, uint256 _successRate) external',

  // Events
  'event ResolutionRequested(uint256 indexed requestId, uint256 indexed marketId, string dataSource)',
  'event ResolutionProvided(uint256 indexed requestId, bool outcome, uint256 confidence)',
  'event DataSourceAdded(string name, string apiEndpoint)',
] as const;

export const TRADER_REPUTATION_ABI = [
  // View Functions — Somnia Shannon live TraderReputation (see TraderReputation.sol) — object form for wagmi/viem
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'traderStats',
    outputs: [
      { internalType: 'uint256', name: 'totalBets', type: 'uint256' },
      { internalType: 'uint256', name: 'totalWins', type: 'uint256' },
      { internalType: 'uint256', name: 'totalLosses', type: 'uint256' },
      { internalType: 'uint256', name: 'totalVolume', type: 'uint256' },
      { internalType: 'uint256', name: 'totalProfit', type: 'uint256' },
      { internalType: 'uint256', name: 'currentStreak', type: 'uint256' },
      { internalType: 'uint256', name: 'bestStreak', type: 'uint256' },
      { internalType: 'uint256', name: 'reputationScore', type: 'uint256' },
      { internalType: 'uint256', name: 'lastActivityTime', type: 'uint256' },
      { internalType: 'bool', name: 'isVerified', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'getTraderStats',
    outputs: [
      { internalType: 'uint256', name: 'totalBets', type: 'uint256' },
      { internalType: 'uint256', name: 'totalWins', type: 'uint256' },
      { internalType: 'uint256', name: 'totalLosses', type: 'uint256' },
      { internalType: 'uint256', name: 'totalVolume', type: 'uint256' },
      { internalType: 'uint256', name: 'totalProfit', type: 'uint256' },
      { internalType: 'uint256', name: 'winRate', type: 'uint256' },
      { internalType: 'uint256', name: 'currentStreak', type: 'uint256' },
      { internalType: 'uint256', name: 'bestStreak', type: 'uint256' },
      { internalType: 'uint256', name: 'reputationScore', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'getReputationScore',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'getCurrentBadgeTier',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'getTraderFollowerCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'getFollowers',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'follower', type: 'address' }],
    name: 'getFollowing',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'trader', type: 'address' },
      { internalType: 'uint256', name: 'maxAmountPerTrade', type: 'uint256' },
      { internalType: 'uint256', name: 'copyPercentage', type: 'uint256' },
    ],
    name: 'followTrader',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'unfollowTrader',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { indexed: true, internalType: 'address', name: 'trader', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'marketId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'position', type: 'bool' },
    ],
    name: 'BetPlaced',
    type: 'event',
  },
  {
    inputs: [
      { indexed: true, internalType: 'address', name: 'trader', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'newScore', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'oldScore', type: 'uint256' },
    ],
    name: 'ReputationUpdated',
    type: 'event',
  },
  {
    inputs: [
      { indexed: true, internalType: 'address', name: 'follower', type: 'address' },
      { indexed: true, internalType: 'address', name: 'trader', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'maxAmountPerTrade', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'copyPercentage', type: 'uint256' },
    ],
    name: 'TraderFollowed',
    type: 'event',
  },
  {
    inputs: [
      { indexed: true, internalType: 'address', name: 'follower', type: 'address' },
      { indexed: true, internalType: 'address', name: 'trader', type: 'address' },
    ],
    name: 'TraderUnfollowed',
    type: 'event',
  },
] as const;

export const GASLESS_RELAYER_ABI = [
  // View Functions
  'function whitelistedContracts(address) external view returns (bool)',
  'function nonces(address) external view returns (uint256)',

  // Write Functions
  'function executeMetaTransaction(address _contract, bytes memory _data, uint256 _nonce, bytes memory _signature) external',
  'function setWhitelistedContract(address _contract, bool _whitelisted) external',

  // Events
  'event MetaTransactionExecuted(address indexed user, address indexed contract, bool success)',
] as const;
