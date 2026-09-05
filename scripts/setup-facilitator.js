/**
 * Setup X402 Facilitator Wallet
 * Creates a new wallet and transfers STT from existing account
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');

const SOMNIA_SHANNON_RPC = process.env.SOMNIA_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL || 'https://dream-rpc.somnia.network';

async function main() {
  console.log('🔧 X402 Facilitator Wallet Setup\n');
  
  // Check for source private key
  const sourceKey = process.env.PRIVATE_KEY;
  if (!sourceKey) {
    console.error('❌ PRIVATE_KEY not found in .env.local');
    console.log('Please add your source wallet private key to .env.local');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(SOMNIA_SHANNON_RPC);
  
  // Source wallet
  const sourceWallet = new ethers.Wallet(sourceKey, provider);
  const sourceBalance = await provider.getBalance(sourceWallet.address);
  
  console.log('📤 Source Wallet:');
  console.log(`   Address: ${sourceWallet.address}`);
  console.log(`   Balance: ${ethers.formatEther(sourceBalance)} STT\n`);

  // Generate new facilitator wallet
  const facilitatorWallet = ethers.Wallet.createRandom();
  
  console.log('🆕 New Facilitator Wallet Generated:');
  console.log(`   Address: ${facilitatorWallet.address}`);
  console.log(`   Private Key: ${facilitatorWallet.privateKey}\n`);
  
  // Calculate transfer amount (leave 0.01 STT for gas in source)
  const gasReserve = ethers.parseEther('0.01');
  const gasEstimate = ethers.parseEther('0.0001'); // ~21000 gas * 5 gwei
  
  if (sourceBalance <= gasReserve + gasEstimate) {
    console.log('⚠️  Source wallet has insufficient balance to transfer');
    console.log('   Please fund your source wallet first from the Somnia Shannon Testnet Faucet:');
    console.log('   https://shannon-explorer.somnia.network/faucet-smart\n');
    
    console.log('📋 Save this for later - Add to .env.local:');
    console.log('─'.repeat(60));
    console.log(`FACILITATOR_PRIVATE_KEY=${facilitatorWallet.privateKey}`);
    console.log('─'.repeat(60));
    return;
  }

  const transferAmount = sourceBalance - gasReserve;
  
  console.log(`💸 Transferring ${ethers.formatEther(transferAmount)} STT to facilitator...\n`);

  try {
    const tx = await sourceWallet.sendTransaction({
      to: facilitatorWallet.address,
      value: transferAmount,
      gasLimit: 21000,
    });
    
    console.log(`   Transaction: ${tx.hash}`);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}\n`);
    
    // Verify new balance
    const newBalance = await provider.getBalance(facilitatorWallet.address);
    console.log(`   Facilitator Balance: ${ethers.formatEther(newBalance)} STT\n`);
    
  } catch (error) {
    console.error('❌ Transfer failed:', error.message);
    process.exit(1);
  }

  // Output instructions
  console.log('═'.repeat(60));
  console.log('✅ FACILITATOR SETUP COMPLETE');
  console.log('═'.repeat(60));
  console.log('\n📋 Add this to your .env.local file:\n');
  console.log('─'.repeat(60));
  console.log(`FACILITATOR_PRIVATE_KEY=${facilitatorWallet.privateKey}`);
  console.log('─'.repeat(60));
  console.log('\n⚠️  IMPORTANT: Save the private key securely!');
  console.log('   This wallet will sponsor gas for X402 gasless betting.\n');
  
  console.log('🔗 View on Shannon Explorer:');
  console.log(`   https://shannon-explorer.somnia.network/address/${facilitatorWallet.address}\n`);
}

main().catch(console.error);
