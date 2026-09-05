/**
 * Somnia Shannon Testnet Deployment Script
 * 
 * Prerequisites:
 * 1. Add Somnia Shannon Testnet to MetaMask (Chain ID: 50312)
 * 2. Get free STT from: https://shannon-explorer.somnia.network
 * 3. Export your private key from MetaMask
 * 4. Add to .env: PRIVATE_KEY=your_private_key_here
 * 
 * Deploy:
 * npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet
 */

const { ethers } = require('hardhat');

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          Deploying to Somnia Shannon Testnet (Chain ID: 50312)            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log('📋 Deployment Information:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} STT`);
  console.log(`Network: Somnia Shannon Testnet`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`Block Explorer: https://shannon-explorer.somnia.network\n`);

  if (Number(ethers.formatEther(balance)) < 0.05) {
    console.log('⚠️  WARNING: Low balance! Get more STT from faucet:');
    console.log('   https://shannon-explorer.somnia.network\n');
  }

  // Deploy PredictionMarket (creates reputation contract internally)
  console.log('📝 Deploying PredictionMarket...');
  const PredictionMarket = await ethers.getContractFactory('PredictionMarket');
  const predictionMarket = await PredictionMarket.deploy();
  await predictionMarket.waitForDeployment();
  const marketAddress = await predictionMarket.getAddress();
  console.log(`✅ PredictionMarket: ${marketAddress}\n`);

  // Get reputation contract address from PredictionMarket
  const reputationAddress = await predictionMarket.reputationContract();
  console.log(`✅ TraderReputation: ${reputationAddress}\n`);

  // Deploy AIOracle
  console.log('📝 Deploying AIOracle...');
  const AIOracle = await ethers.getContractFactory('AIOracle');
  const aiOracle = await AIOracle.deploy(marketAddress);
  await aiOracle.waitForDeployment();
  const oracleAddress = await aiOracle.getAddress();
  console.log(`✅ AIOracle: ${oracleAddress}\n`);

  // Deploy GaslessRelayer
  console.log('📝 Deploying GaslessRelayer...');
  const GaslessRelayer = await ethers.getContractFactory('GaslessRelayer');
  const gaslessRelayer = await GaslessRelayer.deploy();
  await gaslessRelayer.waitForDeployment();
  const relayerAddress = await gaslessRelayer.getAddress();
  console.log(`✅ GaslessRelayer: ${relayerAddress}\n`);

  // Configuration
  console.log('⚙️  Configuring contracts...');
  
  // Set reputation contract in PredictionMarket
  let tx = await predictionMarket.setReputationContract(reputationAddress);
  await tx.wait();
  console.log('✅ Reputation contract set');

  // Set deployer as authorized oracle
  tx = await predictionMarket.setAuthorizedOracle(deployer.address, true);
  await tx.wait();
  console.log('✅ Oracle address authorized');

  // Whitelist gasless relayer as authorized oracle
  tx = await predictionMarket.setAuthorizedOracle(relayerAddress, true);
  await tx.wait();
  console.log('✅ Gasless relayer whitelisted\n');

  // Summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    DEPLOYMENT COMPLETE!                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('📜 Contract Addresses:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`PredictionMarket:  ${marketAddress}`);
  console.log(`AIOracle:          ${oracleAddress}`);
  console.log(`GaslessRelayer:    ${relayerAddress}`);
  console.log(`TraderReputation:  ${reputationAddress}\n`);

  console.log('🔍 View on Shannon Explorer:');
  console.log(`https://shannon-explorer.somnia.network/address/${marketAddress}\n`);

  console.log('📝 Update .env.local with (Somnia Shannon 50312):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`NEXT_PUBLIC_DEFAULT_CHAIN_ID=50312`);
  console.log(`NEXT_PUBLIC_SOMNIA_RPC_URL=https://dream-rpc.somnia.network`);
  console.log(`NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${marketAddress}`);
  console.log(`NEXT_PUBLIC_AI_ORACLE_ADDRESS=${oracleAddress}  # Groq: https://api.groq.com/openai/v1`);
  console.log(`NEXT_PUBLIC_GASLESS_RELAYER_ADDRESS=${relayerAddress}  # WSOMNIA3009 gasless`);
  console.log(`# DreamDEX Event Contracts (CREATE3, same on 50312/5031): BinaryMarketsModule 0x3ecC... , tUSDC 0x70a86D...\n`);

  console.log('✅ Verify contracts on Shannon Explorer:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`npx hardhat verify --network somniaTestnet ${marketAddress} ${reputationAddress}`);
  console.log(`npx hardhat verify --network somniaTestnet ${oracleAddress} ${marketAddress}`);
  console.log(`npx hardhat verify --network somniaTestnet ${relayerAddress} ${marketAddress}\n`);

  // Get final balance
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const cost = balance - finalBalance;
  
  console.log('💰 Deployment Cost:');
  console.log(`Cost: ${ethers.formatEther(cost)} STT (~$${(Number(ethers.formatEther(cost)) * 600).toFixed(2)} if mainnet)`);
  console.log(`Remaining: ${ethers.formatEther(finalBalance)} STT\n`);

  console.log('🚀 Next Steps (Somnia DreamDEX):');
  console.log('1. Update .env.local with contract addresses (see above)');
  console.log('2. Verify contracts on Shannon Explorer (commands above)');
  console.log('3. Mint tUSDC: npm run faucet --network somniaTestnet  # Collateral 0x70a86D... (cap 10k)');
  console.log('4. Wrap STT → WSOMNIA3009 for x402 gasless (EIP-3009)');
  console.log('5. Start frontend: npm run dev  # DreamDEX Event Contracts 15m/1h BTC/ETH Up/Down');
  console.log('6. Connect MetaMask to Somnia Shannon Testnet (50312)\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
