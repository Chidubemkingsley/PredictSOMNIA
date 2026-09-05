/**
 * TRUE GASLESS End-to-End Test
 */
const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log(" TRUE GASLESS END-TO-END TEST");
  console.log("=".repeat(70) + "\n");

  const [facilitator] = await ethers.getSigners();
  const testUserAddress = process.env.TEST_USER_ADDRESS || "0x1234567890123456789012345678901234567890";
  
  console.log("Facilitator:", facilitator.address, "(Somnia Shannon)");
  console.log("Test User:", testUserAddress);

  const PREDICTION_MARKET = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || process.env.PREDICTION_MARKET_ADDRESS || "0x7F0335eC0157a113840D2dcB257BE971774F2226";
  const market = await ethers.getContractAt("PredictionMarket", PREDICTION_MARKET);

  const isAuthorized = await market.authorizedOracles(facilitator.address);
  console.log("\nFacilitator authorized:", isAuthorized);

  const facilitatorBalance = await ethers.provider.getBalance(facilitator.address);
  console.log("Facilitator STT balance:", ethers.formatEther(facilitatorBalance), "STT");

  // Use minimum bet (0.01 STT)
  const betAmount = ethers.parseEther("0.01");
  const marketId = 1;
  const position = true;

  console.log("\n Placing TRUE GASLESS bet...");
  console.log("   Market ID:", marketId);
  console.log("   Position: YES");
  console.log("   Amount:", ethers.formatEther(betAmount), "STT");
  console.log("   User:", testUserAddress);

  try {
    const tx = await market.connect(facilitator).buyPositionForUser(
      marketId,
      position,
      testUserAddress,
      { value: betAmount }
    );
    const receipt = await tx.wait();
    
    console.log("\n TRUE GASLESS BET SUCCESSFUL!");
    console.log("   TX Hash:", receipt.hash);
    console.log("   Gas used:", receipt.gasUsed.toString());

    const userPosition = await market.positions(marketId, testUserAddress);
    console.log("\n User Position:");
    console.log("   YES:", ethers.formatEther(userPosition.yesAmount), "STT");
    console.log("   NO:", ethers.formatEther(userPosition.noAmount), "STT");

    console.log("\n=== TRUE GASLESS CONFIRMED! ===");

  } catch (error) {
    console.error("\nError:", error.message);
  }
}

main().catch(console.error);
