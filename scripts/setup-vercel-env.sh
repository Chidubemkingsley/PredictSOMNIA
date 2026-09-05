#!/bin/bash

# ============================================================================
# Vercel Environment Variables Setup Script
# ============================================================================
# This script helps you quickly set up all required environment variables
# for your Vercel deployment using the Vercel CLI
#
# Prerequisites:
# 1. Install Vercel CLI: npm i -g vercel
# 2. Login: vercel login
# 3. Link project: vercel link
# ============================================================================

set -e

echo "🚀 Setting up Vercel Environment Variables..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "📦 Install it with: npm i -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Function to set environment variable
set_env_var() {
    local var_name=$1
    local var_description=$2
    local default_value=$3
    local environment=$4
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 $var_description"
    echo "Variable: $var_name"
    
    if [ -n "$default_value" ]; then
        echo "Default: $default_value"
        read -p "Enter value (or press Enter for default): " value
        value=${value:-$default_value}
    else
        read -p "Enter value: " value
    fi
    
    if [ -n "$value" ]; then
        echo "$value" | vercel env add "$var_name" "$environment" --force 2>/dev/null || {
            echo "⚠️  Could not set $var_name (might already exist)"
        }
        echo "✅ $var_name set"
    else
        echo "⏭️  Skipped $var_name"
    fi
    echo ""
}

# Ask for environment
echo "🌍 Which environment do you want to configure?"
echo "1) Production"
echo "2) Preview"
echo "3) Development"
echo "4) All"
read -p "Choose (1-4): " env_choice

case $env_choice in
    1) ENVIRONMENT="production" ;;
    2) ENVIRONMENT="preview" ;;
    3) ENVIRONMENT="development" ;;
    4) ENVIRONMENT="production preview development" ;;
    *) 
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Setting up for: $ENVIRONMENT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 REQUIRED VARIABLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Required variables
for ENV in $ENVIRONMENT; do
    echo "Setting variables for: $ENV"
    echo ""
    
    # WalletConnect
    set_env_var \
        "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" \
        "WalletConnect Project ID (Get from https://cloud.walletconnect.com/)" \
        "" \
        "$ENV"
    
    # Contract Addresses
    set_env_var \
        "NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS" \
        "PredictionMarket Contract Address" \
        "0x5FbDB2315678afecb367f032d93F642f64180aa3" \
        "$ENV"
    
    set_env_var \
        "NEXT_PUBLIC_AI_ORACLE_ADDRESS" \
        "AIOracle Contract Address" \
        "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" \
        "$ENV"
    
    set_env_var \
        "NEXT_PUBLIC_GASLESS_RELAYER_ADDRESS" \
        "GaslessRelayer Contract Address" \
        "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" \
        "$ENV"
    
    # Network Configuration
    set_env_var \
        "NEXT_PUBLIC_DEFAULT_CHAIN_ID" \
        "Default Chain ID (97 for Somnia Testnet, 56 for Mainnet)" \
        "97" \
        "$ENV"
    
    set_env_var \
        "NEXT_PUBLIC_ENABLE_TESTNET" \
        "Enable Testnet (true/false)" \
        "true" \
        "$ENV"
    
    # Site Configuration
    set_env_var \
        "NEXT_PUBLIC_SITE_NAME" \
        "Site Name" \
        "PredictBNB" \
        "$ENV"
    
    read -p "🤔 Do you want to set optional variables? (y/n): " setup_optional
    
    if [[ $setup_optional == "y" || $setup_optional == "Y" ]]; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📋 OPTIONAL VARIABLES"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        
        # OpenAI
        set_env_var \
            "OPENAI_API_KEY" \
            "OpenAI API Key (for AI oracle features)" \
            "" \
            "$ENV"
        
        # Hugging Face
        set_env_var \
            "HUGGINGFACE_API_KEY" \
            "Hugging Face API Key (alternative AI provider)" \
            "" \
            "$ENV"
        
        # BSCScan
        set_env_var \
            "BSCSCAN_API_KEY" \
            "BSCScan API Key (for contract verification)" \
            "" \
            "$ENV"
        
        # IPFS
        set_env_var \
            "PINATA_API_KEY" \
            "Pinata API Key (for IPFS storage)" \
            "" \
            "$ENV"
        
        set_env_var \
            "PINATA_SECRET_KEY" \
            "Pinata Secret Key" \
            "" \
            "$ENV"
        
        # Private Key (for oracle service)
        echo "⚠️  WARNING: Only set PRIVATE_KEY if deploying oracle service"
        read -p "Set PRIVATE_KEY? (y/n): " set_pk
        if [[ $set_pk == "y" || $set_pk == "Y" ]]; then
            set_env_var \
                "PRIVATE_KEY" \
                "Wallet Private Key (for oracle service ONLY)" \
                "" \
                "$ENV"
        fi
        
        # RPC URLs
        set_env_var \
            "NEXT_PUBLIC_BSC_TESTNET_RPC_URL" \
            "Somnia Testnet RPC URL" \
            "https://data-seed-prebsc-1-s1.binance.org:8545/" \
            "$ENV"
        
        set_env_var \
            "NEXT_PUBLIC_BSC_RPC_URL" \
            "Somnia Mainnet RPC URL" \
            "https://somnia-dataseed.binance.org/" \
            "$ENV"
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment variables setup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Verify variables in Vercel dashboard:"
echo "   https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
echo ""
echo "2. Deploy your project:"
echo "   vercel --prod"
echo ""
echo "3. After deployment, update contract addresses if needed"
echo ""
echo "🎉 Happy deploying!"
