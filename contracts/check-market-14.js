const { ethers } = require('hardhat');

async function main() {
  const pmAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x6C8A1610eedAa2BA449b9a409384cE4a0b22F81F";
  const x402Address = process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS || process.env.X402_BETTING_ADDRESS || "0x8B0d07E7D0a4DE30E6acDb8df0FAc3425a22569E";
  const pm = await ethers.getContractAt('PredictionMarket', pmAddress);
  const x402 = await ethers.getContractAt('X402BettingSOMNIA', x402Address);
  
  console.log('=== Market 14 Status ===');
  const m = await pm.markets(14);
  console.log('Question:', m.question);
  console.log('Yes Pool:', ethers.formatEther(m.totalYesAmount), 'STT');
  console.log('No Pool:', ethers.formatEther(m.totalNoAmount), 'STT');
  
  console.log('\n=== X402 Contract Status ===');
  const pmAddr = await x402.predictionMarket();
  const wsomniaAddr = await x402.wsomnia();
  const facilitator = await x402.facilitator();
  console.log('PredictionMarket:', pmAddr);
  console.log('WSOMNIA:', wsomniaAddr);
  console.log('Facilitator:', facilitator);
  
  // Check facilitator STT balance
  const [signer] = await ethers.getSigners();
  const facBalance = await ethers.provider.getBalance(facilitator);
  console.log('Facilitator STT:', ethers.formatEther(facBalance));
}

main().catch(console.error);
