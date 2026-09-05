/**
 * Complete Deployment Script for Local Hardhat Network
 * Deploys all contracts including x402 protocol
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 COMPLETE CONTRACT DEPLOYMENT - LOCAL HARDHAT — Somnia Shannon 50312 (DreamDEX Event Contracts)");
  console.log("=".repeat(70) + "\n");

  const [deployer, facilitator, oracle, trader1, trader2] = await hre.ethers.getSigners();
  
  console.log("📍 Deployer:", deployer.address);
  console.log("🤖 Facilitator:", facilitator.address);
  console.log("🔮 Oracle:", oracle.address);
  console.log("👤 Trader 1:", trader1.address);
  console.log("👤 Trader 2:", trader2.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Deployer Balance: ${hre.ethers.formatEther(balance)} STT (Somnia Shannon, tUSDC 0x70a86D... collateral separate)\n`);

  // ============================================================================
  // 1. Deploy Mock USDC (tUSDC 6d on Somnia Shannon — DreamDEX CollateralRouter faucet cap 10k, FaucetCapExceeded)
  // ============================================================================
  console.log("📦 [1/6] Deploying Mock tUSDC (6d, Somnia Shannon collateral)...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20WithAuth");
  const usdc = await MockERC20.deploy("tUSDC", "tUSDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`   ✅ Mock tUSDC (6d): ${usdcAddress}  # DreamDEX Collateral 0x70a86D88... parity\n`);

  // ============================================================================
  // 2. Deploy TraderReputation
  // ============================================================================
  console.log("📦 [2/6] Deploying TraderReputation...");
  const TraderReputation = await hre.ethers.getContractFactory("TraderReputation");
  const reputation = await TraderReputation.deploy(deployer.address);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log(`   ✅ TraderReputation: ${reputationAddress}\n`);

  // ============================================================================
  // 3. Deploy PredictionMarket (MUST be before AIOracle)
  // ============================================================================
  console.log("📦 [3/6] Deploying PredictionMarket...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const market = await PredictionMarket.deploy();
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log(`   ✅ PredictionMarket: ${marketAddress}\n`);

  // ============================================================================
  // 4. Deploy AIOracle (needs PredictionMarket address)
  // ============================================================================
  console.log("📦 [4/6] Deploying AIOracle...");
  const AIOracle = await hre.ethers.getContractFactory("AIOracle");
  const aiOracle = await AIOracle.deploy(marketAddress);
  await aiOracle.waitForDeployment();
  const aiOracleAddress = await aiOracle.getAddress();
  console.log(`   ✅ AIOracle: ${aiOracleAddress}\n`);

  // ============================================================================
  // 5. Deploy GaslessRelayer
  // ============================================================================
  console.log("📦 [5/6] Deploying GaslessRelayer...");
  const GaslessRelayer = await hre.ethers.getContractFactory("GaslessRelayer");
  const relayer = await GaslessRelayer.deploy();
  await relayer.waitForDeployment();
  const relayerAddress = await relayer.getAddress();
  console.log(`   ✅ GaslessRelayer: ${relayerAddress}\n`);

  // ============================================================================
  // 6. Deploy X402Betting (Extended)
  // ============================================================================
  console.log("📦 [6/6] Deploying X402Betting (Extended)...");
  const X402Betting = await hre.ethers.getContractFactory("X402Betting");
  const x402 = await X402Betting.deploy(
    marketAddress,
    usdcAddress
  );
  await x402.waitForDeployment();
  const x402Address = await x402.getAddress();
  console.log(`   ✅ X402Betting: ${x402Address}\n`);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  console.log("⚙️  Configuring contracts...\n");

  // Set X402 facilitator
  console.log("   Setting facilitator for X402...");
  let tx = await x402.setFacilitator(facilitator.address);
  await tx.wait();
  console.log(`   ✅ Facilitator authorized: ${facilitator.address}`);

  // Authorize AIOracle address in PredictionMarket
  console.log("   Authorizing AIOracle in PredictionMarket...");
  tx = await market.setAuthorizedOracle(aiOracleAddress, true);
  await tx.wait();
  console.log(`   ✅ AIOracle authorized in PredictionMarket`);

  // Authorize oracle account to resolve markets
  console.log("   Authorizing oracle account...");
  tx = await market.setAuthorizedOracle(oracle.address, true);
  await tx.wait();
  console.log(`   ✅ Oracle account authorized: ${oracle.address}`);

  // Set AI agent authorization (for off-chain AI resolution)
  console.log("   Setting AI agent for oracle...");
  tx = await aiOracle.setAIAgent(oracle.address, true);
  await tx.wait();
  console.log(`   ✅ AI agent authorized: ${oracle.address}`);

  // Mint USDC to traders for testing
  console.log("\n   Minting test USDC...");
  const mintAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC
  tx = await usdc.mint(trader1.address, mintAmount);
  await tx.wait();
  tx = await usdc.mint(trader2.address, mintAmount);
  await tx.wait();
  tx = await usdc.mint(facilitator.address, mintAmount);
  await tx.wait();
  console.log(`   ✅ Minted 10,000 USDC to each trader`);

  // Approve market to spend USDC
  console.log("   Approving USDC spending...");
  const approveAmount = hre.ethers.parseUnits("100000", 6);
  tx = await usdc.connect(trader1).approve(marketAddress, approveAmount);
  await tx.wait();
  tx = await usdc.connect(trader2).approve(marketAddress, approveAmount);
  await tx.wait();
  console.log(`   ✅ USDC approved for traders\n`);

  // ============================================================================
  // SAVE DEPLOYMENT INFO
  // ============================================================================
  const deployment = {
    network: "localhost",
    chainId: 50312,
    timestamp: new Date().toISOString(),
    contracts: {
      USDC: usdcAddress,
      TraderReputation: reputationAddress,
      AIOracle: aiOracleAddress,
      PredictionMarket: marketAddress,
      GaslessRelayer: relayerAddress,
      X402Betting: x402Address,
    },
    accounts: {
      deployer: deployer.address,
      facilitator: facilitator.address,
      oracle: oracle.address,
      trader1: trader1.address,
      trader2: trader2.address,
    }
  };

  const deploymentPath = path.join(__dirname, '..', 'deployments', 'local.json');
  const deploymentDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  // Update frontend .env.local
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  // Remove old contract addresses
  envContent = envContent.split('\n').filter(line => 
    !line.startsWith('NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_TRADER_REPUTATION_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_AI_ORACLE_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_GASLESS_RELAYER_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_X402_BETTING_ADDRESS=') &&
    !line.startsWith('NEXT_PUBLIC_USDC_ADDRESS=') &&
    !line.startsWith('FACILITATOR_PRIVATE_KEY=')
  ).join('\n');

  // Add new addresses
  envContent += `\n
# Contract Addresses (Local Hardhat)
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${marketAddress}
NEXT_PUBLIC_TRADER_REPUTATION_ADDRESS=${reputationAddress}
NEXT_PUBLIC_AI_ORACLE_ADDRESS=${aiOracleAddress}
NEXT_PUBLIC_GASLESS_RELAYER_ADDRESS=${relayerAddress}
NEXT_PUBLIC_X402_BETTING_ADDRESS=${x402Address}
NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}

# Facilitator (for x402 gasless transactions)
FACILITATOR_PRIVATE_KEY=${facilitator.privateKey}
`;

  fs.writeFileSync(envPath, envContent.trim() + '\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(70));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70) + "\n");

  console.log("📋 CONTRACT ADDRESSES:");
  console.log(`   PredictionMarket:  ${marketAddress}`);
  console.log(`   TraderReputation:  ${reputationAddress}`);
  console.log(`   AIOracle:          ${aiOracleAddress}`);
  console.log(`   GaslessRelayer:    ${relayerAddress}`);
  console.log(`   X402Betting:       ${x402Address}`);
  console.log(`   USDC (Mock):       ${usdcAddress}`);

  console.log("\n👥 TEST ACCOUNTS:");
  console.log(`   Deployer:    ${deployer.address}`);
  console.log(`   Facilitator: ${facilitator.address}`);
  console.log(`   Oracle:      ${oracle.address}`);
  console.log(`   Trader 1:    ${trader1.address}`);
  console.log(`   Trader 2:    ${trader2.address}`);

  console.log("\n📁 SAVED:");
  console.log(`   ${deploymentPath}`);
  console.log(`   ${envPath}`);

  console.log("\n🎯 NEXT STEPS:");
  console.log("   1. Keep Hardhat node running in another terminal:");
  console.log("      cd contracts && npx hardhat node");
  console.log("\n   2. Run end-to-end test:");
  console.log("      node test-e2e-complete.js");
  console.log("\n   3. Start frontend:");
  console.log("      npm run dev");

  console.log("\n" + "=".repeat(70) + "\n");

  return deployment;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
