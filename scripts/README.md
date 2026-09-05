# Utility Scripts

> Helper scripts for project setup, deployment, and verification

## 📋 Available Scripts

### `setup.sh`
**Purpose**: Initial project setup and dependency installation

**Usage**:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**What it does**:
- Installs frontend dependencies
- Installs contract dependencies
- Compiles smart contracts
- Sets up environment files
- Verifies installation

**Requirements**:
- Node.js >= 18.0.0
- npm >= 9.0.0

---

### `verify-features.sh`
**Purpose**: Verify all features are working correctly

**Usage**:
```bash
chmod +x scripts/verify-features.sh
./scripts/verify-features.sh
```

**What it checks**:
- Frontend dependencies installed
- Contract compilation successful
- Environment variables set
- All key files present
- TypeScript types valid
- Linting passes

**Output**: Pass/fail report for each feature

---

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Clone the repository
git clone https://github.com/Chidubemkingsley/PredictSOMNIA.git
cd CreativeMarket/someCreativity

# 2. Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your values

# 4. Start development
npm run dev
```

### Verification
```bash
# Verify everything is working
chmod +x scripts/verify-features.sh
./scripts/verify-features.sh
```

---

## 📝 Script Details

### setup.sh

```bash
#!/bin/bash

echo "🚀 Setting up CreativeHead..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install contract dependencies
echo "📦 Installing contract dependencies..."
cd contracts && npm install && cd ..

# Compile contracts
echo "🔨 Compiling smart contracts..."
cd contracts && npx hardhat compile && cd ..

# Setup environment
echo "⚙️ Setting up environment..."
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "✅ Created .env.local (please configure)"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration"
echo "2. Run 'npm run dev' to start development"
```

### verify-features.sh

```bash
#!/bin/bash

echo "🔍 Verifying CreativeHead features..."

# Check frontend dependencies
echo "📦 Checking frontend dependencies..."
if [ -d "node_modules" ]; then
  echo "✅ Frontend dependencies installed"
else
  echo "❌ Frontend dependencies missing"
fi

# Check contract compilation
echo "🔨 Checking contract compilation..."
if [ -d "contracts/artifacts" ]; then
  echo "✅ Contracts compiled"
else
  echo "❌ Contracts not compiled"
fi

# Check environment
echo "⚙️ Checking environment..."
if [ -f ".env.local" ]; then
  echo "✅ Environment configured"
else
  echo "⚠️ .env.local missing"
fi

# Run type check
echo "📝 Checking TypeScript..."
npm run type-check

# Run linting
echo "🧹 Checking code quality..."
npm run lint

echo ""
echo "✅ Verification complete!"
```

---

## 🛠️ Creating Custom Scripts

### Script Template

```bash
#!/bin/bash

# Script: my-script.sh
# Purpose: Describe what this script does
# Usage: ./scripts/my-script.sh [options]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️ $1${NC}"
}

# Main script logic
echo "Starting script..."

# Your code here

success "Script completed successfully!"
```

### Best Practices

1. **Make scripts executable**:
   ```bash
   chmod +x scripts/my-script.sh
   ```

2. **Add error handling**:
   ```bash
   set -e  # Exit on error
   set -u  # Error on undefined variable
   ```

3. **Provide feedback**:
   ```bash
   echo "Processing..."
   success "Done!"
   ```

4. **Document usage**:
   ```bash
   # Add usage instructions at the top
   # Usage: ./scripts/my-script.sh [--option value]
   ```

---

## 🔧 Troubleshooting

### Permission Denied

**Problem**: `Permission denied` when running script

**Solution**:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Script Not Found

**Problem**: `No such file or directory`

**Solution**: Make sure you're in the project root
```bash
cd /path/to/someCreativity
./scripts/setup.sh
```

### Dependencies Failed

**Problem**: Script fails during dependency installation

**Solution**: Check Node.js version
```bash
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 9.0.0
```

### Contract Compilation Failed

**Problem**: Hardhat compilation errors

**Solution**:
```bash
cd contracts
npx hardhat clean
npx hardhat compile
```

---

## 📚 Additional Scripts

### Package.json Scripts

Frontend scripts are defined in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "contracts:compile": "cd contracts && npx hardhat compile",
    "contracts:test": "cd contracts && npx hardhat test",
    "deploy:testnet": "cd contracts && npx hardhat run scripts/deploy.js --network somniaTestnet"
  }
}
```

### Contract Scripts

Contract scripts are in `contracts/package.json`:

```json
{
  "scripts": {
    "test": "hardhat test",
    "compile": "hardhat compile",
    "deploy:testnet": "hardhat run scripts/deploy.js --network somniaTestnet",
    "deploy:mainnet": "hardhat run scripts/deploy.js --network somnia"
  }
}
```

---

## 🤝 Contributing

To add a new script:

1. Create script in `scripts/` directory
2. Make it executable: `chmod +x scripts/new-script.sh`
3. Add documentation to this README
4. Test thoroughly
5. Submit pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

---

## 📞 Support

- **Issues**: Check [../docs/fixes/](../docs/fixes/)
- **Questions**: See [../docs/guides/](../docs/guides/)
- **Contributing**: Read [../CONTRIBUTING.md](../CONTRIBUTING.md)

---

## 📜 License

Apache License 2.0 - Built for Seedify Hackathon 2025

See [LICENSE](../LICENSE) for full details.
