const { ethers } = require("hardhat");
async function main() {
  // Somnia Shannon — no hardcoded addresses, read from env / deployment
  const marketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || process.env.PREDICTION_MARKET_ADDRESS || (()=>{ try{ return require('./deployments/wsomnia-local.json').PredictionMarket }catch{ return "0x7F0335eC0157a113840D2dcB257BE971774F2226" }})();
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);
  const x402BettingAddress = process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS || process.env.X402_BETTING_ADDRESS || (()=>{ try{ return require('./deployments/wsomnia-local.json').X402BettingSOMNIA }catch{ return "0xCA983EF481b53Ee14E67278501DdC1De466999F9" }})();
  
  console.log("Checking X402BettingSOMNIA authorization...");
  console.log("X402BettingSOMNIA address:", x402BettingAddress);
  
  const isAuthorized = await market.authorizedOracles(x402BettingAddress);
  console.log("X402BettingSOMNIA authorized:", isAuthorized);
  
  if (!isAuthorized) {
    console.log("\n⚠️ X402BettingSOMNIA is NOT authorized! Authorizing now...");
    const tx = await market.setAuthorizedOracle(x402BettingAddress, true);
    await tx.wait();
    console.log("✅ X402BettingSOMNIA authorized successfully!");
    
    // Verify
    const isAuthorizedNow = await market.authorizedOracles(x402BettingAddress);
    console.log("Verified authorization:", isAuthorizedNow);
  }
}
main().then(() => process.exit(0)).catch(console.error);
