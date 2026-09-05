/**
 * Create a test market for gasless flow testing — Somnia Shannon (STT, tUSDC 6d)
 */
const { ethers } = require('hardhat');

function getMarketAddress(){
  if (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS) return process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
  if (process.env.PREDICTION_MARKET_ADDRESS) return process.env.PREDICTION_MARKET_ADDRESS;
  try { const j=require('./deployments/somnia-shannon.json'); return j.contracts.PredictionMarket_PM2_primary || j.contracts.PredictionMarket; } catch {}
  try { const j=require('./deployments/wsomnia-local.json'); return j.contracts.PredictionMarket; } catch {}
  return '0x67F7B580AEd6de246f7db70e19efdcE4Dd34Fc61';
}
const PREDICTION_MARKET_ADDRESS = getMarketAddress();

const PREDICTION_MARKET_ABI = [
  'function createMarket(string memory _question, string memory _description, string memory _category, uint256 _endTime, bool _aiOracleEnabled) external returns (uint256)',
  'function marketCount() view returns (uint256)',
  'function markets(uint256) view returns (uint256 id, string question, string description, string category, address creator, uint256 endTime, uint256 totalYesAmount, uint256 totalNoAmount, bool resolved, bool outcome, uint256 resolvedAt, bool aiOracleEnabled)',
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Creating market with:', deployer.address);
  
  const predictionMarket = new ethers.Contract(
    PREDICTION_MARKET_ADDRESS,
    PREDICTION_MARKET_ABI,
    deployer
  );
  
  // Check current market count
  const countBefore = await predictionMarket.marketCount();
  console.log('Current market count:', countBefore.toString());
  
  // Create a test market
  const question = 'Will this gasless betting test succeed?';
  const description = 'Test market for gasless flow verification - ' + Date.now();
  const category = 'Test';
  const endTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now
  const aiOracleEnabled = false;
  
  console.log('\nCreating market:');
  console.log('  Question:', question);
  console.log('  End Time:', new Date(endTime * 1000).toISOString());
  
  const tx = await predictionMarket.createMarket(
    question,
    description,
    category,
    endTime,
    aiOracleEnabled
  );
  
  console.log('  TX:', tx.hash);
  const receipt = await tx.wait();
  console.log('  Confirmed! Gas used:', receipt.gasUsed.toString());
  
  // Get new market count — markets are 1-indexed (marketCount == new ID)
  const countAfter = await predictionMarket.marketCount();
  const newMarketId = Number(countAfter);
  console.log('\n✅ Market created! ID:', newMarketId);
  
  // Get market details — via markets mapping (Somnia)
  const market = await predictionMarket.markets(newMarketId);
  console.log('  Question:', market.question);
  console.log('  End Time:', new Date(Number(market.endTime) * 1000).toISOString());
  console.log('  YES Amount:', ethers.formatEther(market.totalYesAmount), 'STT');
  console.log('  NO Amount:', ethers.formatEther(market.totalNoAmount), 'STT');
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
