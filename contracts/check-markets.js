const { ethers } = require('hardhat');

async function main() {
  const pmAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x6C8A1610eedAa2BA449b9a409384cE4a0b22F81F";
  const pm = await ethers.getContractAt('PredictionMarket', pmAddress);
  
  const count = await pm.marketCount();
  console.log(`Total markets: ${count}\n`);
  
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = 1; i <= Number(count); i++) {
    try {
      const m = await pm.markets(i);
      const endTime = Number(m.endTime);
      const isActive = endTime > now && !m.resolved;
      const status = m.resolved ? 'RESOLVED' : (endTime > now ? '✅ ACTIVE' : '❌ ENDED');
      
      console.log(`Market ${i}: ${status}`);
      console.log(`  Question: ${m.question.substring(0, 60)}...`);
      console.log(`  End: ${new Date(endTime * 1000).toLocaleDateString()}`);
      console.log('');
    } catch (e) {
      console.log(`Market ${i}: Error - ${e.message}`);
    }
  }
}

main().catch(console.error);
