const { ethers } = require("hardhat");
async function main() {
  const marketAddress = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0x7F0335eC0157a113840D2dcB257BE971774F2226";
  const market = await ethers.getContractAt("PredictionMarket", marketAddress);
  const minBet = await market.MIN_BET();
  console.log("MIN_BET:", ethers.formatEther(minBet), "STT");
}
main().catch(console.error);
