const { ethers } = require('hardhat');

async function main() {
  const pmAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x7F0335eC0157a113840D2dcB257BE971774F2226";
  const pm = await ethers.getContractAt('PredictionMarket', pmAddress);
  
  console.log('Checking market categories...\n');
  
  const categories = {};
  
  for (let i = 0; i < 25; i++) {
    try {
      const m = await pm.markets(i);
      const cat = m.category;
      console.log(`Market ${i}: "${m.question.slice(0, 50)}..." - Category: "${cat}"`);
      
      categories[cat] = (categories[cat] || 0) + 1;
    } catch(e) {
      break;
    }
  }
  
  console.log('\n--- Category Summary ---');
  for (const [cat, count] of Object.entries(categories)) {
    console.log(`"${cat}": ${count} markets`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
