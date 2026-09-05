const hre = require("hardhat");
const crypto = require("crypto");

async function main() {
  console.log("🧪 Testing Complete x402 Gasless Implementation\n");

  // Load deployment info
  const deployment = require('./x402-deployment.json');
  
  const [deployer, user] = await hre.ethers.getSigners();
  
  console.log("📝 Test Configuration:");
  console.log(`  X402Betting: ${deployment.x402Betting}`);
  console.log(`  Test User: ${user.address}`);
  console.log(`  Facilitator: ${deployer.address}\n`);

  // Get contract instances
  const x402Betting = await hre.ethers.getContractAt("X402Betting", deployment.x402Betting);
  const predictionMarket = await hre.ethers.getContractAt("PredictionMarket", deployment.predictionMarket);
  const traderReputation = await hre.ethers.getContractAt("TraderReputation", deployment.traderReputation);
  const usdc = await hre.ethers.getContractAt("MockUSDC", deployment.usdc);

  // Test tracking
  let testsPassed = 0;
  let testsFailed = 0;

  console.log("=" .repeat(60));
  console.log("TEST 1: Gasless Claim Winnings");
  console.log("=" .repeat(60));

  try {
    // Setup: Create market and place bet
    console.log("⏳ Setting up test market...");
    const createTx = await predictionMarket.createMarket(
      "Test Market for Claim",
      "Testing gasless claim",
      "test",
      Math.floor(Date.now() / 1000) + 3600,
      false
    );
    await createTx.wait();
    
    // Get market ID from event
    const marketId = 1; // Assume first market
    
    // Fund user with USDC
    const betAmount = hre.ethers.parseEther("10");
    const approveTx = await usdc.connect(user).approve(deployment.x402Betting, betAmount);
    await approveTx.wait();

    // Place bet gaslessly (using existing functionality)
    console.log("⏳ Placing bet gaslessly...");
    const nonce1 = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline1 = Math.floor(Date.now() / 1000) + 3600;
    
    // ... bet placement code ...

    // Resolve market
    console.log("⏳ Resolving market...");
    const resolveTx = await predictionMarket.resolveMarket(marketId, true);
    await resolveTx.wait();

    // Test gasless claim
    console.log("⏳ Testing gasless claim...");
    const nonce2 = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline2 = Math.floor(Date.now() / 1000) + 3600;

    // Create EIP-712 hash for claim
    const claimHash = hre.ethers.solidityPackedKeccak256(
      ["uint256", "address", "uint256", "bytes32"],
      [marketId, user.address, deadline2, nonce2]
    );

    const ethSignedHash = hre.ethers.solidityPackedKeccak256(
      ["string", "bytes32"],
      ["\x19Ethereum Signed Message:\n32", claimHash]
    );

    // Sign with user's wallet
    const signature = await user.signMessage(hre.ethers.getBytes(claimHash));

    // Facilitator executes claim
    const claimTx = await x402Betting.claimWinningsWithAuthorization(
      marketId,
      user.address,
      deadline2,
      nonce2,
      signature
    );

    const receipt = await claimTx.wait();
    console.log(`✅ Gasless claim successful! Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Transaction: ${receipt.hash}\n`);
    
    testsPassed++;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}\n`);
    testsFailed++;
  }

  console.log("=" .repeat(60));
  console.log("TEST 2: Gasless Follow Trader");
  console.log("=" .repeat(60));

  try {
    const trader = deployer.address; // Use deployer as trader
    const maxAmount = hre.ethers.parseEther("50");
    const copyPercentage = 50; // 50%
    const nonce = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    console.log(`⏳ Testing gasless follow (trader: ${trader})...`);

    // Create EIP-712 hash
    const followHash = hre.ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256", "bytes32"],
      [trader, maxAmount, copyPercentage, user.address, deadline, nonce]
    );

    const signature = await user.signMessage(hre.ethers.getBytes(followHash));

    // Facilitator executes follow
    const followTx = await x402Betting.followTraderWithAuthorization(
      trader,
      maxAmount,
      copyPercentage,
      user.address,
      deadline,
      nonce,
      signature
    );

    const receipt = await followTx.wait();
    console.log(`✅ Gasless follow successful! Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Transaction: ${receipt.hash}\n`);
    
    testsPassed++;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}\n`);
    testsFailed++;
  }

  console.log("=" .repeat(60));
  console.log("TEST 3: Gasless Unfollow Trader");
  console.log("=" .repeat(60));

  try {
    const trader = deployer.address;
    const nonce = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    console.log(`⏳ Testing gasless unfollow...`);

    // Create EIP-712 hash
    const unfollowHash = hre.ethers.solidityPackedKeccak256(
      ["address", "address", "uint256", "bytes32"],
      [trader, user.address, deadline, nonce]
    );

    const signature = await user.signMessage(hre.ethers.getBytes(unfollowHash));

    // Facilitator executes unfollow
    const unfollowTx = await x402Betting.unfollowTraderWithAuthorization(
      trader,
      user.address,
      deadline,
      nonce,
      signature
    );

    const receipt = await unfollowTx.wait();
    console.log(`✅ Gasless unfollow successful! Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Transaction: ${receipt.hash}\n`);
    
    testsPassed++;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}\n`);
    testsFailed++;
  }

  console.log("=" .repeat(60));
  console.log("TEST 4: Gasless Create Market");
  console.log("=" .repeat(60));

  try {
    const question = "Will STT reach $5000 by EOY?";
    const description = "Testing gasless market creation";
    const category = "crypto";
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 1 day
    const aiEnabled = true;
    const nonce = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    console.log(`⏳ Testing gasless market creation...`);

    // Create EIP-712 hash (hash strings separately)
    const questionHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(question));
    const descHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(description));
    const catHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(category));

    const createHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "bytes32", "bytes32", "uint256", "bool", "address", "uint256", "bytes32"],
      [questionHash, descHash, catHash, endTime, aiEnabled, user.address, deadline, nonce]
    );

    const signature = await user.signMessage(hre.ethers.getBytes(createHash));

    // Facilitator executes market creation
    const createTx = await x402Betting.createMarketWithAuthorization(
      question,
      description,
      category,
      endTime,
      aiEnabled,
      user.address,
      deadline,
      nonce,
      signature
    );

    const receipt = await createTx.wait();
    console.log(`✅ Gasless market creation successful! Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Transaction: ${receipt.hash}\n`);
    
    testsPassed++;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}\n`);
    testsFailed++;
  }

  console.log("=" .repeat(60));
  console.log("TEST 5: Nonce Replay Protection");
  console.log("=" .repeat(60));

  try {
    const trader = deployer.address;
    const maxAmount = hre.ethers.parseEther("50");
    const copyPercentage = 50;
    const nonce = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    console.log(`⏳ Testing nonce replay protection...`);

    // Create signature
    const followHash = hre.ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256", "bytes32"],
      [trader, maxAmount, copyPercentage, user.address, deadline, nonce]
    );

    const signature = await user.signMessage(hre.ethers.getBytes(followHash));

    // First call should succeed
    const tx1 = await x402Betting.followTraderWithAuthorization(
      trader, maxAmount, copyPercentage, user.address, deadline, nonce, signature
    );
    await tx1.wait();
    console.log("  First transaction succeeded");

    // Second call with same nonce should fail
    try {
      await x402Betting.followTraderWithAuthorization(
        trader, maxAmount, copyPercentage, user.address, deadline, nonce, signature
      );
      console.error("❌ Replay protection FAILED - same nonce accepted twice!");
      testsFailed++;
    } catch (replayError) {
      console.log("✅ Replay protection working - second transaction rejected\n");
      testsPassed++;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}\n`);
    testsFailed++;
  }

  console.log("=" .repeat(60));
  console.log("TEST 6: Deadline Enforcement");
  console.log("=" .repeat(60));

  try {
    const trader = deployer.address;
    const maxAmount = hre.ethers.parseEther("50");
    const copyPercentage = 50;
    const nonce = "0x" + crypto.randomBytes(32).toString("hex");
    const deadline = Math.floor(Date.now() / 1000) - 3600; // Expired deadline

    console.log(`⏳ Testing deadline enforcement...`);

    // Create signature with expired deadline
    const followHash = hre.ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address", "uint256", "bytes32"],
      [trader, maxAmount, copyPercentage, user.address, deadline, nonce]
    );

    const signature = await user.signMessage(hre.ethers.getBytes(followHash));

    // Should fail due to expired deadline
    try {
      await x402Betting.followTraderWithAuthorization(
        trader, maxAmount, copyPercentage, user.address, deadline, nonce, signature
      );
      console.error("❌ Deadline enforcement FAILED - expired signature accepted!");
      testsFailed++;
    } catch (deadlineError) {
      console.log("✅ Deadline enforcement working - expired signature rejected\n");
      testsPassed++;
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}\n`);
    testsFailed++;
  }

  // Summary
  console.log("=" .repeat(60));
  console.log("TEST SUMMARY");
  console.log("=" .repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📊 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

  if (testsFailed === 0) {
    console.log("🎉 ALL TESTS PASSED - x402 Implementation Ready for Demo!");
  } else {
    console.log("⚠️  Some tests failed - review errors above");
  }

  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
