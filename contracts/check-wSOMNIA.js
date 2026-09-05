const { ethers } = require("hardhat");
async function main() {
  // Somnia Shannon — WSOMNIA3009 (migrated from WSOMNIA3009 0x70e4730A...)
  // For live DreamDEX check, prefer tUSDC 0x70a86D88... as collateral; this checks wrapped native helper
  const WSOMNIA3009_ADDRESS = process.env.WSOMNIA3009_ADDRESS || "0x5C46B206aF8a2148DD8813Bd69a03634562aC300";
  // Backward compat: accept old env WSOMNIA3009_ADDRESS too
  const addr = process.env.WSOMNIA3009_ADDRESS || WSOMNIA3009_ADDRESS;
  const wsomnia = await ethers.getContractAt("WSOMNIA3009", addr);
  
  const totalSupply = await wsomnia.totalSupply();
  console.log("WSOMNIA3009 Total Supply:", ethers.formatEther(totalSupply));
  
  const name = await wsomnia.name();
  console.log("Name:", name);
  
  const symbol = await wsomnia.symbol();
  console.log("Symbol:", symbol);
}
main().catch(console.error);
