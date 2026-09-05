/**
 * Debug WSOMNIA3009 deposit event
 */
const { ethers } = require('hardhat');

async function main() {
  const [user] = await ethers.getSigners();
  console.log('User address:', user.address);
  console.log('STT balance:', ethers.formatEther(await user.provider.getBalance(user.address)));
  
  const wsomnia3009Address = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300';
  
  const abi = [
    'function balanceOf(address) view returns (uint256)',
    'function deposit() payable',
    'function totalSupply() view returns (uint256)',
    'event Deposit(address indexed account, uint256 amount)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ];
  
  const wsomnia = new ethers.Contract(wsomnia3009Address, abi, user);
  
  const balanceBefore = await wsomnia.balanceOf(user.address);
  const supplyBefore = await wsomnia.totalSupply();
  console.log('\n📊 Before:');
  console.log('  User WSOMNIA3009:', ethers.formatEther(balanceBefore));
  console.log('  Total Supply:', ethers.formatEther(supplyBefore));
  
  console.log('\n🔄 Calling deposit() with 0.002 STT...');
  const tx = await wsomnia.deposit({ value: ethers.parseEther('0.002') });
  console.log('  TX:', tx.hash);
  
  const receipt = await tx.wait();
  console.log('  Gas used:', receipt.gasUsed.toString());
  console.log('  Status:', receipt.status);
  
  // Check events
  console.log('\n📋 Events:');
  for (const log of receipt.logs) {
    try {
      const parsed = wsomnia.interface.parseLog(log);
      console.log('  -', parsed.name, parsed.args);
    } catch {
      console.log('  - Raw log:', log.topics[0]);
    }
  }
  
  const balanceAfter = await wsomnia.balanceOf(user.address);
  const supplyAfter = await wsomnia.totalSupply();
  console.log('\n📊 After:');
  console.log('  User WSOMNIA3009:', ethers.formatEther(balanceAfter));
  console.log('  Total Supply:', ethers.formatEther(supplyAfter));
  console.log('  Balance diff:', ethers.formatEther(balanceAfter - balanceBefore));
  console.log('  Supply diff:', ethers.formatEther(supplyAfter - supplyBefore));
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
