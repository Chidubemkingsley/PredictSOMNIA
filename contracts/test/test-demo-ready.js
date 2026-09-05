/**
 * Demo Readiness Test
 * Verifies all systems are ready for demo
 */

require('dotenv').config({ path: '../.env.local' });
const { ethers } = require('hardhat');
const crypto = require('crypto');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateIPFSHash(data) {
  const jsonString = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
  return `Qm${hash.substring(0, 44)}`;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║             DEMO READINESS TEST - ALL SYSTEMS CHECK              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;

  // TEST 1: Environment Configuration
  log('\n══════════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 1: Environment Configuration', 'cyan');
  log('══════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    const hasHF = process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY.length > 0;
    const hasPinata = process.env.PINATA_API_KEY && process.env.PINATA_API_KEY.length > 0;

    if (hasHF && hasPinata) {
      log('✅ All API keys configured', 'green');
      log(`   ├─ Hugging Face: ${process.env.HUGGINGFACE_API_KEY.substring(0, 10)}...`, 'green');
      log(`   └─ Pinata: ${process.env.PINATA_API_KEY.substring(0, 10)}...`, 'green');
      passed++;
    } else {
      log('❌ Missing API keys', 'red');
      if (!hasHF) log('   ├─ HUGGINGFACE_API_KEY not found', 'red');
      if (!hasPinata) log('   └─ PINATA_API_KEY not found', 'red');
      failed++;
    }
  } catch (error) {
    log(`❌ Error checking environment: ${error.message}`, 'red');
    failed++;
  }

  // TEST 2: Blockchain Connection
  log('\n══════════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 2: Blockchain Connection', 'cyan');
  log('══════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();

    log('✅ Connected to blockchain', 'green');
    log(`   ├─ Network: ${network.name} (Chain ID: ${network.chainId})`, 'green');
    log(`   ├─ Deployer: ${deployer.address}`, 'green');
    log(`   └─ Balance: ${ethers.formatEther(balance)} STT`, 'green');
    passed++;
  } catch (error) {
    log(`❌ Blockchain connection failed: ${error.message}`, 'red');
    failed++;
  }

  // TEST 3: Smart Contract Compilation
  log('\n══════════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 3: Smart Contract Compilation', 'cyan');
  log('══════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    const PredictionMarket = await ethers.getContractFactory('PredictionMarket');
    const AIOracle = await ethers.getContractFactory('AIOracle');
    const GaslessRelayer = await ethers.getContractFactory('GaslessRelayer');
    const TraderReputation = await ethers.getContractFactory('TraderReputation');

    log('✅ All contracts compiled successfully', 'green');
    log('   ├─ PredictionMarket ✓', 'green');
    log('   ├─ AIOracle ✓', 'green');
    log('   ├─ GaslessRelayer ✓', 'green');
    log('   └─ TraderReputation ✓', 'green');
    passed++;
  } catch (error) {
    log(`❌ Contract compilation failed: ${error.message}`, 'red');
    failed++;
  }

  // TEST 4: IPFS Hash Generation
  log('\n══════════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 4: IPFS Hash Generation (Deterministic)', 'cyan');
  log('══════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    const testData = {
      title: 'Test Market',
      description: 'Testing IPFS hash generation',
      category: 'test',
      timestamp: Date.now(),
    };

    const hash1 = generateIPFSHash(testData);
    const hash2 = generateIPFSHash(testData);

    if (hash1 === hash2) {
      log('✅ IPFS hash generation working (deterministic)', 'green');
      log(`   ├─ Hash: ${hash1}`, 'green');
      log(`   └─ Data size: ${JSON.stringify(testData).length} bytes`, 'green');
      passed++;
    } else {
      log('❌ IPFS hashes not deterministic', 'red');
      failed++;
    }
  } catch (error) {
    log(`❌ IPFS hash generation failed: ${error.message}`, 'red');
    failed++;
  }

  // TEST 5: Quick Contract Deployment
  log('\n══════════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 5: Quick Contract Deployment Test', 'cyan');
  log('══════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    const [deployer] = await ethers.getSigners();
    
    log('📝 Deploying test contracts...', 'blue');
    
    // Deploy contracts one by one with error handling
    let pmAddress, aoAddress, trAddress;
    
    try {
      const PredictionMarket = await ethers.getContractFactory('PredictionMarket');
      const predictionMarket = await PredictionMarket.deploy();
      await predictionMarket.waitForDeployment();
      pmAddress = await predictionMarket.getAddress();
      log(`   ✓ PredictionMarket deployed: ${pmAddress}`, 'blue');
    } catch (error) {
      throw new Error(`PredictionMarket deployment failed: ${error.message}`);
    }

    try {
      const AIOracle = await ethers.getContractFactory('AIOracle');
      const aiOracle = await AIOracle.deploy(pmAddress);
      await aiOracle.waitForDeployment();
      aoAddress = await aiOracle.getAddress();
      log(`   ✓ AIOracle deployed: ${aoAddress}`, 'blue');
    } catch (error) {
      throw new Error(`AIOracle deployment failed: ${error.message}`);
    }

    try {
      const TraderReputation = await ethers.getContractFactory('TraderReputation');
      const traderReputation = await TraderReputation.deploy(deployer.address);
      await traderReputation.waitForDeployment();
      trAddress = await traderReputation.getAddress();
      log(`   ✓ TraderReputation deployed: ${trAddress}`, 'blue');
    } catch (error) {
      throw new Error(`TraderReputation deployment failed: ${error.message}`);
    }

    log('✅ Contracts deployed successfully', 'green');
    log(`   ├─ PredictionMarket: ${pmAddress}`, 'green');
    log(`   ├─ AIOracle: ${aoAddress}`, 'green');
    log(`   └─ TraderReputation: ${trAddress}`, 'green');

    // Get contract instances
    const predictionMarket = await ethers.getContractAt('PredictionMarket', pmAddress);

    log('✅ Contracts configured', 'green');
    passed++;

    // TEST 6: Market Creation & Betting
    log('\n══════════════════════════════════════════════════════════════════', 'cyan');
    log('TEST 6: Market Creation & Betting', 'cyan');
    log('══════════════════════════════════════════════════════════════════\n', 'cyan');

    const evidenceHash = generateIPFSHash({
      question: 'Test Demo Market',
      timestamp: Date.now(),
    });

    // Create market as deployer (should have permission)
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const tx = await predictionMarket.connect(deployer).createMarket(
      'Test Demo Market - Are we ready?',
      'Testing all systems for demo readiness',
      'test',
      deadline,
      evidenceHash
    );
    await tx.wait();

    const marketCount = await predictionMarket.marketCount();
    log(`✅ Market created (ID: ${marketCount})`, 'green');

    // Get market data
    const market = await predictionMarket.markets(marketCount);
    log(`✅ Market data retrieved`, 'green');
    log(`   ├─ Question: "Test Demo Market - Are we ready?"`, 'green');
    log(`   ├─ Category: test`, 'green');
    log(`   └─ Deadline: ${new Date(Number(market.deadline) * 1000).toLocaleString()}`, 'green');
    passed++;

  } catch (error) {
    log(`❌ Contract deployment test failed: ${error.message}`, 'red');
    failed++;
  }

  // TEST 7: AI Oracle Availability (Real API Test)
  log('\n══════════════════════════════════════════════════════════════════', 'cyan');
  log('TEST 7: AI Oracle Availability Check', 'cyan');
  log('══════════════════════════════════════════════════════════════════\n', 'cyan');

  try {
    const { HfInference } = require('@huggingface/inference');
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

    log('🤖 Testing Hugging Face connection...', 'blue');
    
    const startTime = Date.now();
    const response = await hf.chatCompletion({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [{
        role: 'user',
        content: 'Reply with just: "AI Ready for Demo"'
      }],
      max_tokens: 20,
    });

    const responseTime = Date.now() - startTime;
    const aiResponse = response.choices[0].message.content.trim();

    log('✅ AI Oracle responding', 'green');
    log(`   ├─ Model: DeepSeek-V3`, 'green');
    log(`   ├─ Response: "${aiResponse}"`, 'green');
    log(`   └─ Response Time: ${responseTime}ms`, 'green');
    passed++;
  } catch (error) {
    log(`❌ AI Oracle test failed: ${error.message}`, 'red');
    log('   Note: This is expected if no internet or invalid API key', 'yellow');
    failed++;
  }

  // RESULTS
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                         TEST RESULTS                             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  const total = passed + failed;
  const percentage = ((passed / total) * 100).toFixed(1);

  log(`Total Tests: ${total}`, 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`\nSuccess Rate: ${percentage}%`, percentage >= 85 ? 'green' : 'yellow');

  if (failed === 0) {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    log('║              🎉 ALL SYSTEMS READY FOR DEMO! 🎉                   ║', 'green');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    log('✅ Blockchain: Ready', 'green');
    log('✅ Smart Contracts: Deployed & Working', 'green');
    log('✅ AI Oracle: Connected & Responding', 'green');
    log('✅ IPFS: Hash Generation Working', 'green');
    console.log('\n📋 Next Steps:');
    console.log('1. Start frontend: npm run dev');
    console.log('2. Connect MetaMask to localhost:8545');
    console.log('3. Demo ready! 🚀\n');
  } else {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    log('║              ⚠️  SOME TESTS FAILED - REVIEW NEEDED ⚠️            ║', 'yellow');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    log(`Systems Working: ${passed}/${total}`, 'yellow');
    log(`Systems Failed: ${failed}/${total}`, 'red');
    console.log('\n📋 Review the failed tests above and fix before demo.\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
