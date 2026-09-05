const { ethers } = require("hardhat");
async function main() {
  const [facilitator] = await ethers.getSigners();
  const WSOMNIA3009_ADDRESS = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || "0x5C46B206aF8a2148DD8813Bd69a03634562aC300";
  const wsomnia = await ethers.getContractAt("WSOMNIA3009", WSOMNIA3009_ADDRESS);
  
  console.log("Before wrap:");
  const balBefore = await wsomnia.balanceOf(facilitator.address);
  console.log("WSOMNIA balance:", ethers.formatEther(balBefore));
  
  console.log("\nWrapping 0.02 STT...");
  const tx = await wsomnia.deposit({ value: ethers.parseEther("0.02") });
  const receipt = await tx.wait();
  console.log("TX:", receipt.hash);
  
  console.log("\nAfter wrap:");
  const balAfter = await wsomnia.balanceOf(facilitator.address);
  console.log("WSOMNIA balance:", ethers.formatEther(balAfter));
}
main().catch(console.error);
