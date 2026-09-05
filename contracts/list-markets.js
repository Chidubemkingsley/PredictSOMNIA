/**
 * List all markets from the blockchain — Somnia Shannon (STT, tUSDC)
 */
require('dotenv').config({ path: '../.env.local' });
const { ethers } = require('ethers');
const PredictionMarketABI = require('./artifacts/contracts/PredictionMarket.sol/PredictionMarket.json').abi;

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                     BLOCKCHAIN MARKETS — Somnia Shannon         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL || process.env.SOMNIA_TESTNET_RPC_URL || 'http://127.0.0.1:8545';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const marketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || process.env.PREDICTION_MARKET_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const market = new ethers.Contract(marketAddress, PredictionMarketABI, provider);

  const count = await market.marketCount();
  console.log(`📊 Total Markets: ${count} (Somnia Shannon, STT)\n`);

  if (count === 0n) {
    console.log('❌ No markets found. Create some markets first!\n');
    return;
  }

  for (let i = 1; i <= count; i++) {
    const m = await market.markets(i);
    const totalPool = Number(ethers.formatEther(m.totalYesAmount + m.totalNoAmount));
    const yesPercent = totalPool > 0 
      ? (Number(ethers.formatEther(m.totalYesAmount)) / totalPool * 100).toFixed(1)
      : '50.0';
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Market #${i}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 Question: ${m.question}`);
    console.log(`📂 Category: ${m.category}`);
    console.log(`👤 Creator: ${m.creator}`);
    console.log(`⏰ Deadline: ${new Date(Number(m.endTime) * 1000).toLocaleString()}`);
    console.log(`💰 Total Pool: ${totalPool.toFixed(4)} STT`);
    console.log(`   ├─ YES: ${ethers.formatEther(m.totalYesAmount)} STT (${yesPercent}%)`);
    console.log(`   └─ NO:  ${ethers.formatEther(m.totalNoAmount)} STT (${(100 - parseFloat(yesPercent)).toFixed(1)}%)`);
    console.log(`🔮 AI Oracle: ${m.aiOracleEnabled ? '✅ Enabled (Groq)' : '❌ Disabled'}`);
    console.log(`📊 Status: ${m.resolved ? `✅ Resolved (Outcome: ${m.outcome ? 'YES' : 'NO'})` : '🟢 Active'}`);
    console.log('');
  }

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      END OF MARKETS — Somnia                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
