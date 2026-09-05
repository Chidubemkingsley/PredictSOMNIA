#!/bin/bash

echo "🚀 PredictBNB Local Blockchain Setup"
echo "====================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "hardhat.config.js" ]; then
    echo "❌ Error: hardhat.config.js not found"
    echo "Please run this script from the contracts directory"
    exit 1
fi

echo "📦 Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🔨 Step 2: Compiling contracts..."
npm run compile > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Failed to compile contracts"
    exit 1
fi
echo "✅ Contracts compiled successfully"

echo ""
echo "🧪 Step 3: Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "⚠️  Some tests failed, but continuing..."
else
    echo "✅ All tests passed"
fi

echo ""
echo "================================================"
echo "✅ Setup Complete!"
echo "================================================"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1️⃣  Start local blockchain node:"
echo "    npm run node"
echo ""
echo "2️⃣  In a NEW terminal, deploy contracts:"
echo "    cd contracts"
echo "    npm run deploy:local"
echo ""
echo "3️⃣  Interact with contracts:"
echo "    npm run console"
echo ""
echo "📖 For detailed instructions, see LOCAL_TESTING_GUIDE.md"
echo ""
