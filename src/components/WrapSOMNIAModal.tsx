/**
 * WrapSOMNIAModal Component
 * UI for wrapping STT to WSOMNIA3009 for gasless betting
 * 
 * This is required for x402 gasless transactions:
 * 1. User wraps STT → WSOMNIA3009 (one-time, pays gas)
 * 2. All future bets are gasless using EIP-3009 signatures
 */

'use client';

import { useState, useEffect } from 'react';
import { useWSOMNIA } from '@/hooks/useWSOMNIA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowDownUp, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Zap,
  ExternalLink,
  X
} from 'lucide-react';

interface WrapSOMNIAModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount?: string; // Optional: amount needed for a specific bet
}

export function WrapSOMNIAModal({ isOpen, onClose, requiredAmount }: WrapSOMNIAModalProps) {
  const {
    wbnbBalance: _wbnbBalance,
    wbnbFormatted,
    bnbBalance: _bnbBalance,
    bnbFormatted,
    isLoading,
    wrap,
    isWrapping,
    wrapSuccess,
    wrapHash,
    wrapError,
    unwrap,
    isUnwrapping,
    unwrapSuccess,
    unwrapHash,
    unwrapError,
    refetch,
  } = useWSOMNIA();

  const [mode, setMode] = useState<'wrap' | 'unwrap'>('wrap');
  const [amount, setAmount] = useState(requiredAmount || '0.01');
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset success state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      if (requiredAmount) {
        setAmount(requiredAmount);
      }
    }
  }, [isOpen, requiredAmount]);

  // Show success message and refetch on transaction success
  useEffect(() => {
    if (wrapSuccess || unwrapSuccess) {
      setShowSuccess(true);
      refetch();
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [wrapSuccess, unwrapSuccess, refetch, onClose]);

  if (!isOpen) return null;

  const handleAction = async () => {
    if (mode === 'wrap') {
      await wrap(amount);
    } else {
      await unwrap(amount);
    }
  };

  const maxAmount = mode === 'wrap' 
    ? parseFloat(bnbFormatted) - 0.001 // Leave some for gas
    : parseFloat(wbnbFormatted);

  const setMaxAmount = () => {
    setAmount(maxAmount > 0 ? maxAmount.toFixed(4) : '0');
  };

  const isProcessing = isWrapping || isUnwrapping;
  const txHash = wrapHash || unwrapHash;
  const error = wrapError || unwrapError;

  const insufficientBalance = mode === 'wrap' 
    ? parseFloat(amount) > parseFloat(bnbFormatted)
    : parseFloat(amount) > parseFloat(wbnbFormatted);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="w-5 h-5" />
            {mode === 'wrap' ? 'Wrap STT' : 'Unwrap WSOMNIA3009'}
          </CardTitle>
          <CardDescription>
            {mode === 'wrap' 
              ? 'Convert STT to WSOMNIA3009 for gasless betting'
              : 'Convert WSOMNIA3009 back to STT'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <span className="font-semibold">Why wrap STT?</span>
                <p className="mt-1">
                  WSOMNIA3009 enables gasless betting. Wrap once, then all future bets 
                  require only your signature - no gas fees!
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'wrap' 
                  ? 'bg-white shadow text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setMode('wrap')}
            >
              Wrap STT
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                mode === 'unwrap' 
                  ? 'bg-white shadow text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setMode('unwrap')}
            >
              Unwrap
            </button>
          </div>

          {/* Balances */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">STT Balance</p>
              <p className="font-semibold">
                {isLoading ? '...' : `${parseFloat(bnbFormatted).toFixed(4)} STT`}
              </p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700">WSOMNIA3009 Balance</p>
              <p className="font-semibold text-yellow-800">
                {isLoading ? '...' : `${parseFloat(wbnbFormatted).toFixed(4)}`}
              </p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
                min="0.001"
                className="w-full p-3 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                disabled={isProcessing}
              />
              <button
                onClick={setMaxAmount}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                MAX
              </button>
            </div>
            {insufficientBalance && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Insufficient {mode === 'wrap' ? 'STT' : 'WSOMNIA3009'} balance
              </p>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {['0.01', '0.05', '0.1', '0.5'].map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                onClick={() => setAmount(preset)}
                disabled={isProcessing}
                className="flex-1"
              >
                {preset}
              </Button>
            ))}
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  {mode === 'wrap' ? 'Wrapped' : 'Unwrapped'} successfully!
                </span>
              </div>
              {txHash && (
                <a
                  href={`https://testnet.somniascan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-2"
                >
                  View on SomniaScan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error.message || 'Transaction failed'}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleAction}
            disabled={isProcessing || insufficientBalance || parseFloat(amount) <= 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isWrapping || isUnwrapping ? 'Confirming...' : 'Processing...'}
              </>
            ) : (
              <>
                <ArrowDownUp className="w-4 h-4 mr-2" />
                {mode === 'wrap' ? 'Wrap STT → WSOMNIA3009' : 'Unwrap WSOMNIA3009 → STT'}
              </>
            )}
          </Button>

          {/* Gas Info */}
          <div className="text-xs text-gray-500 text-center">
            <Info className="w-3 h-3 inline mr-1" />
            This transaction requires gas (~$0.05). After wrapping, all bets are gasless!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inline WSOMNIA Balance Display with Wrap Button
 * Use this in the betting UI to show balance and prompt wrapping if needed
 */
interface WSOMNIABalanceDisplayProps {
  requiredAmount?: string;
  onWrapClick?: () => void;
}

export function WSOMNIABalanceDisplay({ requiredAmount, onWrapClick }: WSOMNIABalanceDisplayProps) {
  const { wbnbBalance: _wbnbBalance, wbnbFormatted, isLoading } = useWSOMNIA();
  const [showModal, setShowModal] = useState(false);

  const wbnbNum = parseFloat(wbnbFormatted);
  const requiredNum = requiredAmount ? parseFloat(requiredAmount) : 0;
  const needsMore = requiredNum > 0 && wbnbNum < requiredNum;

  const handleWrapClick = () => {
    if (onWrapClick) {
      onWrapClick();
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className={`flex items-center justify-between p-3 rounded-lg ${
        needsMore ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
      }`}>
        <div>
          <p className="text-xs text-gray-500">Your WSOMNIA3009 Balance</p>
          <p className={`font-semibold ${needsMore ? 'text-yellow-700' : ''}`}>
            {isLoading ? '...' : `${wbnbNum.toFixed(4)} WSOMNIA3009`}
          </p>
          {needsMore && (
            <p className="text-xs text-yellow-600 mt-1">
              Need {(requiredNum - wbnbNum).toFixed(4)} more for this bet
            </p>
          )}
        </div>
        <Button 
          size="sm" 
          variant={needsMore ? 'default' : 'outline'}
          onClick={handleWrapClick}
        >
          {needsMore ? 'Wrap STT' : 'Manage'}
        </Button>
      </div>
      
      <WrapSOMNIAModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        requiredAmount={needsMore ? (requiredNum - wbnbNum + 0.001).toFixed(4) : undefined}
      />
    </>
  );
}
