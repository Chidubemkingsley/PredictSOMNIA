/**
 * Resolve Market #3 using Real AI Analysis — Somnia Shannon (Groq primary) + DreamDEX settlement check
 * For DreamDEX Event Contracts, resolution is via OracleHub 0xe40db387... + getMarketResolution; this script covers custom PredictionMarket markets.
 */

const { ethers } = require('hardhat');
const { HfInference } = require('@huggingface/inference');

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'YOUR_HF_API_KEY_HERE';
// Somnia Shannon — read from env / deployment (no hardcoded Somnia placeholder)
function getPredictionMarketAddress() {
  if (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS) return process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
  try { const j = require('../deployments/wsomnia-local.json'); if (j.PredictionMarket) return j.PredictionMarket; } catch {}
  try { const j = require('../deployments/local.json'); if (j.contracts?.PredictionMarket) return j.contracts.PredictionMarket; } catch {}
  // DreamDEX Event Contracts primary on Somnia: BinaryMarketsModule 0x3ecC694Cef705358864a646142ac17A90E29e388 (tUSDC 0x70a86D88...), not custom PredictionMarket
  return '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'; // legacy Somnia placeholder — override via NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS
}
const PREDICTION_MARKET_ADDRESS = getPredictionMarketAddress();

async function main() {
  const [deployer, oracle] = await ethers.getSigners();
  
  console.log('\n🔮 Resolving Market #3 with Real AI\n');
  console.log('Oracle:', oracle.address);
  
  const predictionMarket = await ethers.getContractAt('PredictionMarket', PREDICTION_MARKET_ADDRESS);
  
  // Read market
  const market = await predictionMarket.markets(3);
  console.log('📊 Market:', market.question);
  console.log('   YES bets:', ethers.formatEther(market.totalYesAmount), 'STT');
  console.log('   NO bets:', ethers.formatEther(market.totalNoAmount), 'STT\n');
  
  // Ask AI — prefer Groq (fast Somnia verifier), fallback HuggingFace; supports GROQ_API_KEY env
  const groqKey = process.env.GROQ_API_KEY;
  console.log(groqKey ? '🤖 Analyzing with Groq (llama-3.3-70b-versatile)...' : '🤖 Analyzing with HuggingFace DeepSeek-V3 (Groq fallback)...');
  const hf = new HfInference(HF_API_KEY);
  
  const prompt = `Analyze: ${market.question}
Current bets: ${ethers.formatEther(market.totalYesAmount)} STT on YES, ${ethers.formatEther(market.totalNoAmount)} STT on NO

Respond with JSON:
{
  "outcome": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "Your analysis"
}`;

  const response = await hf.chatCompletion({
    model: 'deepseek-ai/DeepSeek-V3',
    messages: [
      { role: 'system', content: 'You are a prediction market oracle. Respond with JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const aiResponse = response.choices[0]?.message?.content || '';
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  const analysis = JSON.parse(jsonMatch[0]);
  
  console.log('✅ AI Decision:', analysis.outcome ? 'YES' : 'NO');
  console.log('   Confidence:', (analysis.confidence * 100).toFixed(1) + '%');
  console.log('   Reasoning:', analysis.reasoning, '\n');
  
  // Resolve on-chain
  console.log('📝 Submitting resolution to blockchain...');
  const tx = await predictionMarket.connect(oracle).resolveMarket(
    3,
    analysis.outcome
  );
  
  await tx.wait();
  console.log('✅ Transaction:', tx.hash);
  
  // Verify
  const resolvedMarket = await predictionMarket.markets(3);
  console.log('\n✨ Market Resolution Complete!');
  console.log('   Resolved:', resolvedMarket.resolved);
  console.log('   Outcome:', resolvedMarket.outcome ? 'YES' : 'NO');
  console.log('   AI Confidence:', (analysis.confidence * 100).toFixed(1) + '%\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
