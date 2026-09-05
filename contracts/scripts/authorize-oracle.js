/**
 * Script to authorize oracle agent
 * Run: npx hardhat run scripts/authorize-oracle.js --network somniaTestnet
 */

const hre = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔐 Authorizing Oracle Agent...\n');

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer address:', deployer.address);

  // Get AI Oracle contract address from environment
  const aiOracleAddress = process.env.NEXT_PUBLIC_AI_ORACLE_ADDRESS;
  if (!aiOracleAddress) {
    throw new Error('NEXT_PUBLIC_AI_ORACLE_ADDRESS not set in .env');
  }

  // Get oracle agent address
  const oracleAgentAddress = process.env.ORACLE_AGENT_ADDRESS;
  if (!oracleAgentAddress) {
    throw new Error('ORACLE_AGENT_ADDRESS not set in .env');
  }

  console.log('AI Oracle address:', aiOracleAddress);
  console.log('Oracle Agent address:', oracleAgentAddress);
  console.log('');

  // Get contract instance
  const AIOracle = await hre.ethers.getContractFactory('AIOracle');
  const aiOracle = AIOracle.attach(aiOracleAddress);

  // Check if already authorized
  const isAuthorized = await aiOracle.aiAgents(oracleAgentAddress);
  
  if (isAuthorized) {
    console.log('✅ Oracle agent is already authorized!');
    return;
  }

  // Authorize agent — Groq verifier (Somnia Shannon, AIOracle Groq dataSource)
  console.log('📝 Authorizing Groq/ Somnia oracle agent (Somnia Shannon)...');
  const tx = await aiOracle.setAIAgent(oracleAgentAddress, true);
  console.log('Transaction hash:', tx.hash);
  
  console.log('⏳ Waiting for confirmation...');
  await tx.wait();

  console.log('✅ Oracle agent authorized successfully!');
  console.log('');
  console.log('🎉 You can now start the oracle service:');
  console.log('   npm run oracle:start');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
