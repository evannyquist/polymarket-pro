"use client";

import { useState } from "react";
import { useMarketBySlug, type EventMarket } from "@/lib/marketBySlug";
import type { Market } from "@/lib/markets";

export default function MarketSelector({
  selectedMarketId,
  onSelect,
  onMarketData,
  onEventMarkets,
}: {
  selectedMarketId: string | null;
  onSelect: (marketId: string) => void;
  onMarketData?: (market: any) => void;
  onEventMarkets?: (tokenIds: string[]) => void;
}) {
  const [slug, setSlug] = useState("");
  const [selectedEventMarketIndex, setSelectedEventMarketIndex] = useState<number | null>(null);
  const { fetchMarket, loading, error, market, eventData } = useMarketBySlug();

  // Extract slug from Polymarket URL
  const extractSlugFromUrl = (input: string): string => {
    const trimmed = input.trim();
    
    // Check if it's a URL (contains http:// or https://)
    if (trimmed.includes("http://") || trimmed.includes("https://")) {
      try {
        const url = new URL(trimmed);
        const pathname = url.pathname;
        
        // Match pattern: /event/... or /events/... or /market/...
        const match = pathname.match(/\/(?:event|events|market)\/([^/?]+)/);
        if (match && match[1]) {
          return match[1];
        }
      } catch (e) {
        // If URL parsing fails, try regex directly
        const match = trimmed.match(/\/(?:event|events|market)\/([^/?]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    
    // If not a URL or extraction failed, return the input as-is
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    
    // Reset selection when loading new slug
    setSelectedEventMarketIndex(null);
    
    // Extract slug from URL if needed
    const cleanSlug = extractSlugFromUrl(slug.trim());
    const result = await fetchMarket(cleanSlug);
    
    // If it's an event, select the first market by default
    if (result.event && result.event.markets.length > 0) {
      const firstMarket = result.event.markets[0];
      setSelectedEventMarketIndex(0);
      onSelect(firstMarket.tokenId);
      
      // Create a Market object for the first market
      const marketData: Market & { bitcoinPriceData?: any } = {
        id: firstMarket.conditionId || firstMarket.tokenId,
        tokenId: firstMarket.tokenId,
        question: firstMarket.question,
        slug: firstMarket.slug || slug,
        active: true,
        bestBid: firstMarket.bestBid,
        bestAsk: firstMarket.bestAsk,
        lastTradePrice: firstMarket.lastTradePrice,
        bitcoinPriceData: firstMarket.bitcoinPriceData,
      };
      
      if (onMarketData) {
        onMarketData(marketData);
      }
      if (onEventMarkets) {
        onEventMarkets(result.event.markets.map((m) => m.tokenId));
      }
    } else if (result.market?.tokenId) {
      // Single market
      setSelectedEventMarketIndex(null);
      onSelect(result.market.tokenId);
      if (onMarketData) {
        onMarketData(result.market);
      }
      if (onEventMarkets) {
        onEventMarkets([]);
      }
    } else {
      // Failed to load market/event
      setSelectedEventMarketIndex(null);
      if (onEventMarkets) {
        onEventMarkets([]);
      }
    }
  };

  const handleEventMarketSelect = (eventMarket: EventMarket, index: number) => {
    setSelectedEventMarketIndex(index);
    onSelect(eventMarket.tokenId);
    
    // Create a Market object for the selected market
    const marketData: Market & { bitcoinPriceData?: any } = {
      id: eventMarket.conditionId || eventMarket.tokenId,
      tokenId: eventMarket.tokenId,
      question: eventMarket.question,
      slug: eventMarket.slug || slug,
      active: true,
      bestBid: eventMarket.bestBid,
      bestAsk: eventMarket.bestAsk,
      lastTradePrice: eventMarket.lastTradePrice,
      bitcoinPriceData: eventMarket.bitcoinPriceData,
    };
    
    if (onMarketData) {
      onMarketData(marketData);
    }
    if (onEventMarkets) {
      onEventMarkets(eventData?.markets.map((m) => m.tokenId) ?? []);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[300px]">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Enter market slug or URL (e.g., bitcoin-up-or-down-november-12-10pm-et)"
          className="flex-1 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
        <button
          type="submit"
          disabled={loading || !slug.trim()}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </form>
      
      {error && (
        <div className="px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}
      
      {/* Event with multiple markets */}
      {eventData && eventData.markets.length > 0 && (
        <div className="space-y-3">
          <div className="px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-xs text-emerald-400 font-medium">{eventData.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              Event with {eventData.markets.length} market{eventData.markets.length !== 1 ? "s" : ""}
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">Select a market to plot:</p>
            <div className="flex flex-wrap gap-2">
              {eventData.markets.map((eventMarket, index) => (
                <button
                  key={index}
                  onClick={() => handleEventMarketSelect(eventMarket, index)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    selectedEventMarketIndex === index
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-gray-800/50 text-gray-300 border border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-800/70"
                  }`}
                >
                  {eventMarket.question}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Single market */}
      {market && !eventData && (
        <div className="px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-medium">{market.question}</p>
          <p className="text-xs text-gray-500 mt-1">
            Slug: {market.slug} • Condition ID: {market.id.substring(0, 20)}...
          </p>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-1">
        Tip: You can paste the full Polymarket URL or just the slug (e.g., <code className="text-gray-400">bitcoin-up-or-down-november-12-10pm-et</code>)
      </p>
    </div>
  );
}
