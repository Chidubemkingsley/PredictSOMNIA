/**
 * Resolve past-year (2025) Shannon markets once the contract supports forceResolveMarket,
 * OR when endTime has passed (resolveMarket).
 *
 * Usage (from contracts/):
 *   npx hardhat run scripts/resolve-past-year-markets.js --network somniaTestnet
 */

const { ethers } = require('hardhat');

const PAST_YEAR = [
  { id: 2, outcome: false, label: 'Avatar 3 $2B in 2025 → NO' },
  { id: 4, outcome: false, label: 'Nolan film in 2025 → NO' },
  { id: 5, outcome: false, label: 'Taylor album Q1 2026 → NO' },
  { id: 11, outcome: false, label: 'GTA 6 before Dec 2025 → NO' },
];

async function main() {
  const [signer] = await ethers.getSigners();
  const pmAddress =
    process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS ||
    process.env.PREDICTION_MARKET_ADDRESS ||
    '0x67F7B580AEd6de246f7db70e19efdcE4Dd34Fc61';

  console.log('Signer:', signer.address);
  console.log('PredictionMarket:', pmAddress);

  const pm = await ethers.getContractAt('PredictionMarket', pmAddress, signer);

  for (const m of PAST_YEAR) {
    const market = await pm.markets(m.id);
    if (market.resolved) {
      console.log(`#${m.id} already resolved (outcome=${market.outcome}) — skip`);
      continue;
    }

    console.log(`\n#${m.id} ${m.label}`);
    try {
      // Prefer forceResolve if deployed
      if (typeof pm.forceResolveMarket === 'function') {
        const tx = await pm.forceResolveMarket(m.id, m.outcome);
        console.log('  forceResolve tx:', tx.hash);
        await tx.wait();
        console.log('  ✅ force-resolved');
        continue;
      }
    } catch (e) {
      console.log('  forceResolve unavailable/failed:', e.shortMessage || e.message);
    }

    try {
      const tx = await pm.resolveMarket(m.id, m.outcome);
      console.log('  resolveMarket tx:', tx.hash);
      await tx.wait();
      console.log('  ✅ resolved');
    } catch (e) {
      console.log(
        '  ❌ on-chain resolve blocked (likely endTime):',
        e.shortMessage || e.message
      );
      console.log('  → App soft-resolution still applies for 2026 UX.');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
