/**
 * Deploy PredictionMarket (with forceResolveMarket) to Somnia Shannon,
 * seed 2026 markets, and force-resolve any past-year demo markets.
 *
 * npx hardhat run scripts/deploy-and-seed-2026.js --network somniaTestnet
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

const MARKETS_2026 = [
  {
    question: 'Will GTA 6 release before December 2026?',
    description: 'Rockstar has targeted 2026. Will GTA 6 ship before end of December 2026?',
    category: 'Entertainment',
    days: 120,
  },
  {
    question: 'Will Christopher Nolan release a new film in 2026?',
    description: 'Following Oppenheimer, will Nolan release another feature before end of 2026?',
    category: 'Movies',
    days: 150,
  },
  {
    question: 'Will Avatar: Fire and Ash gross over $2 billion worldwide by end of 2026?',
    description: 'James Cameron sequel box office — will it cross $2B worldwide by 31 Dec 2026?',
    category: 'Movies',
    days: 120,
  },
  {
    question: 'Will BTS reunite for a world tour before end of 2026?',
    description: 'Will BTS announce a reunion world tour before December 31, 2026?',
    category: 'Music',
    days: 180,
  },
  {
    question: 'Will a streaming service surpass Netflix in subscribers by end of 2026?',
    description: 'Will Disney+, Amazon, or another service overtake Netflix subscriber count in 2026?',
    category: 'Entertainment',
    days: 150,
  },
  {
    question: 'Will a Marvel movie win Best Picture at the Oscars 2027?',
    description: 'Oscars 2027 ceremony — will a Marvel Studios film take Best Picture?',
    category: 'Movies',
    days: 200,
  },
];

/** Past-year markets created then immediately force-resolved for clean 2026 history */
const PAST_SETTLED = [
  {
    question: 'Will Avatar 3 gross over $2 billion worldwide in 2027?',
    description: 'SETTLED: Calendar 2025 box office question (force-resolved NO).',
    category: 'Movies',
    outcome: false,
  },
  {
    question: 'Will Christopher Nolan release a new film in 2027?',
    description: 'SETTLED: Calendar 2025 release question (force-resolved NO).',
    category: 'Movies',
    outcome: false,
  },
  {
    question: 'Will GTA 6 release before December 2027?',
    description: 'SETTLED: Delayed past Dec 2025 (force-resolved NO).',
    category: 'Entertainment',
    outcome: false,
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'STT');

  if (balance < ethers.parseEther('0.02')) {
    throw new Error('Need ≥0.02 STT for deploy — use Shannon faucet');
  }

  console.log('\n📝 Deploying PredictionMarket (forceResolveMarket)...');
  const PredictionMarket = await ethers.getContractFactory('PredictionMarket');
  const pm = await PredictionMarket.deploy();
  await pm.waitForDeployment();
  const marketAddress = await pm.getAddress();
  const reputationAddress = await pm.reputationContract();
  console.log('✅ PredictionMarket:', marketAddress);
  console.log('✅ TraderReputation:', reputationAddress);

  let tx = await pm.setAuthorizedOracle(deployer.address, true);
  await tx.wait();
  console.log('✅ Deployer authorized as oracle');

  // Optional AIOracle if factory exists
  let oracleAddress = ethers.ZeroAddress;
  try {
    const AIOracle = await ethers.getContractFactory('AIOracle');
    const aiOracle = await AIOracle.deploy(marketAddress);
    await aiOracle.waitForDeployment();
    oracleAddress = await aiOracle.getAddress();
    tx = await pm.setAuthorizedOracle(oracleAddress, true);
    await tx.wait();
    console.log('✅ AIOracle:', oracleAddress);
  } catch (e) {
    console.log('⚠️  AIOracle skip:', e.message?.slice(0, 80));
  }

  const now = Math.floor(Date.now() / 1000);

  console.log('\n📌 Creating past-year markets then force-resolving...');
  for (const m of PAST_SETTLED) {
    const endTime = now + 7 * 86400; // must be future at create
    const createTx = await pm.createMarket(
      m.question,
      m.description,
      m.category,
      endTime,
      true
    );
    const receipt = await createTx.wait();
    const count = await pm.marketCount();
    const id = Number(count);
    console.log(`  created #${id}: ${m.question.slice(0, 50)}...`);
    const fr = await pm.forceResolveMarket(id, m.outcome);
    await fr.wait();
    console.log(`  ✅ force-resolved #${id} → ${m.outcome ? 'YES' : 'NO'}`);
  }

  console.log('\n📌 Creating active 2026 markets...');
  for (const m of MARKETS_2026) {
    const endTime = now + m.days * 86400;
    const createTx = await pm.createMarket(
      m.question,
      m.description,
      m.category,
      endTime,
      true
    );
    await createTx.wait();
    const id = Number(await pm.marketCount());
    console.log(`  ✅ #${id}: ${m.question.slice(0, 60)}...`);
  }

  const deployment = {
    network: 'somniaTestnet',
    chainId: 50312,
    timestamp: new Date().toISOString(),
    previousPredictionMarket: '0x67F7B580AEd6de246f7db70e19efdcE4Dd34Fc61',
    previousTraderReputation: '0xb53D700857D7e275C8f4F03d9580c3753729796f',
    contracts: {
      PredictionMarket: marketAddress,
      TraderReputation: reputationAddress,
      AIOracle: oracleAddress,
    },
    deployer: deployer.address,
    note: 'New PM includes forceResolveMarket. Old PM still holds prior STT until its endTimes.',
  };

  const outPath = path.join(__dirname, '../deployments/somnia-shannon-2026.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2));
  console.log('\n💾 Wrote', outPath);
  console.log('\nUpdate frontend:');
  console.log(`  PREDICTION_MARKET: '${marketAddress}'`);
  console.log(`  TRADER_REPUTATION: '${reputationAddress}'`);
  if (oracleAddress !== ethers.ZeroAddress) {
    console.log(`  AI_ORACLE: '${oracleAddress}'`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
