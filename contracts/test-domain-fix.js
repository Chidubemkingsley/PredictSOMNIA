/**
 * Test EIP-3009 with correct domain name "Wrapped SOMNIA with x402" — Somnia Shannon (env-preferred)
 */
const { ethers } = require('hardhat');

async function main() {
  const [user] = await ethers.getSigners();
  console.log('User address:', user.address);
  
  // WSOMNIA3009 contract address — Somnia Shannon (env-preferred, DreamDEX tUSDC 0x70a86D... separate)
  const wsomnia3009Address = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300';
  
  // WSOMNIA3009 ABI (minimal)
  const abi = [
    'function balanceOf(address) view returns (uint256)',
    'function deposit() payable',
    'function name() view returns (string)',
    'function DOMAIN_SEPARATOR() view returns (bytes32)',
    'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  ];
  
  const wsomnia = new ethers.Contract(wsomnia3009Address, abi, user);
  
  // Verify contract domain
  const name = await wsomnia.name();
  const domainSeparator = await wsomnia.DOMAIN_SEPARATOR();
  console.log('\n📝 Contract Info:');
  console.log('  Name:', name);
  console.log('  Domain Separator:', domainSeparator);
  
  // Check current balance
  const balanceBefore = await wsomnia.balanceOf(user.address);
  console.log('\n💰 WSOMNIA3009 balance before:', ethers.formatEther(balanceBefore), 'WSOMNIA3009');
  
  // Wrap some STT
  const wrapAmount = ethers.parseEther('0.001');
  console.log('\n🔄 Wrapping', ethers.formatEther(wrapAmount), 'STT...');
  
  const tx = await wsomnia.deposit({ value: wrapAmount });
  const receipt = await tx.wait();
  console.log('  TX Hash:', tx.hash);
  console.log('  Status:', receipt.status === 1 ? '✅ Success' : '❌ Failed');
  
  // Check balance after
  const balanceAfter = await wsomnia.balanceOf(user.address);
  console.log('\n💰 WSOMNIA3009 balance after:', ethers.formatEther(balanceAfter), 'WSOMNIA3009');
  console.log('  Difference:', ethers.formatEther(balanceAfter - balanceBefore), 'WSOMNIA3009');
  
  // Test EIP-712 signature with CORRECT domain
  console.log('\n📝 Testing EIP-712 domain signature...');
  
  const domain = {
    name: 'Wrapped SOMNIA with x402',  // Correct domain — matches WSOMNIA3009.sol, Somnia Shannon
    version: '1',
    chainId: Number(process.env.CHAIN_ID || 50312),
    verifyingContract: wsomnia3009Address,
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
  const recipient = process.env.X402_BETTING_ADDRESS || process.env.NEXT_PUBLIC_X402_BETTING_ADDRESS || '0xCA983EF481b53Ee14E67278501DdC1De466999F9';  // X402BettingSOMNIA (env-preferred)
  const testValue = ethers.parseEther('0.0001');
  
  const message = {
    from: user.address,
    to: recipient,
    value: testValue,
    validAfter: now - 60,
    validBefore: now + 3600,
    nonce: nonce,
  };
  
  console.log('  Domain:', domain.name);
  console.log('  Message:', {
    from: message.from,
    to: message.to,
    value: ethers.formatEther(message.value) + ' WSOMNIA3009',
    nonce: message.nonce,
  });
  
  const signature = await user.signTypedData(domain, types, message);
  const { v, r, s } = ethers.Signature.from(signature);
  
  console.log('  Signature:', signature.slice(0, 20) + '...');
  console.log('  v:', v, 'r:', r.slice(0, 10) + '...', 's:', s.slice(0, 10) + '...');
  
  console.log('\n✅ Domain signature test complete!');
  console.log('   The signature should work with the WSOMNIA3009 contract');
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
