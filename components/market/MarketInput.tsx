"use client";

import { useState } from "react";

export default function MarketInput({
  onSelect,
}: {
  onSelect: (marketId: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSelect(inputValue.trim());
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter condition ID or token ID (0x...)"
          className="flex-1 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono"
        />
        <button
          type="submit"
          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200"
        >
          Load
        </button>
      </form>
      <div className="mt-2 text-xs text-gray-500 space-y-1">
        <p>💡 <strong>How to get a market ID:</strong></p>
        <ol className="list-decimal list-inside ml-2 space-y-1">
          <li>Go to <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">polymarket.com</a></li>
          <li>Open any market page</li>
          <li>Open browser DevTools (F12) → Network tab</li>
          <li>Look for API calls to find the <code className="bg-gray-800 px-1 rounded">condition_id</code> or <code className="bg-gray-800 px-1 rounded">token_id</code></li>
          <li>Or check the page source for "conditionId" or "tokenId"</li>
        </ol>
        <p className="mt-2 text-yellow-400">⚠️ You can use either a condition ID or token ID - the app will try to resolve it automatically.</p>
      </div>
    </div>
  );
}

