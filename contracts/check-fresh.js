/**
 * Check WSOMNIA3009 via fresh RPC connection
 */
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  // Somnia Shannon — fresh provider (env-preferred, no hardcoded STT chain)
  const provider = new ethers.JsonRpcProvider(process.env.SOMNIA_TESTNET_RPC_URL || process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC_URL || 'https://dream-rpc.somnia.network');
  
  const wsomnia3009Address = process.env.WSOMNIA3009_ADDRESS || process.env.NEXT_PUBLIC_WSOMNIA_ADDRESS || '0x5C46B206aF8a2148DD8813Bd69a03634562aC300';
  const userAddress = process.env.FACILITATOR_ADDRESS || '0x3A67492c38d5D72749fD124cB4Daee2e883AF732';
  
  const abi = [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function name() view returns (string)',
  ];
  
  const wsomnia = new ethers.Contract(wsomnia3009Address, abi, provider);
  
  console.log('📊 WSOMNIA3009 State:');
  console.log('  Name:', await wsomnia.name());
  console.log('  Total Supply:', ethers.formatEther(await wsomnia.totalSupply()));
  console.log('  User Balance:', ethers.formatEther(await wsomnia.balanceOf(userAddress)));
  
  // Check contract STT balance (should match total supply)
  const contractSTT = await provider.getBalance(wsomnia3009Address);
  console.log('  Contract STT:', ethers.formatEther(contractSTT));
  
  // Try another RPC — Somnia fallback
  console.log('\n📊 Checking via second RPC (Somnia fallback)...');
  const provider2 = new ethers.JsonRpcProvider(process.env.SOMNIA_FALLBACK_RPC_URL || 'https://dream-rpc.somnia.network');
  const wsomnia2 = new ethers.Contract(wsomnia3009Address, abi, provider2);
  console.log('  User Balance:', ethers.formatEther(await wsomnia2.balanceOf(userAddress)));
  console.log('  Total Supply:', ethers.formatEther(await wsomnia2.totalSupply()));
}

main().catch(console.error);
