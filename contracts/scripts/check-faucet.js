/**
 * Somnia Shannon Testnet Faucet Helper
 * Checks balance and provides faucet links
 */

const { ethers } = require('hardhat');
const { exec } = require('child_process');

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║              SOMNIA SHANNON FAUCET - GET FREE STT                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get signer and check balance
    const [signer] = await ethers.getSigners();
    const address = signer.address;
    const balance = await ethers.provider.getBalance(address);
    const balanceEth = ethers.formatEther(balance);
    
    const network = await ethers.provider.getNetwork();
    
    console.log('📋 Account Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Address: ${address}`);
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Current Balance: ${balanceEth} STT\n`);
    
    if (network.chainId !== 50312n) {
      console.log('⚠️  WARNING: Not connected to Somnia Shannon Testnet!');
      console.log('   Run with: --network somniaTestnet\n');
      return;
    }
    
    const balanceNum = Number(balanceEth);
    
    if (balanceNum === 0) {
      console.log('❌ Balance: 0 STT - YOU NEED STT!\n');
    } else if (balanceNum < 0.05) {
      console.log('⚠️  Low balance - Consider getting more STT for deployment\n');
    } else {
      console.log('✅ Sufficient balance for deployment!\n');
    }
    
    console.log('🎁 FAUCET OPTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const faucets = [
      {
        name: 'Official Somnia Faucet',
        url: 'https://shannon-explorer.somnia.network',
        amount: '0.5 STT/day',
        verification: 'Twitter or GitHub',
        recommended: true
      },
      {
        name: 'Somnia Network Testnet Faucet',
        url: 'https://shannon-explorer.somnia.network',
        amount: '0.1-0.5 STT',
        verification: 'Social media'
      },
      {
        name: 'QuickNode Faucet',
        url: 'https://shannon-explorer.somnia.network',
        amount: 'Variable',
        verification: 'Email'
      }
    ];
    
    faucets.forEach((faucet, index) => {
      console.log(`${faucet.recommended ? '⭐' : '📍'} Option ${index + 1}: ${faucet.name}${faucet.recommended ? ' (RECOMMENDED)' : ''}`);
      console.log(`   URL: ${faucet.url}`);
      console.log(`   Amount: ${faucet.amount}`);
      console.log(`   Verification: ${faucet.verification}\n`);
    });
    
    console.log('📝 STEPS TO GET STT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Visit a faucet URL (recommended: official Somnia faucet)');
    console.log(`2. Paste your address: ${address}`);
    console.log('3. Complete verification (Twitter/GitHub/Email)');
    console.log('4. Receive STT in 10-60 seconds');
    console.log('5. Run this script again to check balance\n');
    
    console.log('💡 ADDRESS COPIED TO CLIPBOARD (if available)\n');
    
    // Try to copy address to clipboard
    try {
      if (process.platform === 'linux') {
        exec(`echo "${address}" | xclip -selection clipboard 2>/dev/null || echo "${address}" | xsel --clipboard 2>/dev/null`, (error) => {
          if (!error) console.log('✅ Address copied to clipboard!\n');
        });
      } else if (process.platform === 'darwin') {
        exec(`echo "${address}" | pbcopy`, (error) => {
          if (!error) console.log('✅ Address copied to clipboard!\n');
        });
      } else if (process.platform === 'win32') {
        exec(`echo ${address} | clip`, (error) => {
          if (!error) console.log('✅ Address copied to clipboard!\n');
        });
      }
    } catch (e) {
      // Clipboard copy failed, not critical
    }
    
    console.log('🌐 Opening faucet in browser...\n');
    
    // Try to open browser
    const faucetUrl = 'https://shannon-explorer.somnia.network';
    let command;
    
    if (process.platform === 'linux') {
      command = `xdg-open "${faucetUrl}" 2>/dev/null || firefox "${faucetUrl}" 2>/dev/null || google-chrome "${faucetUrl}" 2>/dev/null`;
    } else if (process.platform === 'darwin') {
      command = `open "${faucetUrl}"`;
    } else if (process.platform === 'win32') {
      command = `start ${faucetUrl}`;
    }
    
    if (command) {
      exec(command, (error) => {
        if (error) {
          console.log('⚠️  Could not open browser automatically');
          console.log(`   Please visit: ${faucetUrl}\n`);
        } else {
          console.log('✅ Browser opened!\n');
        }
      });
    }
    
    console.log('🚀 AFTER GETTING STT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Check balance again:');
    console.log('  npx hardhat run scripts/check-faucet.js --network somniaTestnet\n');
    console.log('Deploy contracts:');
    console.log('  npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet\n');
    console.log('Test integration:');
    console.log('  npx hardhat run test-somnia-complete.js --network somniaTestnet\n');
    
    console.log('📊 COST ESTIMATE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Deploy all contracts:  ~0.05 STT');
    console.log('Run integration test:  ~0.001 STT');
    console.log('Create test market:    ~0.003 STT (optional)');
    console.log('Place test bet:        ~0.001 STT (optional)');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Total needed:          ~0.06 STT\n');
    
    if (balanceNum >= 0.06) {
      console.log('🎉 You have enough STT to deploy and test!\n');
      console.log('Ready to deploy? Run:');
      console.log('  npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet\n');
    } else {
      const needed = (0.06 - balanceNum).toFixed(4);
      console.log(`💡 You need ~${needed} more STT for full deployment and testing\n`);
    }
    
    console.log('🔗 View your account on Shannon Explorer:');
    console.log(`   https://shannon-explorer.somnia.network/address/${address}\n`);
    console.log('💧 Need tUSDC for DreamDEX Event Contracts? (collateral 0x70a86D88... 6d, faucet cap 10,000)');
    console.log('   npx hardhat run scripts/check-faucet.js --network somniaTestnet  # or call Collateral.faucet() via trader.faucet()\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('could not detect network')) {
      console.log('\n💡 Make sure you run with: --network somniaTestnet\n');
    }
  }
}

main()
  .then(() => {
    console.log('✅ Check complete!\n');
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
