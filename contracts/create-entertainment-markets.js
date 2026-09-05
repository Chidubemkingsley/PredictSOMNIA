const { ethers } = require('hardhat');

async function main() {
  function getPmAddr(){
    if (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS) return process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
    try { const j=require('./deployments/somnia-shannon.json'); return j.contracts.PredictionMarket_PM2_primary || j.contracts.PredictionMarket; } catch {}
    try { const j=require('./deployments/wsomnia-local.json'); return j.contracts.PredictionMarket; } catch {}
    return "0x67F7B580AEd6de246f7db70e19efdcE4Dd34Fc61";
  }
  const pmAddress = getPmAddr();
  const pm = await ethers.getContractAt('PredictionMarket', pmAddress);
  console.log('PredictionMarket (Somnia Shannon):', pmAddress);
  
  console.log('Creating new markets with Movies, Music, Relationships categories...\n');

  const now = Math.floor(Date.now() / 1000);
  const DAY = 24 * 60 * 60;

  const newMarkets = [
    // Movies — updated for 2026 (was 2025, now past)
    {
      question: "Will Avatar 3 gross over $2 billion worldwide in 2027?",
      description: "James Cameron's Avatar 3 is now slated for 2026-2027. Will it follow the success of the first two films and cross $2 billion at the global box office by end of 2027?",
      category: "Movies",
      endTime: now + (180 * DAY), // 180 days from now (~2027-03)
    },
    {
      question: "Will a Marvel movie win Best Picture at the Oscars 2026?",
      description: "The Academy Awards have traditionally overlooked superhero films. Will Marvel Studios finally secure the prestigious Best Picture award at the 2026 ceremony?",
      category: "Movies",
      endTime: now + (400 * DAY), // ~13 months
    },
    {
      question: "Will Christopher Nolan release a new film in 2026?",
      description: "Following his Oscar-winning Oppenheimer, will Christopher Nolan announce or release another feature film before the end of 2026?",
      category: "Movies",
      endTime: now + (365 * DAY),
    },

    // Music
    {
      question: "Will Taylor Swift announce a new album in Q1 2026?",
      description: "Taylor Swift has been on her record-breaking Eras Tour. Will she announce a brand new studio album in the first quarter of 2026?",
      category: "Music",
      endTime: now + (100 * DAY), // ~3 months
    },
    {
      question: "Will Drake and Kendrick Lamar release a collaboration track?",
      description: "Despite their rivalry, hip-hop fans have long hoped for a collaboration. Will Drake and Kendrick Lamar surprise everyone with a joint track in 2025-2026?",
      category: "Music",
      endTime: now + (365 * DAY),
    },
    {
      question: "Will BTS reunite for a world tour before end of 2026?",
      description: "BTS members are completing their military service. Will the K-pop group announce a reunion world tour before December 31, 2026?",
      category: "Music",
      endTime: now + (700 * DAY), // ~2 years
    },

    // Relationships / Celebrity
    {
      question: "Will a Kardashian family member announce an engagement in 2026?",
      description: "The Kardashian-Jenner family is known for high-profile relationships. Will any family member announce an engagement before the end of 2026?",
      category: "Relationships",
      endTime: now + (365 * DAY),
    },
    {
      question: "Will Zendaya and Tom Holland announce their engagement?",
      description: "Hollywood's beloved couple has been dating since 2021. Will Zendaya and Tom Holland take the next step and announce an engagement in 2025-2026?",
      category: "Relationships",
      endTime: now + (365 * DAY),
    },
    {
      question: "Will a British Royal announce a new baby in 2026?",
      description: "The British Royal Family continues to grow. Will Prince William & Kate, or any other senior royal, announce a pregnancy or birth in 2026?",
      category: "Relationships",
      endTime: now + (365 * DAY),
    },

    // Entertainment — updated for 2026 (was Dec 2025, now past)
    {
      question: "Will GTA 6 release before December 2026?",
      description: "Rockstar Games has announced GTA 6 for 2026. Will the highly anticipated game actually release before December 2026, or face delays?",
      category: "Entertainment",
      endTime: now + (340 * DAY),
    },
    {
      question: "Will a streaming service surpass Netflix in subscribers by 2026?",
      description: "Netflix dominates streaming, but competitors are growing fast. Will Disney+, Amazon Prime, or another service overtake Netflix's subscriber count?",
      category: "Entertainment",
      endTime: now + (365 * DAY),
    },
  ];

  const [signer] = await ethers.getSigners();
  console.log('Creating markets from:', signer.address);
  console.log('');

  for (const market of newMarkets) {
    try {
      console.log(`Creating: "${market.question.slice(0, 50)}..."`);
      console.log(`  Category: ${market.category}`);
      
      const tx = await pm.createMarket(
        market.question,
        market.description,
        market.category,
        market.endTime,
        false // aiOracleEnabled
      );
      
      const receipt = await tx.wait();
      console.log(`  ✅ Created! TX: ${receipt.hash.slice(0, 20)}...`);
      console.log('');
      
      // Small delay to avoid nonce issues
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      console.log('');
    }
  }

  // Summary
  console.log('\n--- Verifying new categories ---');
  const categories = {};
  const count = await pm.marketCount();
  
  for (let i = 0; i < Number(count); i++) {
    try {
      const m = await pm.markets(i);
      if (m.category) {
        categories[m.category] = (categories[m.category] || 0) + 1;
      }
    } catch(e) {
      break;
    }
  }
  
  console.log('\nCategory Summary:');
  for (const [cat, cnt] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt} markets`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);
