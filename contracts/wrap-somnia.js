/**
 * Wrap STT to WSOMNIA3009 for the facilitator
 */
const { ethers } = require('hardhat');

async function main() {
  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address, '(Somnia Shannon)');
  
  const wsomniaAddress = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300';
  const wsomnia = await ethers.getContractAt('WSOMNIA3009', wsomniaAddress);
  
  // Check current balance
  const beforeBal = await wsomnia.balanceOf(signer.address);
  console.log('WSOMNIA3009 balance before:', ethers.formatEther(beforeBal));
  
  // Wrap 0.1 STT
  const wrapAmount = ethers.parseEther('0.1');
  console.log('\nWrapping 0.1 STT...');
  
  const tx = await wsomnia.deposit({ value: wrapAmount });
  console.log('Tx:', tx.hash);
  await tx.wait();
  
  // Check new balance
  const afterBal = await wsomnia.balanceOf(signer.address);
  console.log('WSOMNIA3009 balance after:', ethers.formatEther(afterBal));
  console.log('\n✅ Wrapped successfully!');
}

main().catch(console.error);
