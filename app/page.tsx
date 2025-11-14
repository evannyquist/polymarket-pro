"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertsProvider } from "@/components/alerts/AlertsContext";
import AlertModal from "@/components/alerts/AlertModal";
import AlertsList from "@/components/alerts/AlertsList";
import MarketSelector from "@/components/market/MarketSelector";
import AppToaster from "@/components/ui/Toaster";
import { usePolymarketBTCPrice } from "@/lib/usePolymarketBTCPrice";
import { useModelPrediction } from "@/lib/useModelPrediction";
import CountdownTimer from "@/components/chart/CountdownTimer";

// SSR-safe dynamic import
const MarketChart = dynamic(() => import("@/components/chart/MockChart"), { ssr: false });
const BitcoinPriceChart = dynamic(() => import("@/components/chart/BitcoinPriceChart"), { ssr: false });

export default function Home() {
  const [open, setOpen] = useState(false);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [selectedMarketData, setSelectedMarketData] = useState<any>(null);
  const [eventMarketTokenIds, setEventMarketTokenIds] = useState<string[]>([]);
  const [latestMarketValue, setLatestMarketValue] = useState<{ t: number; v: number } | null>(null);
  
  // Get current Bitcoin price from Polymarket RTDS when we have a Bitcoin market
  const hasBitcoinMarket = !!selectedMarketData?.bitcoinPriceData;
  const currentBitcoinPrice = usePolymarketBTCPrice(hasBitcoinMarket);
  
  // Calculate actual chance of up
  const actualChanceOfUp = latestMarketValue ? Math.ceil(latestMarketValue.v * 100) : null;
  
  // Get model prediction
  const predictedChanceOfUp = useModelPrediction(actualChanceOfUp);
  
  // Calculate trading signal
  const getSignal = () => {
    if (actualChanceOfUp === null || predictedChanceOfUp === null) return null;
    
    const diff = Math.abs(actualChanceOfUp - predictedChanceOfUp);
    
    if (diff <= 1) {
      return { type: "NO OPP", color: "text-gray-400" };
    } else if (actualChanceOfUp < predictedChanceOfUp) {
      return { type: "BUY", color: "text-green-500" };
    } else {
      return { type: "SELL", color: "text-red-500" };
    }
  };
  
  const signal = getSignal();

  return (
    <AlertsProvider>
      <main className="min-h-screen bg-gradient-to-br from-[#0a0c10] via-[#0d0f14] to-[#0a0c10]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
                  Polymarket Pro
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  Live charts · Alerts · Pro analytics
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
                    Live Data
                  </span>
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  Set Alert
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-200" />
              </button>
            </div>
          </header>

          {/* Chart Section */}
          <section className="mb-8">
            <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex flex-col gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Price Chart</h2>
                    <p className="text-sm text-gray-400">Real-time odds visualization</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    {/* Left column: price to beat and chance of up */}
                    <div className="flex flex-col gap-3">
                      {selectedMarketData?.bitcoinPriceData && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 mb-0.5">price to beat</span>
                          <span className="text-xl font-bold text-gray-400 leading-none">
                            ${selectedMarketData.bitcoinPriceData.targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {latestMarketValue && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 mb-0.5">chance of up</span>
                          <span className="text-xl font-bold text-green-500 leading-none">
                            {Math.ceil(latestMarketValue.v * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Right column: current price and our prediction */}
                    <div className="flex flex-col gap-3 relative">
                      {currentBitcoinPrice !== null && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 mb-0.5">current price</span>
                          <span className="text-xl font-bold tabular-nums leading-none" style={{ color: '#f7931a' }}>
                            ${currentBitcoinPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {predictedChanceOfUp !== null && (
                        <div className="flex flex-col items-start">
                          <span className="text-xs text-gray-400 mb-0.5">our prediction</span>
                          <div className="flex items-baseline gap-2 leading-none">
                            <span className="text-xl font-bold text-blue-400">
                              {Math.round(predictedChanceOfUp)}%
                            </span>
                            {signal && (
                              <span className={`text-sm font-semibold ${signal.color}`}>
                                {signal.type}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Timer positioned to the right, vertically centered between current price and our prediction */}
                      {selectedMarketData?.question && (
                        <div className="absolute left-full ml-8 top-1/2 -translate-y-1/2">
                          <CountdownTimer marketQuestion={selectedMarketData?.question} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <MarketSelector 
                    selectedMarketId={selectedMarketId} 
                    onSelect={setSelectedMarketId}
                    onMarketData={setSelectedMarketData}
                    onEventMarkets={setEventMarketTokenIds}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                {/* Bitcoin Price Chart */}
                <div className="flex-1">
                  <BitcoinPriceChart 
                    targetPrice={selectedMarketData?.bitcoinPriceData?.targetPrice}
                    enabled={hasBitcoinMarket}
                  />
                </div>
                {/* Market Odds Chart */}
                <div className="flex-1">
                  <MarketChart 
                    marketId={selectedMarketId} 
                    marketData={selectedMarketData}
                    extraMarketTokenIds={eventMarketTokenIds}
                    onLatestChange={setLatestMarketValue}
                    predictedChance={predictedChanceOfUp}
                    signal={signal}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Alerts Section */}
          <section>
            <AlertsList />
          </section>
        </div>

        <AlertModal open={open} onClose={() => setOpen(false)} />
        <AppToaster />
      </main>
    </AlertsProvider>
  );
}
