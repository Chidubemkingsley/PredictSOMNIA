const { ethers } = require("hardhat");
async function main() {
  // Somnia Shannon — env-preferred, fallback legacy for backwards compat
  const marketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || process.env.PREDICTION_MARKET_ADDRESS || "0x7F0335eC0157a113840D2dcB257BE971774F2226";
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);
  const facilitator = process.env.FACILITATOR_ADDRESS || process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS || "0x3A67492c38d5D72749fD124cB4Daee2e883AF732";
  const isAuthorized = await market.authorizedOracles(facilitator);
  console.log("Facilitator authorized:", isAuthorized);
  
  // Check owner
  const owner = await market.owner();
  console.log("Contract owner:", owner);
}
main().catch(console.error);
