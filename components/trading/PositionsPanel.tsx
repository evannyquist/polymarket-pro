"use client";

import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import type { Position, OpenOrder } from '@/lib/polymarket/clob-client';

export default function PositionsPanel() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      setOpenOrders([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch positions
        const positionsResponse = await fetch(`/api/trading/positions?address=${address}`);
        if (positionsResponse.ok) {
          const positionsData = await positionsResponse.json();
          setPositions(positionsData.positions || []);
        }

        // Fetch open orders
        const ordersResponse = await fetch(`/api/trading/open-orders?address=${address}`);
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          setOpenOrders(ordersData.orders || []);
        }
      } catch (error) {
        console.error('Error fetching trading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [address, isConnected]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted || !isConnected) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Positions */}
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Your Positions</h3>
        
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">No open positions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position, index) => (
              <div key={index} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-300 font-medium">{position.market}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    position.side === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {position.side}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Size: {position.size}</span>
                  <span className="text-white font-semibold">${position.value.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Orders */}
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Open Orders</h3>
        
        {loading ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        ) : openOrders.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400 text-sm">No open orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openOrders.map((order) => (
              <div key={order.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-300 font-medium">{order.market}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    order.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {order.side} {order.outcome}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white ml-1">${order.price.toFixed(3)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Size:</span>
                    <span className="text-white ml-1">{order.size}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

