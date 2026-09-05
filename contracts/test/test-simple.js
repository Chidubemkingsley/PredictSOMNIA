/**
 * SIMPLE END-TO-END TEST - Core Functionality
 * Tests basic operations with deployed contracts
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 SIMPLE E2E TEST - CORE FUNCTIONALITY");
  console.log("=".repeat(70) + "\n");

  // Load deployment
  const deploymentPath = path.join(__dirname, 'deployments', 'local.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📁 Loaded deployment\n");

  // Get signers
  const [deployer, facilitator, oracle, trader1, trader2] = await hre.ethers.getSigners();

  // Get contract instances
  const market = await hre.ethers.getContractAt("PredictionMarket", deployment.contracts.PredictionMarket);
  const x402 = await hre.ethers.getContractAt("X402Betting", deployment.contracts.X402Betting);

  let testsPassed = 0;
  let testsFailed = 0;

  const test = async (name, fn) => {
    try {
      process.stdout.write(`   ${name}... `);
      await fn();
      console.log("✅");
      testsPassed++;
    } catch (error) {
      console.log("❌");
      console.error(`      Error: ${error.message.split('\n')[0]}`);
      testsFailed++;
    }
  };

  // ============================================================================
  // TEST 1: Market Creation
  // ============================================================================
  console.log("📦 [1/5] Market Creation\n");

  const now = Math.floor(Date.now() / 1000);
  const futureTime = now + 86400 * 30;

  await test("Create Market 1: BTC $150K", async () => {
    const tx = await market.createMarket(
      "Will Bitcoin reach $150,000 by Q1 2026?",
      "BTC price prediction",
      "Crypto",
      futureTime,
      true
    );
    await tx.wait();
  });

  await test("Create Market 2: STT $6K", async () => {
    const tx = await market.createMarket(
      "Will Ethereum reach $6,000 by March 2026?",
      "STT price prediction",
      "Crypto",
      futureTime,
      true
    );
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 2: Regular Betting with Native Token
  // ============================================================================
  console.log("📦 [2/5] Regular Betting\n");

  await test("Trader1 bets YES on Market 1 (0.1 STT)", async () => {
    const amount = hre.ethers.parseEther("0.1");
    const tx = await market.connect(trader1).buyPosition(1, true, { value: amount });
    await tx.wait();
  });

  await test("Trader2 bets NO on Market 1 (0.08 STT)", async () => {
    const amount = hre.ethers.parseEther("0.08");
    const tx = await market.connect(trader2).buyPosition(1, false, { value: amount });
    await tx.wait();
  });

  await test("Trader1 bets YES on Market 2 (0.05 STT)", async () => {
    const amount = hre.ethers.parseEther("0.05");
    const tx = await market.connect(trader1).buyPosition(2, true, { value: amount });
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 3: Market Resolution
  // ============================================================================
  console.log("📦 [3/5] Market Resolution\n");

  await test("Oracle resolves Market 1 (YES wins)", async () => {
    const tx = await market.connect(oracle).resolveMarket(1, true);
    await tx.wait();
  });

  await test("Oracle resolves Market 2 (YES wins)", async () => {
    const tx = await market.connect(oracle).resolveMarket(2, true);
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 4: Claim Winnings
  // ============================================================================
  console.log("📦 [4/5] Claim Winnings\n");

  await test("Trader1 claims winnings from Market 1", async () => {
    const balanceBefore = await hre.ethers.provider.getBalance(trader1.address);
    const tx = await market.connect(trader1).claimWinnings(1);
    await tx.wait();
    const balanceAfter = await hre.ethers.provider.getBalance(trader1.address);
    if (balanceAfter <= balanceBefore) throw new Error("Balance did not increase");
  });

  await test("Trader1 claims winnings from Market 2", async () => {
    const tx = await market.connect(trader1).claimWinnings(2);
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 5: Contract State
  // ============================================================================
  console.log("📦 [5/5] Contract State\n");

  await test("Get all markets", async () => {
    const markets = await market.getAllMarkets();
    if (markets.length < 2) throw new Error(`Expected at least 2 markets, got ${markets.length}`);
  });

  await test("Get Market 1 odds", async () => {
    const odds = await market.getMarketOdds(1);
    if (!odds) throw new Error("Failed to get odds");
  });

  await test("Get Trader1 position on Market 1", async () => {
    const position = await market.getUserPosition(1, trader1.address);
    if (!position) throw new Error("Failed to get position");
  });

  await test("Calculate winnings for Trader1", async () => {
    const winnings = await market.calculateWinnings(1, trader1.address);
    // Should be 0 after claiming
    if (winnings > 0) throw new Error("Should have claimed all winnings");
  });

  console.log();

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("=".repeat(70));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(70) + "\n");

  const total = testsPassed + testsFailed;
  const successRate = ((testsPassed / total) * 100).toFixed(1);

  console.log(`   Total Tests:    ${total}`);
  console.log(`   ✅ Passed:      ${testsPassed}`);
  console.log(`   ❌ Failed:      ${testsFailed}`);
  console.log(`   Success Rate:   ${successRate}%`);

  if (testsFailed === 0) {
    console.log("\n   🎉 ALL TESTS PASSED!");
    console.log("\n   ✅ Core system working:");
    console.log("      - Market creation");
    console.log("      - Betting with native token");
    console.log("      - Oracle resolution");
    console.log("      - Claiming winnings");
    console.log("      - State queries");
  } else {
    console.log("\n   ⚠️  SOME TESTS FAILED");
  }

  console.log("\n" + "=".repeat(70) + "\n");

  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\n❌ Test suite failed:");
  console.error(error);
  process.exit(1);
});
