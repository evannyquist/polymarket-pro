"use client";

import { useState } from "react";
import { useMarketBySlug } from "@/lib/marketBySlug";

export default function MarketSelector({
  selectedMarketId,
  onSelect,
}: {
  selectedMarketId: string | null;
  onSelect: (marketId: string) => void;
}) {
  const [slug, setSlug] = useState("");
  const { fetchMarket, loading, error, market } = useMarketBySlug();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    
    const result = await fetchMarket(slug.trim());
    if (result?.tokenId) {
      onSelect(result.tokenId);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-w-[300px]">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Enter market slug (e.g., fed-decision-in-october)"
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
      
      {market && (
        <div className="px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <p className="text-xs text-emerald-400 font-medium">{market.question}</p>
          <p className="text-xs text-gray-500 mt-1">
            Slug: {market.slug} • Condition ID: {market.id.substring(0, 20)}...
          </p>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-1">
        Tip: Find the slug from the Polymarket URL after <code className="text-gray-400">/event/</code> or <code className="text-gray-400">/market/</code>
      </p>
    </div>
  );
}
