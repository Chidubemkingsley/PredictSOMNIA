/**
 * Check All Somnia Shannon Testnet Faucets (No Mainnet Required)
 * Shows alternatives to official faucet that don't need mainnet STT
 */

const { ethers } = require('hardhat');
const { exec } = require('child_process');

const FAUCETS = [
  {
    name: 'Shannon Explorer Faucet (RECOMMENDED)',
    url: 'https://shannon-explorer.somnia.network',
    amount: '0.5 STT',
    requirements: 'Email only',
    mainnet: false,
    difficulty: 'Easy',
    description: 'Best option - instant STT for Somnia Shannon (50312)'
  },
  {
    name: 'DreamDEX tUSDC Faucet (Collateral)',
    url: 'https://shannon-explorer.somnia.network/address/0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E',
    amount: '10,000 tUSDC (cap per call)',
    requirements: 'STT for gas only',
    mainnet: false,
    difficulty: 'Easy',
    description: 'Call CollateralRouter faucet() or trader.faucet() — DreamDEX Event Contracts collateral (6d)'
  },
  {
    name: 'Somnia Network Discord',
    url: 'https://discord.gg/somnia',
    amount: '0.5 STT',
    requirements: 'Discord account',
    mainnet: false,
    difficulty: 'Easy',
    description: 'Use /faucet command in #testnet-faucet channel'
  },
  {
    name: 'WSOMNIA3009 Wrapper',
    url: 'https://shannon-explorer.somnia.network',
    amount: 'Wrap STT → WSOMNIA3009',
    requirements: 'STT balance',
    mainnet: false,
    difficulty: 'Easy',
    description: 'Wrap STT to WSOMNIA3009 for x402 gasless (EIP-3009) — see contracts/WSOMNIA3009.sol'
  },
  {
    name: 'Groq Faucet (AI verifier)',
    url: 'https://console.groq.com/keys',
    amount: 'Free tier Groq API',
    requirements: 'Email only',
    mainnet: false,
    difficulty: 'Easy',
    description: 'GROQ_API_KEY for AIOracle Groq verifier (llama-3.3-70b)'
  }
];

async function openURL(url) {
  const start = process.platform === 'darwin' ? 'open' :
                process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${start} ${url}`, (error) => {
    if (error) {
      console.log(`   (Manual: ${url})`);
    }
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║        Somnia Shannon Testnet Faucets - NO MAINNET REQUIRED! 🎁                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Check current balance
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  const balanceInEth = Number(ethers.formatEther(balance));
  
  console.log('📊 Current Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Account: ${signer.address}`);
  console.log(`Balance: ${balanceInEth.toFixed(4)} STT\n`);

  // Calculate needs
  const deploymentCost = 0.05;
  const testingCost = 0.01;
  const totalNeeded = deploymentCost + testingCost;
  const needed = Math.max(0, totalNeeded - balanceInEth);
  
  if (balanceInEth >= totalNeeded) {
    console.log('✅ You have enough STT to deploy and test!');
    console.log(`   Required: ${totalNeeded} STT`);
    console.log(`   Available: ${balanceInEth.toFixed(4)} STT\n`);
    console.log('🚀 Ready to deploy! Run:');
    console.log('   npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet\n');
    return;
  }

  console.log('📋 You need more STT:');
  console.log(`├─ Current: ${balanceInEth.toFixed(4)} STT`);
  console.log(`├─ Needed: ${totalNeeded} STT (${deploymentCost} deploy + ${testingCost} testing)`);
  console.log(`└─ Required: ${needed.toFixed(4)} STT\n`);

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🎁 AVAILABLE FAUCETS (NO MAINNET REQUIRED)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  FAUCETS.forEach((faucet, index) => {
    console.log(`${index + 1}. ${faucet.name}`);
    console.log(`   ├─ Amount: ${faucet.amount}`);
    console.log(`   ├─ Requirements: ${faucet.requirements}`);
    console.log(`   ├─ Mainnet STT: ${faucet.mainnet ? '✅ Required' : '❌ NOT Required'}`);
    console.log(`   ├─ Difficulty: ${faucet.difficulty}`);
    console.log(`   ├─ Description: ${faucet.description}`);
    console.log(`   └─ URL: ${faucet.url}\n`);
  });

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('⭐ BEST OPTION: Shannon Explorer Faucet (0.5 STT)');
  console.log('   Why: Instant STT for Somnia Shannon 50312, no mainnet needed');
  console.log('   1. Visit: https://shannon-explorer.somnia.network');
  console.log('   2. Sign up with email (2 minutes)');
  console.log(`   3. Enter address: ${signer.address}`);
  console.log('   4. Receive 0.5 STT instantly!\n');

  console.log('🔄 SECOND: DreamDEX tUSDC Faucet (10k per call, 6d, cap)');
  console.log('   1. Ensure you have STT for gas');
  console.log('   2. Call: npx hardhat run scripts/deploy-wsomnia-solution.js --network somniaTestnet');
  console.log('   3. Or via SDK: await trader.faucet()  // 10,000 tUSDC');
  console.log('   4. Collateral: 0x70a86D88... (FaucetCapExceeded if >10k)\n');

  console.log('💰 MAXIMIZE: STT + tUSDC + WSOMNIA!');
  console.log('   For DreamDEX Event Contracts you need both:');
  console.log('   ├─ STT: 0.5 STT (gas on 50312, 100ms blocks)');
  console.log('   ├─ tUSDC: 10,000 tUSDC per faucet() call');
  console.log('   └─ WSOMNIA3009: wrap STT → WSOMNIA for x402 gasless\n');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 OPENING RECOMMENDED FAUCET');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('Opening Shannon Explorer faucet in your browser...\n');
  await openURL(FAUCETS[0].url);

  console.log('✅ Browser opened! Follow the steps above to get STT.\n');
  console.log('📝 After receiving STT, run:');
  console.log('   npx hardhat run scripts/check-all-faucets.js --network somniaTestnet\n');
  console.log('   (to verify balance and deploy)\n');

  console.log('💡 Pro Tip: Bookmark these faucet links for daily refills!');
  console.log('   You can claim from each faucet once per day.\n');

  // Save faucets info
  console.log('📄 Full documentation saved to: docs/ALTERNATIVE_FAUCETS.md\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
