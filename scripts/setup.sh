#!/bin/bash

echo "🚀 PredictBNB - Quick Start Script"
echo "===================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local and add your API keys!"
    echo ""
fi

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Frontend dependencies installed"
echo ""

# Install contract dependencies if contracts folder exists
if [ -d "contracts" ]; then
    echo "📦 Installing smart contract dependencies..."
    cd contracts
    npm install
    cd ..
    echo "✅ Contract dependencies installed"
    echo ""
fi

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "To deploy contracts:"
echo "1. Add your PRIVATE_KEY to .env.local"
echo "2. cd contracts && npx hardhat run scripts/deploy.js --network bscTestnet"
echo ""
echo "For more info, see README.md"
