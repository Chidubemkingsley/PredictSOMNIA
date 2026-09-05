const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("🚀 Deploying x402 Protocol to Somnia");
  console.log("═══════════════════════════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "STT\n");

  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log();

  // 1. Deploy PredictionMarket (if not already deployed)
  console.log("1️⃣ Deploying PredictionMarket...");
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy();
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);
  console.log();

  // 2. Deploy TraderReputation (if not already deployed)
  console.log("2️⃣ Deploying TraderReputation...");
  const TraderReputation = await ethers.getContractFactory("TraderReputation");
  const traderReputation = await TraderReputation.deploy(predictionMarketAddress);
  await traderReputation.waitForDeployment();
  const traderReputationAddress = await traderReputation.getAddress();
  console.log("✅ TraderReputation deployed to:", traderReputationAddress);
  console.log();

  // 3. Deploy AIOracle (if not already deployed)
  console.log("3️⃣ Deploying AIOracle...");
  const AIOracle = await ethers.getContractFactory("AIOracle");
  const aiOracle = await AIOracle.deploy(predictionMarketAddress);
  await aiOracle.waitForDeployment();
  const aiOracleAddress = await aiOracle.getAddress();
  console.log("✅ AIOracle deployed to:", aiOracleAddress);
  console.log();

  // 4. Configure PredictionMarket
  console.log("4️⃣ Configuring PredictionMarket...");
  const setReputationTx = await predictionMarket.setReputationContract(traderReputationAddress);
  await setReputationTx.wait();
  console.log("✅ Reputation contract set");

  const authorizeOracleTx = await predictionMarket.setAuthorizedOracle(aiOracleAddress, true);
  await authorizeOracleTx.wait();
  console.log("✅ AIOracle authorized");
  console.log();

  // 5. Deploy Mock ERC20 Token (for testing) — Somnia tUSDC 6d parity (DreamDEX faucet cap 10k)
  console.log("5️⃣ Deploying MockERC20WithAuth (test token — 6d tUSDC)...");
  const MockERC20 = await ethers.getContractFactory("MockERC20WithAuth");
  const mockToken = await MockERC20.deploy("Test USDC", "tUSDC", 6);
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log("✅ MockERC20WithAuth deployed to:", mockTokenAddress);
  console.log();

  // 6. Deploy X402Betting Contract — Somnia Shannon (STT gas, tUSDC 6d collateral, EIP-3009)
  console.log("6️⃣ Deploying X402Betting (Somnia STT gasless, tUSDC 6d)...");
  const X402Betting = await ethers.getContractFactory("X402Betting");
  const x402Betting = await X402Betting.deploy(
    predictionMarketAddress,
    mockTokenAddress
  );
  await x402Betting.waitForDeployment();
  const x402BettingAddress = await x402Betting.getAddress();
  console.log("✅ X402Betting deployed to:", x402BettingAddress);
  console.log();

  // 7. Authorize X402Betting in PredictionMarket
  console.log("7️⃣ Authorizing X402Betting...");
  const authorizeX402Tx = await predictionMarket.setAuthorizedOracle(x402BettingAddress, true);
  await authorizeX402Tx.wait();
  console.log("✅ X402Betting authorized in PredictionMarket");
  console.log();

  // 8. Fund X402Betting with STT for gas sponsorship
  console.log("8️⃣ Funding X402Betting with STT for gas sponsorship...");
  const fundAmount = ethers.parseEther("1.0"); // 1 STT for gas
  const fundTx = await deployer.sendTransaction({
    to: x402BettingAddress,
    value: fundAmount
  });
  await fundTx.wait();
  console.log("✅ Funded X402Betting with 1 STT");
  console.log();

  // Print deployment summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("📝 Contract Addresses:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("PredictionMarket:", predictionMarketAddress);
  console.log("TraderReputation:", traderReputationAddress);
  console.log("AIOracle:", aiOracleAddress);
  console.log("MockERC20WithAuth:", mockTokenAddress);
  console.log("X402Betting:", x402BettingAddress);
  console.log();

  console.log("📋 Environment Variables (add to .env):");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${predictionMarketAddress}`);
  console.log(`NEXT_PUBLIC_TRADER_REPUTATION_ADDRESS=${traderReputationAddress}`);
  console.log(`NEXT_PUBLIC_AI_ORACLE_ADDRESS=${aiOracleAddress}`);
  console.log(`NEXT_PUBLIC_X402_BETTING_ADDRESS=${x402BettingAddress}`);
  console.log(`NEXT_PUBLIC_BETTING_TOKEN_ADDRESS=${mockTokenAddress}  # tUSDC 6d — faucet() cap 10k`);
  console.log(`FACILITATOR_PRIVATE_KEY=${process.env.PRIVATE_KEY || 'YOUR_FACILITATOR_PRIVATE_KEY'}  # STT gas sponsor on 50312`);
  console.log(`NEXT_PUBLIC_DEFAULT_CHAIN_ID=${network.chainId.toString()}  # Somnia Shannon 50312`);
  console.log(`SOMNIA_ORACLE_HUB_URL=https://prd.oracle.somnia.host  # DreamDEX settlement`);
  console.log();

  console.log("🔧 Next Steps:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("1. Update .env.local with the addresses above");
  console.log("2. Restart Next.js dev server: npm run dev");
  console.log("3. Test gasless betting with real wallets");
  console.log("4. Monitor gas sponsorship on X402Betting");
  console.log("5. Verify contracts on Shannon Explorer (optional):");
  console.log(`   npx hardhat verify --network ${network.name} ${x402BettingAddress} ${predictionMarketAddress} ${mockTokenAddress} ${deployer.address}`);
  console.log();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("🎉 x402 Protocol Ready for Testing!");
  console.log("═══════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
