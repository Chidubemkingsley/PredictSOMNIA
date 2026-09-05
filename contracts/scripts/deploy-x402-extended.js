const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Extended X402Betting Contract...\n");

  // Get existing contract addresses from environment
  const predictionMarketAddress = process.env.PREDICTION_MARKET_ADDRESS;
  const traderReputationAddress = process.env.TRADER_REPUTATION_ADDRESS;
  const usdcAddress = process.env.USDC_ADDRESS;

  if (!predictionMarketAddress || !traderReputationAddress || !usdcAddress) {
    throw new Error("Missing contract addresses. Set PREDICTION_MARKET_ADDRESS, TRADER_REPUTATION_ADDRESS, and USDC_ADDRESS in .env");
  }

  console.log("📝 Using existing contracts:");
  console.log(`  PredictionMarket: ${predictionMarketAddress}`);
  console.log(`  TraderReputation: ${traderReputationAddress}`);
  console.log(`  USDC: ${usdcAddress}\n`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`📍 Deploying from: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} STT\n`);

  // Deploy X402Betting — Somnia Shannon (STT gas, tUSDC 6d, correct 2-arg constructor)
  console.log("⏳ Deploying X402Betting contract (Somnia Shannon, tUSDC 6d)...");
  const X402Betting = await hre.ethers.getContractFactory("X402Betting");
  
  const x402Betting = await X402Betting.deploy(
    predictionMarketAddress,
    usdcAddress
  );

  await x402Betting.waitForDeployment();
  const x402Address = await x402Betting.getAddress();

  console.log(`✅ X402Betting deployed to: ${x402Address} (Somnia Shannon 50312, tUSDC 6d, STT gasless)\n`);

  // Set facilitator (deployer by default) — Somnia STT gas sponsor
  console.log("⏳ Setting facilitator (STT gas sponsor on Somnia Shannon)...");
  const tx = await x402Betting.setFacilitator(deployer.address);
  await tx.wait();
  console.log(`✅ Facilitator set: ${deployer.address}\n`);

  // Display configuration instructions
  console.log("=" .repeat(60));
  console.log("📋 CONFIGURATION STEPS");
  console.log("=" .repeat(60));
  console.log("\n1. Update .env.local:");
  console.log(`   NEXT_PUBLIC_X402_BETTING_ADDRESS=${x402Address}`);
  console.log(`   FACILITATOR_PRIVATE_KEY=<your_private_key>`);
  
  console.log("\n2. Update Vercel environment variables:");
  console.log(`   vercel env add NEXT_PUBLIC_X402_BETTING_ADDRESS`);
  console.log(`   (enter: ${x402Address})`);
  console.log(`   vercel env add FACILITATOR_PRIVATE_KEY`);
  console.log(`   (enter your private key securely)`);

  console.log("\n3. Fund facilitator account:");
  console.log(`   Send 0.5-1 STT to: ${deployer.address}`);
  console.log(`   Testnet faucet: https://shannon-explorer.somnia.network`);

  console.log("\n4. Verify contract on Shannon Explorer:");
  console.log(`   npx hardhat verify --network somniaTestnet ${x402Address} ${predictionMarketAddress} ${traderReputationAddress} ${usdcAddress}`);

  console.log("\n5. Test gasless operations:");
  console.log(`   node test-x402-complete.js`);

  console.log("\n" + "=" .repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=" .repeat(60));

  // Save deployment info
  const fs = require('fs');
  const deployment = {
    network: hre.network.name,
    x402Betting: x402Address,
    predictionMarket: predictionMarketAddress,
    traderReputation: traderReputationAddress,
    usdc: usdcAddress,
    facilitator: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    'x402-deployment.json',
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n💾 Deployment info saved to: x402-deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
