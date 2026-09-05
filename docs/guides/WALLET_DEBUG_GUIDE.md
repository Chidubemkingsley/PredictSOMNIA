# Wallet Connection Debugging Guide

## Issue
The "Connect Wallet" button is not visible on the page after integrating RainbowKit.

## What Was Done

### 1. RainbowKit Integration ✅
- Installed `@rainbow-me/rainbowkit@2.2.9`
- Added RainbowKitProvider to Web3Provider
- Created RainbowKitButton component
- Updated main page to use RainbowKitButton

### 2. Created Test Page ✅
**URL**: http://localhost:3000/test-wallet

This dedicated test page will help you debug:
- Whether the RainbowKit button renders
- Whether wallet connection works
- Connection status in real-time

## How to Test

### Step 1: Visit Test Page
Open your browser to:
```
http://localhost:3000/test-wallet
```

### Step 2: Check What You See
✅ **If you see the "Connect Wallet" button:**
   - The component is rendering correctly
   - Click it and try connecting your wallet
   - The issue might be page-specific CSS/layout

❌ **If you DON'T see the "Connect Wallet" button:**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests
   - Look for React hydration errors

### Step 3: Check Main Page
Visit:
```
http://localhost:3000/
```

Compare if the button appears here vs the test page.

## Common Issues & Solutions

### Issue 1: Button Not Rendering
**Symptoms**: Nothing shows where button should be

**Solutions**:
1. Check browser console for errors
2. Verify MetaMask or another wallet is installed
3. Clear browser cache and hard reload (Ctrl+Shift+R)
4. Check if component is wrapped in `'use client'` directive

### Issue 2: WalletConnect 403 Error
**Symptoms**: Console shows "HTTP status code: 403" or "Forbidden"

**Solution**: This is expected if using demo WalletConnect project ID. It won't affect MetaMask or injected wallet connections.

### Issue 3: Hydration Mismatch
**Symptoms**: React hydration error in console

**Solutions**:
1. RainbowKit components must be client-side only
2. Verify all parent components have `'use client'` directive
3. May need to dynamically import with `{ ssr: false }`

### Issue 4: CSS Not Loading
**Symptoms**: Button exists but looks broken/unstyled

**Solution**: Verify `@rainbow-me/rainbowkit/styles.css` is imported in Web3Provider

## Debugging Checklist

- [ ] Dev server is running on http://localhost:3000
- [ ] Visited http://localhost:3000/test-wallet
- [ ] Opened browser DevTools (F12)
- [ ] Checked Console tab for errors
- [ ] MetaMask (or another wallet) is installed
- [ ] Tried hard refresh (Ctrl+Shift+R)
- [ ] Checked Network tab for failed requests

## Files Modified

1. **src/components/RainbowKitButton.tsx** - Main button component
2. **src/components/providers/Web3Provider.tsx** - Added RainbowKitProvider
3. **src/lib/web3-config.ts** - Updated connectors
4. **src/app/page.tsx** - Using RainbowKitButton
5. **src/app/test-wallet/page.tsx** - NEW test page

## Next Steps

1. **Test the Test Page**: Visit `/test-wallet` and report what you see
2. **Share Console Errors**: If there are errors, share them
3. **Try MetaMask**: Make sure MetaMask extension is installed
4. **Check Browser**: Try a different browser if issues persist

## Rollback Plan

If RainbowKit doesn't work, we can revert to the custom WalletConnect component:

```bash
# The old WalletConnect.tsx component still exists
# Just need to import it in page.tsx instead of RainbowKitButton
```

---

**Status**: Dev server running on http://localhost:3000  
**Test URL**: http://localhost:3000/test-wallet  
**Main URL**: http://localhost:3000/
