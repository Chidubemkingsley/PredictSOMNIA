/**
 * Test X402BettingSOMNIA.gaslessBetWithSOMNIA directly
 */
const { ethers } = require('hardhat');

const WSOMNIA3009_ADDRESS = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300';
const X402_BETTING_ADDRESS = process.env.X402_BETTING_ADDRESS || process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS || '0xCA983EF481b53Ee14E67278501DdC1De466999F9';
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x7F0335eC0157a113840D2dcB257BE971774F2226';

async function main() {
  const [user] = await ethers.getSigners();
  console.log('User:', user.address);
  
  // Step 1: Get compiled contract ABI directly
  const x402BettingArtifact = await ethers.getContractFactory('X402BettingSOMNIA');
  const x402Betting = x402BettingArtifact.attach(X402_BETTING_ADDRESS);
  
  // Check contract state
  console.log('\n📋 X402BettingSOMNIA:');
  console.log('  Facilitator:', await x402Betting.facilitator());
  console.log('  WSOMNIA:', await x402Betting.wsomnia());
  console.log('  PredictionMarket:', await x402Betting.predictionMarket());
  
  // Get WSOMNIA contract
  const wsomnia = await ethers.getContractAt('WSOMNIA3009', WSOMNIA3009_ADDRESS);
  const balance = await wsomnia.balanceOf(user.address);
  console.log('\n💰 User WSOMNIA3009:', ethers.formatEther(balance));
  
  // Create signature
  const domain = {
    name: 'Wrapped SOMNIA with x402',
    version: '1',
    chainId: Number(process.env.CHAIN_ID || 50312),
    verifyingContract: WSOMNIA3009_ADDRESS,
  };
  
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };
  
  const now = Math.floor(Date.now() / 1000);
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  const betAmount = ethers.parseEther('0.0101'); // Slightly more than MIN_BET to cover fee
  const marketId = 35;
  
  const message = {
    from: user.address,
    to: X402_BETTING_ADDRESS,  // Send to X402BettingSOMNIA
    value: betAmount,
    validAfter: now - 60,
    validBefore: now + 3600,
    nonce: nonce,
  };
  
  console.log('\n📄 Message:', message);
  
  const signature = await user.signTypedData(domain, types, message);
  console.log('\n✍️  Signature:', signature);
  
  // Call gaslessBetWithSOMNIA
  console.log('\n🚀 Calling gaslessBetWithSOMNIA...');
  console.log('  marketId:', marketId);
  console.log('  position: true (YES)');
  console.log('  from:', user.address);
  console.log('  wsomniaValue:', ethers.formatEther(betAmount));
  console.log('  validAfter:', message.validAfter);
  console.log('  validBefore:', message.validBefore);
  console.log('  nonce:', nonce);
  console.log('  signature length:', signature.length);
  
  try {
    // Try with staticCall first to get the error
    console.log('\n📞 Testing with staticCall...');
    await x402Betting.gaslessBetWithSOMNIA.staticCall(
      marketId,
      true,
      user.address,
      betAmount,
      message.validAfter,
      message.validBefore,
      nonce,
      signature
    );
    console.log('  staticCall succeeded!');
  } catch (error) {
    console.log('  staticCall failed:', error.reason || error.message);
    if (error.data) {
      console.log('  Error data:', error.data);
    }
    
    // Try to decode the error
    try {
      const iface = x402Betting.interface;
      const decoded = iface.parseError(error.data);
      console.log('  Decoded error:', decoded);
    } catch {}
  }
  
  // Now try the actual call
  console.log('\n📤 Sending transaction...');
  try {
    const tx = await x402Betting.gaslessBetWithSOMNIA(
      marketId,
      true,
      user.address,
      betAmount,
      message.validAfter,
      message.validBefore,
      nonce,
      signature,
      { gasLimit: 4000000 }
    );
    console.log('  TX:', tx.hash);
    const receipt = await tx.wait();
    console.log('  ✅ Success!');
    console.log('  Gas used:', receipt.gasUsed.toString());
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
