"use client";

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration errors by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg opacity-50 cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-lg transition-all flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
      >
        Connect Wallet
      </button>
      
      {showConnectors && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px]">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector });
                setShowConnectors(false);
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <span>{connector.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

