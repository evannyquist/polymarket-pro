"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useChainlinkBTCPrice } from "@/lib/useChainlinkBTCPrice";
import { useProbabilityModel } from "@/lib/useProbabilityModel";
import { useVolatilitySource, type VolatilitySource } from "@/lib/useVolatilitySource";
import CountdownTimer from "@/components/chart/CountdownTimer";
import { generateCurrentBTC15MinSlug } from "@/lib/slugGenerator";
import { useMarketBySlug } from "@/lib/marketBySlug";
import WalletButton from "@/components/trading/WalletButton";
import TradingPanel from "@/components/trading/TradingPanel";
import PositionsPanel from "@/components/trading/PositionsPanel";
import VolatilityInput from "@/components/trading/VolatilityInput";

// SSR-safe dynamic import
const MarketChart = dynamic(() => import("@/components/chart/MockChart"), { ssr: false });
const BitcoinPriceChart = dynamic(() => import("@/components/chart/BitcoinPriceChart"), { ssr: false });

export default function Home() {
  const [selectedMarketData, setSelectedMarketData] = useState<any>(null);
  const [latestMarketValue, setLatestMarketValue] = useState<{ t: number; v: number } | null>(null);
  const [periodEndTime, setPeriodEndTime] = useState<Date | null>(null);
  const [volatilitySource, setVolatilitySource] = useState<VolatilitySource>('dvol'); // Default to DVOL
  const [manualVolatility, setManualVolatility] = useState<number>(0.60); // Default to 60% annualized vol
  const { fetchMarket } = useMarketBySlug();
  
  // Auto-load the current BTC 15m market
  useEffect(() => {
    let isMounted = true;
    
    const loadCurrentMarket = async () => {
      const result = generateCurrentBTC15MinSlug();
      
      console.log('Current BTC 15m period:', {
        slug: result.slug,
        timestamp: result.timestamp,
        periodStart: result.periodStart.toISOString(),
        periodEnd: result.periodEnd.toISOString()
      });
      
      // Store the period end time for probability calculations
      if (isMounted) {
        setPeriodEndTime(result.periodEnd);
      }
      
      try {
        const marketResult = await fetchMarket(result.slug);
        
        if (!isMounted) return;
        
        if (marketResult.market) {
          console.log('Loaded market:', marketResult.market);
          setSelectedMarketData(marketResult.market);
        } else if (marketResult.event && marketResult.event.markets.length > 0) {
          const firstMarket = marketResult.event.markets[0];
          console.log('Loaded event market:', firstMarket);
          setSelectedMarketData(firstMarket);
        }
      } catch (error) {
        console.error('Failed to load current market:', error);
      }
    };

    // Load the current market initially
    loadCurrentMarket();

    // Set up interval to check and reload when the 15-minute period changes
    const checkInterval = setInterval(() => {
      const newSlug = generateCurrentBTC15MinSlug().slug;
      const currentSlug = selectedMarketData?.slug;
      
      if (currentSlug && newSlug !== currentSlug) {
        console.log('15m period changed, reloading market:', newSlug);
        loadCurrentMarket();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(checkInterval);
    };
  }, [selectedMarketData?.slug]);

  // Get current Bitcoin price from Chainlink (via RTDS)
  const hasBitcoinMarket = !!selectedMarketData?.bitcoinPriceData;
  const { currentPrice: currentBitcoinPrice } = useChainlinkBTCPrice(hasBitcoinMarket);
  
  // Fetch volatility from selected source
  const { volatility: fetchedVolatility, loading: volLoading, error: volError } = useVolatilitySource({
    source: volatilitySource,
    manualValue: manualVolatility,
  });
  
  // Use fetched volatility if available, otherwise fallback to manual
  const effectiveVolatility = fetchedVolatility ?? manualVolatility;

  // Debug: Log when selectedMarketData changes
  useEffect(() => {
    if (selectedMarketData) {
      console.log("=== PAGE: selectedMarketData updated ===");
      console.log("Question:", selectedMarketData.question);
      console.log("Slug:", selectedMarketData.slug);
      console.log("Token ID:", selectedMarketData.tokenId);
      console.log("Has Bitcoin Data:", !!selectedMarketData.bitcoinPriceData);
      console.log("Target Price:", selectedMarketData.bitcoinPriceData?.targetPrice);
      console.log("Current Price:", selectedMarketData.bitcoinPriceData?.currentPrice);
      console.log("Full Bitcoin Data:", selectedMarketData.bitcoinPriceData);
      console.log("===================");
    }
  }, [selectedMarketData]);
  
  // Calculate actual chance of up (from Polymarket market odds)
  const actualChanceOfUp = latestMarketValue ? Math.ceil(latestMarketValue.v * 100) : null;
  
  // Calculate our predicted probability using lognormal model
  // Using effective volatility from selected source
  const predictedChanceOfUp = useProbabilityModel({
    currentPrice: currentBitcoinPrice,
    targetPrice: selectedMarketData?.bitcoinPriceData?.targetPrice || null,
    periodEndTime,
    volatility: effectiveVolatility
  });
  
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
    <main className="min-h-screen bg-gradient-to-br from-[#0a0c10] via-[#0d0f14] to-[#0a0c10]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
                  BTC 15-Min Trading
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">
                  Real-time Bitcoin price tracking with predictive analytics
                  <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium">
                    Live Data
                  </span>
                </p>
              </div>
              <div>
                <WalletButton />
              </div>
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
                    marketId={selectedMarketData?.tokenId || null} 
                    marketData={selectedMarketData}
                    extraMarketTokenIds={[]}
                    onLatestChange={setLatestMarketValue}
                    predictedChance={predictedChanceOfUp}
                    signal={signal}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Trading and Volatility Section */}
          <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TradingPanel
              tokenId={selectedMarketData?.tokenId || null}
              currentPrice={currentBitcoinPrice}
              predictedProbability={predictedChanceOfUp}
              signal={signal}
              targetPrice={selectedMarketData?.bitcoinPriceData?.targetPrice || null}
            />
            <VolatilityInput
              source={volatilitySource}
              manualValue={manualVolatility}
              onSourceChange={setVolatilitySource}
              onManualChange={setManualVolatility}
              actualVolatility={fetchedVolatility}
              loading={volLoading}
              error={volError}
            />
          </section>

          {/* Positions Section */}
          <section>
            <PositionsPanel />
          </section>
        </div>
      </main>
  );
}
