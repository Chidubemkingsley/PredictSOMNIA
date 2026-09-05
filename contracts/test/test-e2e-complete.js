/**
 * END-TO-END TEST - Complete System with x402 Protocol
 * Tests all functionality including gasless transactions
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 END-TO-END TEST - COMPLETE SYSTEM");
  console.log("=".repeat(70) + "\n");

  // Load deployment
  const deploymentPath = path.join(__dirname, 'deployments', 'local.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment not found. Run: npx hardhat run scripts/deploy-all-local.js --network localhost");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📁 Loaded deployment from:", deploymentPath);
  console.log(`   Network: ${deployment.network}`);
  console.log(`   Deployed: ${new Date(deployment.timestamp).toLocaleString()}\n`);

  // Get signers
  const [deployer, facilitator, oracle, trader1, trader2] = await hre.ethers.getSigners();

  // Get contract instances
  const market = await hre.ethers.getContractAt("PredictionMarket", deployment.contracts.PredictionMarket);
  const reputation = await hre.ethers.getContractAt("TraderReputation", deployment.contracts.TraderReputation);
  const aiOracle = await hre.ethers.getContractAt("AIOracle", deployment.contracts.AIOracle);
  const x402 = await hre.ethers.getContractAt("X402Betting", deployment.contracts.X402Betting);
  const usdc = await hre.ethers.getContractAt("MockERC20WithAuth", deployment.contracts.USDC);

  let testsPassed = 0;
  let testsFailed = 0;

  // Helper function
  const test = async (name, fn) => {
    try {
      process.stdout.write(`   ${name}... `);
      await fn();
      console.log("✅");
      testsPassed++;
    } catch (error) {
      console.log("❌");
      console.error(`      Error: ${error.message}`);
      testsFailed++;
    }
  };

  // ============================================================================
  // TEST 1: Create Markets
  // ============================================================================
  console.log("📦 [1/8] Creating Test Markets\n");

  const now = Math.floor(Date.now() / 1000);
  const futureTime = now + 86400 * 30; // 30 days

  await test("Create Market 1: Bitcoin $150K", async () => {
    const tx = await market.createMarket(
      "Will Bitcoin reach $150,000 by Q1 2026?",
      "BTC price prediction with CoinGecko verification",
      "Crypto",
      futureTime,
      true
    );
    await tx.wait();
  });

  await test("Create Market 2: Ethereum $6K", async () => {
    const tx = await market.createMarket(
      "Will Ethereum reach $6,000 by March 2026?",
      "STT price prediction",
      "Crypto",
      futureTime,
      true
    );
    await tx.wait();
  });

  await test("Create Market 3: Taylor Swift Engagement", async () => {
    const tx = await market.createMarket(
      "Will Taylor Swift and Travis Kelce get engaged by Q2 2026?",
      "Celebrity relationship prediction",
      "Relationships",
      futureTime,
      true
    );
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 2: Regular Betting
  // ============================================================================
  console.log("📦 [2/8] Testing Regular Betting\n");

  await test("Trader1 buys YES position on Market 1 (100 USDC)", async () => {
    const amount = hre.ethers.parseUnits("100", 6);
    const tx = await market.connect(trader1).buyPosition(1, true, { value: amount });
    await tx.wait();
  });

  await test("Trader2 buys NO position on Market 1 (80 USDC)", async () => {
    const amount = hre.ethers.parseUnits("80", 6);
    const tx = await market.connect(trader2).buyPosition(1, false, { value: amount });
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 3: x402 Gasless Betting
  // ============================================================================
  console.log("📦 [3/8] Testing x402 Gasless Betting\n");

  await test("Check facilitator authorization", async () => {
    const isFacilitator = await x402.facilitators(facilitator.address);
    if (!isFacilitator) throw new Error("Facilitator not authorized");
  });

  await test("Trader1 gasless bet on Market 2 (50 USDC)", async () => {
    const amount = hre.ethers.parseUnits("50", 6);
    const deadline = now + 3600;
    const nonce = hre.ethers.randomBytes(32);

    // Create EIP-712 signature
    const domain = {
      name: "X402Betting",
      version: "1",
      chainId: 31337,
      verifyingContract: deployment.contracts.X402Betting
    };

    const types = {
      Bet: [
        { name: "marketId", type: "uint256" },
        { name: "position", type: "bool" },
        { name: "amount", type: "uint256" },
        { name: "from", type: "address" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    const value = {
      marketId: 2,
      position: true,
      amount: amount,
      from: trader1.address,
      deadline: deadline,
      nonce: nonce
    };

    const signature = await trader1.signTypedData(domain, types, value);

    // Facilitator executes gasless bet
    const tx = await x402.connect(facilitator).placeBetGasless(
      2,
      true,
      amount,
      trader1.address,
      deadline,
      nonce,
      signature
    );
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 4: Market Resolution
  // ============================================================================
  console.log("📦 [4/8] Testing Market Resolution\n");

  await test("Oracle resolves Market 1 (YES wins)", async () => {
    const tx = await aiOracle.connect(oracle).resolveMarket(1, true, "BTC reached $150K on CoinGecko");
    await tx.wait();
  });

  await test("Check Market 1 is resolved", async () => {
    const marketData = await market.getMarket(1);
    if (!marketData[8]) throw new Error("Market not resolved");
    if (!marketData[9]) throw new Error("Wrong outcome");
  });

  console.log();

  // ============================================================================
  // TEST 5: Claim Winnings
  // ============================================================================
  console.log("📦 [5/8] Testing Claim Winnings\n");

  await test("Trader1 claims winnings from Market 1", async () => {
    const tx = await market.connect(trader1).claimWinnings(1);
    await tx.wait();
  });

  await test("Check Trader1 USDC balance increased", async () => {
    const balance = await usdc.balanceOf(trader1.address);
    const expectedMin = hre.ethers.parseUnits("10050", 6); // Started with 10000, bet 100, won ~180
    if (balance < expectedMin) throw new Error(`Balance too low: ${hre.ethers.formatUnits(balance, 6)}`);
  });

  console.log();

  // ============================================================================
  // TEST 6: x402 Gasless Claim
  // ============================================================================
  console.log("📦 [6/8] Testing x402 Gasless Claim\n");

  await test("Resolve Market 2 (YES wins)", async () => {
    const tx = await aiOracle.connect(oracle).resolveMarket(2, true, "STT reached $6K");
    await tx.wait();
  });

  await test("Trader1 gasless claim from Market 2", async () => {
    const deadline = now + 3600;
    const nonce = hre.ethers.randomBytes(32);

    const domain = {
      name: "X402Betting",
      version: "1",
      chainId: 31337,
      verifyingContract: deployment.contracts.X402Betting
    };

    const types = {
      Claim: [
        { name: "marketId", type: "uint256" },
        { name: "from", type: "address" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    const value = {
      marketId: 2,
      from: trader1.address,
      deadline: deadline,
      nonce: nonce
    };

    const signature = await trader1.signTypedData(domain, types, value);

    const tx = await x402.connect(facilitator).claimGasless(
      2,
      trader1.address,
      deadline,
      nonce,
      signature
    );
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 7: Reputation System
  // ============================================================================
  console.log("📦 [7/8] Testing Reputation System\n");

  await test("Check Trader1 reputation (should have points)", async () => {
    const score = await reputation.getReputationScore(trader1.address);
    if (score === 0n) throw new Error("No reputation points");
  });

  await test("Trader1 records win", async () => {
    const tx = await reputation.recordWin(trader1.address, hre.ethers.parseUnits("180", 6));
    await tx.wait();
  });

  await test("Check updated reputation", async () => {
    const newScore = await reputation.getReputationScore(trader1.address);
    if (newScore < 20n) throw new Error("Reputation not updated correctly");
  });

  console.log();

  // ============================================================================
  // TEST 8: Market Data Retrieval
  // ============================================================================
  console.log("📦 [8/8] Testing Market Data Retrieval\n");

  await test("Get all markets count", async () => {
    const count = await market.getMarketCount();
    if (count < 3n) throw new Error(`Expected at least 3 markets, got ${count}`);
  });

  await test("Get Market 1 details", async () => {
    const marketData = await market.getMarket(1);
    if (!marketData[1]) throw new Error("Market question missing");
    if (!marketData[8]) throw new Error("Market should be resolved");
  });

  await test("Get Trader1 position on Market 1", async () => {
    const position = await market.getPosition(1, trader1.address);
    if (position[2]) throw new Error("Should have claimed winnings");
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
  } else {
    console.log("\n   ⚠️  SOME TESTS FAILED");
  }

  console.log("\n" + "=".repeat(70));

  // Save test results
  const results = {
    timestamp: new Date().toISOString(),
    network: deployment.network,
    total: total,
    passed: testsPassed,
    failed: testsFailed,
    successRate: successRate
  };

  const resultsPath = path.join(__dirname, '..', 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${resultsPath}\n`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("\n❌ Test suite failed:");
  console.error(error);
  process.exit(1);
});
