#!/bin/bash

# Somnia Testnet Faucet Helper Script
# This script helps you get test STT for Somnia Testnet

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║              Somnia TESTNET FAUCET - GET FREE tBNB                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Get your address from .env.local
PRIVATE_KEY=$(grep PRIVATE_KEY .env.local | cut -d '=' -f2)

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ ERROR: Private key not found in .env.local"
    exit 1
fi

echo "📋 Your Account Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""

echo "💰 Current Balance (Somnia Testnet):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check balance using hardhat
cd contracts
npx hardhat run --network bscTestnet <<'EOF'
const { ethers } = require('hardhat');

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(ethers.formatEther(balance) + " tBNB");
}

main().catch(console.error);
EOF

echo ""
echo "🎁 FAUCET OPTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option 1: Official Somnia Faucet (RECOMMENDED)"
echo "   URL: https://testnet.bnbchain.org/faucet-smart"
echo "   Amount: 0.5 tBNB per day"
echo "   Requirements: Twitter or GitHub verification"
echo ""
echo "Option 2: Alternative Faucet #1"
echo "   URL: https://www.bnbchain.org/en/testnet-faucet"
echo "   Amount: 0.1-0.5 tBNB"
echo ""
echo "Option 3: QuickNode Faucet"
echo "   URL: https://faucet.quicknode.com/binance-smart-chain/bnb-testnet"
echo "   Amount: Variable"
echo ""

echo "📝 STEPS TO GET tBNB:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Choose a faucet above"
echo "2. Paste your address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "3. Complete verification (usually Twitter/GitHub)"
echo "4. Receive tBNB in 10-30 seconds"
echo "5. Run this script again to check your balance"
echo ""

echo "🚀 AFTER GETTING tBNB:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploy contracts:"
echo "  npx hardhat run scripts/deploy-somnia-testnet.js --network bscTestnet"
echo ""
echo "Test integration:"
echo "  npx hardhat run test-somnia-complete.js --network bscTestnet"
echo ""

echo "💡 TIP: Opening browser automatically..."
echo ""

# Try to open the faucet in browser
if command -v xdg-open > /dev/null; then
    xdg-open "https://testnet.bnbchain.org/faucet-smart" 2>/dev/null
elif command -v open > /dev/null; then
    open "https://testnet.bnbchain.org/faucet-smart" 2>/dev/null
elif command -v firefox > /dev/null; then
    firefox "https://testnet.bnbchain.org/faucet-smart" 2>/dev/null &
elif command -v google-chrome > /dev/null; then
    google-chrome "https://testnet.bnbchain.org/faucet-smart" 2>/dev/null &
else
    echo "⚠️  Could not open browser automatically"
    echo "   Please visit: https://testnet.bnbchain.org/faucet-smart"
fi

echo ""
echo "✅ Script complete!"
echo ""
