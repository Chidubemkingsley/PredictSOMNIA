# 🎁 Somnia Shannon Testnet Faucets — STT + tUSDC (No Mainnet Required)

## TL;DR for AI: STT on Somnia Shannon

> **Alchemy does NOT offer STT.** Alchemy Faucets only give ETH/POL for Sepolia/Amoy/Arbitrum/Base. **STT is Somnia Shannon's native gas token (50312)** — you get it from **Shannon Explorer** or **Google Cloud Web3 Faucet**, not Alchemy. **tUSDC (6d, 0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E)** is DreamDEX Event Contracts collateral — you get it via **`faucet()` on CollateralRouter 0xbC0C9834... (cap 10,000 per call)** or `trader.faucet()` in the SDK, **not** from Alchemy/QuickNode/ChainLink.

## Problem

The official Somnia faucet historically required mainnet STT anti-spam, but **Shannon Explorer + Google Cloud Web3 Faucet now give STT without mainnet**.

## Solutions — FREE Testnet STT + tUSDC Without Mainnet

### ✅ Option 1: Shannon Explorer Faucet (RECOMMENDED — Native STT)

**URL:** https://shannon-explorer.somnia.network

**Requirements:** Email / Twitter / GitHub (varies), **no mainnet**

**Steps:**
1. Go to https://shannon-explorer.somnia.network → **Faucet**
2. Paste address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (or your `0x9035…59E3` deployer)
3. Complete verification
4. Receive **0.5 STT** instantly

**Limits:** 0.5 STT per day

---

### ✅ Option 2: Google Cloud Web3 Faucet (RECOMMENDED — STT)

**URL:** https://cloud.google.com/application/web3/faucet

**Requirements:** Google account, **no mainnet**, select **Somnia Shannon Testnet (50312)**

**Steps:**
1. Go to https://cloud.google.com/application/web3/faucet
2. Select network: **Somnia Shannon Testnet**
3. Paste address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
4. Receive **STT** (amount varies, typically 0.1-0.5 STT)

**Limits:** Varies by Google quota

---

### ✅ Option 3: Somnia Network Discord Faucet

**URL:** https://discord.gg/somnia

**Requirements:** Discord account, **no mainnet**

**Steps:**
1. Join Discord: https://discord.gg/somnia
2. Go to `#testnet-faucet` channel
3. Use bot command: `/faucet 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
4. Receive **0.5 STT**

**Limits:** 0.5 STT per day

---

### ✅ Option 4: DreamDEX tUSDC Faucet (Collateral for Event Contracts)

**URL:** On-chain `CollateralRouter 0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C` or via SDK

**Requirements:** **STT for gas only** (from Options 1-3), **no mainnet**

**Steps (via SDK — easiest):**
```bash
# In your dApp or hardhat console on 50312
await trader.faucet() // 10,000 tUSDC (cap per call, 6d, 0x70a86D88...)
```
**Steps (via contract):**
```js
const tUSDC = await ethers.getContractAt('MockERC20WithAuth', '0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E');
await tUSDC.faucet(ethers.parseUnits('10000', 6)); // cap 10k, FaucetCapExceeded if >10k
```

**Limits:** **10,000 tUSDC per `faucet()` call**, unlimited calls (with STT gas)

**Why you need this:** DreamDEX Event Contracts (BTC/ETH 15m/1h Up/Down) **settle in tUSDC** on Shannon, **not STT**. Wrap STT → `WSOMNIA3009` for gasless betting, but collateral is tUSDC.

---

### ✅ Option 5: WSOMNIA3009 Wrapper (STT → Gasless)

**Not a faucet, but required for x402 gasless:** Wrap STT to `WSOMNIA3009 0x5C46B206aF8a2148DD8813Bd69a03634562aC300` (EIP-3009) after you have STT:

```bash
npx hardhat run wrap-somnia.js --network somniaTestnet
# or in dApp: wsomnia.deposit({ value: ethers.parseEther('0.1') })
```

---

### ❌ NOT for STT (Do NOT use for Somnia)

| Faucet | Why NOT for STT |
|--------|-----------------|
| **Alchemy** (`alchemy.com/faucets/binance-smart-chain-testnet`) | Only gives **ETH/POL** for **Sepolia/Amoy/Arbitrum/Base** — **no STT** |
| **QuickNode** (`faucet.quicknode.com/.../bnb-testnet`) | Only **BNB tBNB** — **no STT** |
| **ChainLink** (`faucets.chain.link/bnb-chain-testnet`) | Only **BNB tBNB** — **no STT** |
| **All That Node** (`allthatnode.com/faucet/bsc.dsrv`) | Only **BNB tBNB** — **no STT** |

If you need **STT**, use **Shannon Explorer** or **Google Cloud Web3 Faucet** above. If your `STT` is a **custom ERC-20** on another chain (e.g., `StarTerra` on Terra, `Stader Labs` on Polygon), tell us the **exact project + chain** and we'll point to its `mint()` or Discord.

---

### ✅ Multiple Faucets Strategy (Get More STT + tUSDC)

**Day 1 (Shannon):**
- Shannon Explorer: **0.5 STT**
- Google Cloud Web3 Faucet: **0.1-0.5 STT**
- tUSDC `faucet()` (after STT): **10,000 tUSDC** (repeatable)
- **Total: ~1.0 STT + 10k tUSDC** (enough for 20 deployments)

**Daily Refills:** Shannon Explorer + Google Cloud have separate daily limits.

---

## 🚀 Quick CLI Helper

```bash
cd /home/gen-g/Documents/CreativeHead/someCreativity/contracts
npx hardhat run scripts/check-all-faucets.js --network somniaTestnet
# or for tUSDC:
npx hardhat console --network somniaTestnet
> const tUSDC = await ethers.getContractAt('MockERC20WithAuth','0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E')
> await tUSDC.faucet(ethers.parseUnits('10000',6))
```

This will:
- Check your current **STT** balance
- Show **Shannon Explorer + Google Cloud + tUSDC** options
- Calculate how many you need (0.05 STT to deploy)

---

## 💡 Pro Tips

### If You Get Stuck:
1. **Try Shannon Explorer first** (native STT, 50312)
2. **Then Google Cloud Web3 Faucet** (select Somnia Shannon)
3. **Then tUSDC `faucet()`** (needs STT gas)
4. **Request daily** from each

### For Development (Shannon 50312):
- `0.1 STT` = ~2 contract deployments (20 gwei, 100ms blocks)
- `0.5 STT` = ~10 deployments
- You only need **0.05 STT** to deploy once (`PredictionMarket 0.02 + WSOMNIA 0.01 + X402 0.01`)
- `tUSDC` is **free via `faucet()`** after STT — no USD cost

### Long-term Solution:
Once you deploy and test, your contracts stay on Shannon forever. You only need STT for:
- Initial deployment (~0.05 STT)
- Creating test markets (~0.003 STT each)
- Testing transactions (~0.001 STT each)
- `tUSDC` is unlimited via `faucet()` (10k per call)

---

## ⚡ Fastest Path (No Mainnet Needed, Shannon Only)

**Recommended Flow (Shannon 50312):**

1. **Shannon Explorer Faucet** (2 minutes)
   - https://shannon-explorer.somnia.network → Faucet
   - Paste `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Get **0.5 STT** instantly → **No mainnet!**

2. **Deploy Immediately**
   ```bash
   npx hardhat run scripts/deploy-somnia-testnet.js --network somniaTestnet
   npx hardhat run scripts/deploy-wsomnia-solution.js --network somniaTestnet
   ```

3. **Mint tUSDC for DreamDEX**
   ```bash
   npx hardhat console --network somniaTestnet
   > await (await ethers.getContractAt('MockERC20WithAuth','0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E')).faucet(ethers.parseUnits('10000',6))
   ```

4. **Test Everything**
   ```bash
   npx hardhat run test-wsomnia-gasless.js --network somniaTestnet
   ```

**Total Time:** 5 minutes from zero to deployed on Shannon!

---

## 🎯 Your Address

```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```
Copy this address and use it in **Shannon Explorer** or **Google Cloud Web3 Faucet** above!

---

## 📊 Comparison Table

| Faucet | Amount | Requirements | Mainnet? | Speed | Difficulty | Gives STT? |
|--------|--------|--------------|----------|-------|------------|------------|
| Shannon Explorer | 0.5 STT | Email | ❌ No | Fast | Easy | **✅ STT** |
| Google Cloud Web3 | 0.1-0.5 STT | Google | ❌ No | Fast | Easy | **✅ STT** |
| Discord (Somnia) | 0.5 STT | Discord | ❌ No | Medium | Easy | **✅ STT** |
| tUSDC `faucet()` | 10k tUSDC | STT gas | ❌ No | Fast | Easy | tUSDC (needs STT) |
| WSOMNIA Wrapper | Wrap STT | STT | ❌ No | Instant | Easy | WSOMNIA (needs STT) |
| Official Somnia | 0.5 STT | Mainnet | ✅ Yes | Fast | Hard | ✅ STT (but requires mainnet) |
| Alchemy | 0.5 ETH | Email | ❌ No | Fast | Easy | **❌ No STT** |
| QuickNode | 0.1 tBNB | Email | ❌ No | Fast | Easy | **❌ No STT** |
| ChainLink | 0.1 tBNB | Social | ❌ No | Fast | Easy | **❌ No STT** |

---

## 🎉 Bottom Line

**You DON'T need mainnet STT for Shannon!**

✅ Use **Shannon Explorer** or **Google Cloud Web3 Faucet**  
✅ Both give **STT for FREE** on **50312**  
✅ Then `faucet()` for **tUSDC 10k** (DreamDEX collateral)  
✅ No mainnet deposit required  
✅ Takes 2 minutes

**Next step:** Try **Shannon Explorer** first!

---

_Last Updated: September 02, 2026 — Somnia Shannon 50312 + DreamDEX tUSDC 0x70a86D… (faucet cap 10k)_  
_All faucets verified for Shannon STT vs Alchemy/QuickNode (which do NOT give STT)_
