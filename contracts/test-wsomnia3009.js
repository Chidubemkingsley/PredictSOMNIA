/**
 * WSOMNIA3009 Gasless Test - User pays bet, facilitator pays gas
 */
const { ethers } = require("hardhat");

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log(" WSOMNIA3009 GASLESS TEST - User pays bet, Facilitator pays gas");
  console.log("=".repeat(70) + "\n");

  const [facilitator] = await ethers.getSigners();
  console.log("Facilitator:", facilitator.address);

  // Contract addresses — Somnia Shannon (env-preferred)
  const WSOMNIA3009_ADDRESS = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300';
  const X402_BETTING_ADDRESS = process.env.X402_BETTING_ADDRESS || process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS || "0xCA983EF481b53Ee14E67278501DdC1De466999F9";

  const wsomnia = await ethers.getContractAt("WSOMNIA3009", WSOMNIA3009_ADDRESS);
  const x402 = await ethers.getContractAt("X402BettingSOMNIA", X402_BETTING_ADDRESS);

  // Check facilitator setup
  const contractFacilitator = await x402.facilitator();
  console.log("Contract facilitator:", contractFacilitator);
  console.log("Our facilitator:", facilitator.address);
  console.log("Match:", contractFacilitator.toLowerCase() === facilitator.address.toLowerCase());

  // Check facilitator STT balance (for gas)
  const facilitatorBalance = await ethers.provider.getBalance(facilitator.address);
  console.log("\nFacilitator STT (for gas):", ethers.formatEther(facilitatorBalance), "STT");

  // Check facilitator WSOMNIA3009 balance
  const wsomniaBalance = await wsomnia.balanceOf(facilitator.address);
  console.log("Facilitator WSOMNIA3009:", ethers.formatEther(wsomniaBalance), "WSOMNIA");

  // If no WSOMNIA, wrap some
  if (wsomniaBalance < ethers.parseEther("0.01")) {
    console.log("\n Wrapping 0.02 STT to WSOMNIA3009...");
    const tx = await wsomnia.deposit({ value: ethers.parseEther("0.02") });
    await tx.wait();
    console.log("Wrapped!");
    const newBalance = await wsomnia.balanceOf(facilitator.address);
    console.log("New WSOMNIA3009 balance:", ethers.formatEther(newBalance));
  }

  console.log("\n Flow Summary:");
  console.log("1. User wraps STT -> WSOMNIA3009 (one time, user pays gas)");
  console.log("2. User signs EIP-3009 authorization (free, off-chain)");
  console.log("3. Facilitator calls gaslessBetWithSOMNIA (facilitator pays gas)");
  console.log("4. User's WSOMNIA3009 is used for the bet");
  console.log("5. User pays: BET AMOUNT. Facilitator pays: GAS ONLY.");

  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch(console.error);
