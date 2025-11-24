"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWalletClient } from 'wagmi';

interface TradingPanelProps {
  tokenId: string | null;
  currentPrice: number | null;
  predictedProbability: number | null;
  signal: { type: string; color: string } | null;
  targetPrice: number | null;
}

export default function TradingPanel({
  tokenId,
  currentPrice,
  predictedProbability,
  signal,
  targetPrice
}: TradingPanelProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState('10');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering wallet-dependent UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePlaceOrder = async (side: 'BUY' | 'SELL') => {
    if (!isConnected || !address || !tokenId || !walletClient) {
      setOrderResult({ success: false, message: 'Please connect your wallet first' });
      return;
    }

    setIsPlacingOrder(true);
    setOrderResult(null);

    try {
      // For simplicity, use market price (mid price between predicted and current market odds)
      // In production, you'd want to allow users to set limit prices
      const orderPrice = predictedProbability ? predictedProbability / 100 : 0.5;
      
      // Create order request
      const orderRequest = {
        tokenID: tokenId,
        price: orderPrice,
        size: parseFloat(amount),
        side,
        feeRateBps: 100, // 1% fee
        nonce: Date.now(),
        expiration: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
      };

      // TODO: Implement EIP-712 order signing with walletClient
      // This requires the Polymarket order domain and types
      // For now, we'll show a placeholder
      
      setOrderResult({ 
        success: false, 
        message: 'Order signing not yet implemented. Please use Polymarket directly for now.' 
      });

    } catch (error) {
      console.error('Error placing order:', error);
      setOrderResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to place order' 
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Show loading state during SSR and initial client hydration
  if (!mounted) {
    return (
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Trading Panel</h3>
        <div className="text-center py-8">
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Trading Panel</h3>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect your wallet to start trading</p>
        </div>
      </div>
    );
  }

  if (!tokenId) {
    return (
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Trading Panel</h3>
        <div className="text-center py-8">
          <p className="text-gray-400">Waiting for market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Trading Panel</h3>
      
      {/* Trading Signal */}
      {signal && (
        <div className={`mb-4 p-3 rounded-lg border ${
          signal.type === 'BUY' 
            ? 'bg-green-500/10 border-green-500/30' 
            : signal.type === 'SELL'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-gray-500/10 border-gray-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Trading Signal</span>
            <span className={`text-lg font-bold ${signal.color}`}>
              {signal.type}
            </span>
          </div>
          {predictedProbability !== null && (
            <div className="mt-2 text-xs text-gray-500">
              Model predicts {Math.round(predictedProbability)}% chance of BTC above ${targetPrice?.toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          step="1"
          className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter amount in USDC"
        />
      </div>

      {/* Trading Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handlePlaceOrder('BUY')}
          disabled={isPlacingOrder || !amount || parseFloat(amount) <= 0}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
        >
          {isPlacingOrder ? 'Processing...' : 'BUY YES'}
        </button>
        <button
          onClick={() => handlePlaceOrder('SELL')}
          disabled={isPlacingOrder || !amount || parseFloat(amount) <= 0}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
        >
          {isPlacingOrder ? 'Processing...' : 'BUY NO'}
        </button>
      </div>

      {/* Order Result */}
      {orderResult && (
        <div className={`mt-4 p-3 rounded-lg ${
          orderResult.success 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <p className="text-sm">{orderResult.message}</p>
        </div>
      )}

      {/* Market Info */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Current BTC Price</p>
            <p className="text-white font-semibold">
              {currentPrice ? `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-gray-400">Target Price</p>
            <p className="text-white font-semibold">
              {targetPrice ? `$${targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

