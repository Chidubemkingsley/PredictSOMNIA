const hre = require("hardhat");
async function main(){
  const [deployer]=await hre.ethers.getSigners();
  console.log('Deployer', deployer.address);
  const pmAddr='0x67F7B580AEd6de246f7db70e19efdcE4Dd34Fc61';
  const pm=await hre.ethers.getContractAt('PredictionMarket', pmAddr);
  // Deploy AIOracle for PM2
  const AIOracle=await hre.ethers.getContractFactory('AIOracle');
  const ai=await AIOracle.deploy(pmAddr);
  await ai.waitForDeployment();
  const aiAddr=await ai.getAddress();
  console.log('AIOracle for PM2:', aiAddr);
  // Authorize it
  let tx=await pm.setAuthorizedOracle(aiAddr, true);
  await tx.wait();
  console.log('Authorized AIOracle in PM2');
  // Whitelist PM2 in existing relayer
  const existingRelayer='0x384B2460d7AC08Cef74B02E4D80108aDCa4B4A12';
  const rel=await hre.ethers.getContractAt('GaslessRelayer', existingRelayer);
  tx=await rel.setWhitelistedContract(pmAddr, true);
  await tx.wait();
  console.log('Whitelisted PM2 in existing GaslessRelayer', existingRelayer);
  tx=await pm.setAuthorizedOracle(deployer.address, true);
  await tx.wait();
  console.log('Authorized deployer as oracle for PM2');
  tx=await ai.setAIAgent(deployer.address, true);
  await tx.wait();
  console.log('Authorized AI agent for PM2', aiAddr);

  // Also authorize X402 for PM1? Already done
  // Save
  const fs=require('fs');
  const path=require('path');
  const out={
    network: "somniaTestnet",
    chainId: 50312,
    timestamp: new Date().toISOString(),
    contracts: {
      PredictionMarket_PM1: "0x68A0d6d7329B7f7Bffd74f2481f6DDD70aF16971",
      PredictionMarket_PM2_primary: pmAddr,
      AIOracle_PM1: "0x72fbfBD6260A543CF29ea7e2a175E7b4C482D7b6",
      AIOracle_PM2: aiAddr,
      GaslessRelayer: existingRelayer,
      TraderReputation_PM1: "0x2241869839fe1ab60B7dB4ed066556C8D41448C1",
      TraderReputation_PM2: await pm.reputationContract(),
      WSOMNIA3009: "0x5C46B206aF8a2148DD8813Bd69a03634562aC300",
      X402BettingSOMNIA: "0x2C01AFeF1A0C4E01b336256DacFd1e6326DFcf80",
      DreamDEX_BinaryMarketsModule: "0x3ecC694Cef705358864a646142ac17A90E29e388",
      DreamDEX_tUSDC: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E"
    },
    deployer: deployer.address
  };
  fs.writeFileSync(path.join(__dirname,'..','deployments','somnia-shannon.json'), JSON.stringify(out,null,2));
  console.log('Saved to deployments/somnia-shannon.json');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)});
