/**
 * x402 GASLESS BETTING TEST
 * Tests gasless transactions where facilitator pays gas, users sign authorizations
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🔥 x402 GASLESS BETTING TEST - STT PROTOCOL");
  console.log("=".repeat(70) + "\n");

  // Load deployment
  const deploymentPath = path.join(__dirname, 'deployments', 'local.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📁 Loaded deployment from local.json\n");

  // Get signers
  const [deployer, facilitator, oracle, trader1, trader2] = await hre.ethers.getSigners();

  console.log("👥 Test Accounts:");
  console.log(`   Facilitator: ${facilitator.address}`);
  console.log(`   Trader1: ${trader1.address}`);
  console.log(`   Trader2: ${trader2.address}\n`);

  // Get contract instances
  const market = await hre.ethers.getContractAt("PredictionMarket", deployment.contracts.PredictionMarket);
  const x402 = await hre.ethers.getContractAt("X402Betting", deployment.contracts.X402Betting);
  const usdc = await hre.ethers.getContractAt("MockERC20WithAuth", deployment.contracts.USDC);

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
  // SETUP: Fund x402 contract with STT
  // ============================================================================
  console.log("📦 [1/6] Setup x402 Contract\n");

  await test("Fund x402 contract with 10 STT (for conversions)", async () => {
    const amount = hre.ethers.parseEther("10");
    const tx = await deployer.sendTransaction({
      to: deployment.contracts.X402Betting,
      value: amount
    });
    await tx.wait();
  });

  await test("Check x402 facilitator is set", async () => {
    const fac = await x402.facilitator();
    if (fac !== facilitator.address) throw new Error("Facilitator mismatch");
  });

  await test("Check USDC balance for trader1", async () => {
    const balance = await usdc.balanceOf(trader1.address);
    const expected = hre.ethers.parseUnits("10000", 6);
    if (balance < expected) throw new Error(`Insufficient balance: ${hre.ethers.formatUnits(balance, 6)}`);
  });

  console.log();

  // ============================================================================
  // TEST 1: Create Markets
  // ============================================================================
  console.log("📦 [2/6] Create Test Markets\n");

  const now = Math.floor(Date.now() / 1000);
  const futureTime = now + 86400 * 30;

  await test("Create Market 1: BTC $150K", async () => {
    const tx = await market.createMarket(
      "Will Bitcoin reach $150,000 by Q1 2026?",
      "BTC price prediction with x402",
      "Crypto",
      futureTime,
      true
    );
    await tx.wait();
  });

  await test("Create Market 2: STT $6K", async () => {
    const tx = await market.createMarket(
      "Will Ethereum reach $6,000 by March 2026?",
      "STT price prediction with x402",
      "Crypto",
      futureTime,
      true
    );
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // TEST 2: Regular Betting (User Pays Gas with STT)
  // ============================================================================
  console.log("📦 [3/6] Regular Betting - User Pays Gas\n");

  await test("Trader1 bets YES on Market 1 (0.1 STT, pays own gas)", async () => {
    const amount = hre.ethers.parseEther("0.1");
    const balanceBefore = await hre.ethers.provider.getBalance(trader1.address);
    const tx = await market.connect(trader1).buyPosition(1, true, { value: amount });
    const receipt = await tx.wait();
    const balanceAfter = await hre.ethers.provider.getBalance(trader1.address);
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const totalCost = amount + gasUsed;
    if (balanceBefore - balanceAfter < totalCost) throw new Error("Gas not paid by user");
    console.log(`\n      ⛽ User paid gas: ${hre.ethers.formatEther(gasUsed)} STT`);
  });

  console.log();

  // ============================================================================
  // TEST 3: x402 Gasless Betting (Facilitator Pays Gas)
  // ============================================================================
  console.log("📦 [4/6] x402 Gasless Betting - Facilitator Pays Gas\n");

  await test("Trader2 places GASLESS bet on Market 2 (100 USDC)", async () => {
    const value = hre.ethers.parseUnits("100", 6);
    const validAfter = 0;
    const validBefore = now + 3600;
    const nonce = hre.ethers.randomBytes(32);

    // Trader2 checks balance BEFORE (should not decrease except USDC)
    const bnbBefore = await hre.ethers.provider.getBalance(trader2.address);
    const usdcBefore = await usdc.balanceOf(trader2.address);

    console.log(`\n      Trader2 STT before: ${hre.ethers.formatEther(bnbBefore)}`);
    console.log(`      Trader2 USDC before: ${hre.ethers.formatUnits(usdcBefore, 6)}`);

    // Create EIP-3009 authorization signature
    const domain = {
      name: "USD Coin",
      version: "1",
      chainId: 50312,
      verifyingContract: deployment.contracts.USDC
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    const message = {
      from: trader2.address,
      to: deployment.contracts.X402Betting,
      value: value,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce
    };

    const signature = await trader2.signTypedData(domain, types, message);

    // Facilitator executes the gasless transaction (facilitator pays gas!)
    const tx = await x402.connect(facilitator).buyPositionWithAuthorization(
      2,
      true,
      trader2.address,
      value,
      validAfter,
      validBefore,
      nonce,
      signature
    );
    const receipt = await tx.wait();

    // Check balances AFTER
    const bnbAfter = await hre.ethers.provider.getBalance(trader2.address);
    const usdcAfter = await usdc.balanceOf(trader2.address);

    console.log(`      Trader2 STT after: ${hre.ethers.formatEther(bnbAfter)}`);
    console.log(`      Trader2 USDC after: ${hre.ethers.formatUnits(usdcAfter, 6)}`);
    
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    console.log(`      ⛽ Gas paid by FACILITATOR: ${hre.ethers.formatEther(gasUsed)} STT`);
    console.log(`      💸 USDC spent: ${hre.ethers.formatUnits(usdcBefore - usdcAfter, 6)}`);

    // VERIFY: Trader2's STT balance should be EXACTLY the same (no gas paid)
    if (bnbBefore !== bnbAfter) {
      throw new Error(`Trader2 paid gas! Before: ${bnbBefore}, After: ${bnbAfter}`);
    }

    // VERIFY: Only USDC was spent
    if (usdcBefore - usdcAfter !== value) {
      throw new Error("Incorrect USDC amount spent");
    }
  });

  await test("Another trader1 GASLESS bet on Market 1 (50 USDC)", async () => {
    const value = hre.ethers.parseUnits("50", 6);
    const validAfter = 0;
    const validBefore = now + 3600;
    const nonce = hre.ethers.randomBytes(32);

    const bnbBefore = await hre.ethers.provider.getBalance(trader1.address);

    const domain = {
      name: "USD Coin",
      version: "1",
      chainId: 50312,
      verifyingContract: deployment.contracts.USDC
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };

    const message = {
      from: trader1.address,
      to: deployment.contracts.X402Betting,
      value: value,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce
    };

    const signature = await trader1.signTypedData(domain, types, message);

    await x402.connect(facilitator).buyPositionWithAuthorization(
      1,
      false, // NO position
      trader1.address,
      value,
      validAfter,
      validBefore,
      nonce,
      signature
    );

    const bnbAfter = await hre.ethers.provider.getBalance(trader1.address);

    // VERIFY: No STT spent by trader
    if (bnbBefore !== bnbAfter) {
      throw new Error("Trader paid gas on gasless transaction!");
    }
  });

  console.log();

  // ============================================================================
  // TEST 4: Market Resolution
  // ============================================================================
  console.log("📦 [5/6] Market Resolution\n");

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
  // TEST 5: Claim Winnings
  // ============================================================================
  console.log("📦 [6/6] Claim Winnings\n");

  await test("Trader1 claims from Market 1 (paid gas initially)", async () => {
    const tx = await market.connect(trader1).claimWinnings(1);
    await tx.wait();
  });

  await test("Trader2 claims from Market 2 (used x402)", async () => {
    const tx = await market.connect(trader2).claimWinnings(2);
    await tx.wait();
  });

  console.log();

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("=".repeat(70));
  console.log("📊 x402 GASLESS TEST SUMMARY");
  console.log("=".repeat(70) + "\n");

  const total = testsPassed + testsFailed;
  const successRate = ((testsPassed / total) * 100).toFixed(1);

  console.log(`   Total Tests:    ${total}`);
  console.log(`   ✅ Passed:      ${testsPassed}`);
  console.log(`   ❌ Failed:      ${testsFailed}`);
  console.log(`   Success Rate:   ${successRate}%`);

  if (testsFailed === 0) {
    console.log("\n   🎉 ALL x402 TESTS PASSED!");
    console.log("\n   ✅ x402 Protocol Working:");
    console.log("      - Users sign USDC transfer authorizations");
    console.log("      - Facilitator executes transactions");
    console.log("      - Facilitator pays ALL gas fees");
    console.log("      - Users only spend USDC, NO STT required");
    console.log("      - 100% gasless experience for end users");
    console.log("\n   🔥 Ready for mainnet deployment!");
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
