/**
 * Deploy WSOMNIA3009 + X402BettingSOMNIA
 * Pure SOMNIA gasless solution
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 DEPLOYING PURE STT GASLESS SOLUTION");
  console.log("=".repeat(70) + "\n");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const facilitator = signers[1] || deployer;
  const oracle = signers[2] || deployer;
  const user1 = signers[3] || deployer;
  const user2 = signers[4] || deployer;

  console.log("📍 Accounts (Somnia Shannon):");
  console.log(`   Deployer:    ${deployer.address}`);
  console.log(`   Facilitator: ${facilitator.address} ${facilitator.address===deployer.address?'(=deployer)':''}`);
  console.log(`   Oracle:      ${oracle.address} ${oracle.address===deployer.address?'(=deployer)':''}`);
  console.log(`   User1:       ${user1.address}`);
  console.log(`   User2:       ${user2.address}\n`);

  // ============================================================================
  // 1. Deploy PredictionMarket
  // ============================================================================
  console.log("📦 [1/3] Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy();
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`   ✅ PredictionMarket: ${marketAddress}\n`);

  // ============================================================================
  // 2. Deploy WSOMNIA3009 (Wrapped STT with EIP-3009)
  // ============================================================================
  console.log("📦 [2/3] Deploying WSOMNIA3009 (Wrapped STT with gasless support)...");
  const WSOMNIA3009 = await hre.ethers.getContractFactory("WSOMNIA3009");
  const wsomnia = await WSOMNIA3009.deploy();
  await wsomnia.waitForDeployment();
  const wsomniaAddress = await wsomnia.getAddress();
  console.log(`   ✅ WSOMNIA3009: ${wsomniaAddress}\n`);

  // ============================================================================
  // 3. Deploy X402BettingSOMNIA (Gasless betting with WSOMNIA3009 — Somnia Shannon STT gasless)
  // ============================================================================
  console.log("📦 [3/3] Deploying X402BettingSOMNIA...");
  const X402BettingSOMNIA = await hre.ethers.getContractFactory("X402BettingSOMNIA");
  const x402 = await X402BettingSOMNIA.deploy(marketAddress, wsomniaAddress);
  await x402.waitForDeployment();
  const x402Address = await x402.getAddress();
  console.log(`   ✅ X402BettingSOMNIA: ${x402Address}\n`);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  console.log("⚙️  Configuring contracts...\n");

  // Authorize oracle
  console.log("   Authorizing oracle...");
  let tx = await market.setAuthorizedOracle(oracle.address, true);
  await tx.wait();
  console.log(`   ✅ Oracle authorized: ${oracle.address}`);

  // Authorize x402 contract to place bets for users
  console.log("   Authorizing X402BettingSOMNIA...");
  tx = await market.setAuthorizedOracle(x402Address, true);
  await tx.wait();
  console.log(`   ✅ X402BettingSOMNIA authorized`);

  // Set facilitator
  console.log("   Setting facilitator...");
  tx = await x402.setFacilitator(facilitator.address);
  await tx.wait();
  console.log(`   ✅ Facilitator set: ${facilitator.address}\n`);

  // ============================================================================
  // SAVE DEPLOYMENT
  // ============================================================================
  const deployment = {
    network: "localhost",
    chainId: 50312,
    timestamp: new Date().toISOString(),
    contracts: {
      PredictionMarket: marketAddress,
      WSOMNIA3009: wsomniaAddress,
      X402BettingSOMNIA: x402Address
    },
    accounts: {
      deployer: deployer.address,
      facilitator: facilitator.address,
      oracle: oracle.address,
      user1: user1.address,
      user2: user2.address
    }
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, 'wsomnia-local.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log("=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE! Somnia Shannon (50312) — WSOMNIA3009 gasless");
  console.log("=".repeat(70) + "\n");

  console.log("📋 CONTRACT ADDRESSES (Somnia Shannon):");
  console.log(`   PredictionMarket: ${marketAddress}`);
  console.log(`   WSOMNIA3009:         ${wsomniaAddress}`);
  console.log(`   X402BettingSOMNIA:   ${x402Address}\n`);

  console.log("📁 SAVED: deployments/wsomnia-local.json\n");

  console.log("🎯 NEXT: Run end-to-end test:");
  console.log("   node test-wsomnia-gasless.js  # was test-wsomnia-gasless.js — now WSOMNIA\n");

  console.log("=".repeat(70) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
