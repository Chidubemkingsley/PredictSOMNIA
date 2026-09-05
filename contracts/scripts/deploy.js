const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PredictSOMNIA contracts to Somnia Network — Shannon 50312 (DreamDEX Event Contracts)");

  // Deploy PredictionMarket
  console.log("\n📝 Deploying PredictionMarket contract...");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy();
  await predictionMarket.waitForDeployment();
  const predictionMarketAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);

  // Deploy AIOracle
  console.log("\n📝 Deploying AIOracle contract...");
  const AIOracle = await hre.ethers.getContractFactory("AIOracle");
  const aiOracle = await AIOracle.deploy(predictionMarketAddress);
  await aiOracle.waitForDeployment();
  const aiOracleAddress = await aiOracle.getAddress();
  console.log("✅ AIOracle deployed to:", aiOracleAddress);

  // Deploy GaslessRelayer
  console.log("\n📝 Deploying GaslessRelayer contract...");
  const GaslessRelayer = await hre.ethers.getContractFactory("GaslessRelayer");
  const gaslessRelayer = await GaslessRelayer.deploy();
  await gaslessRelayer.waitForDeployment();
  const gaslessRelayerAddress = await gaslessRelayer.getAddress();
  console.log("✅ GaslessRelayer deployed to:", gaslessRelayerAddress);

  // Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Authorize AIOracle in PredictionMarket
  await predictionMarket.setAuthorizedOracle(aiOracleAddress, true);
  console.log("✅ AIOracle authorized in PredictionMarket");

  // Whitelist PredictionMarket in GaslessRelayer
  await gaslessRelayer.setWhitelistedContract(predictionMarketAddress, true);
  console.log("✅ PredictionMarket whitelisted in GaslessRelayer");

  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Contract Addresses:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("PredictionMarket:", predictionMarketAddress);
  console.log("AIOracle:", aiOracleAddress);
  console.log("GaslessRelayer:", gaslessRelayerAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n📝 Update these addresses in src/lib/contracts/addresses.ts");
  console.log("\n🔍 Verify contracts on Shannon Explorer:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${predictionMarketAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${aiOracleAddress} ${predictionMarketAddress}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${gaslessRelayerAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
