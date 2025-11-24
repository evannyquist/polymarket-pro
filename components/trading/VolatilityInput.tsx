"use client";

import { useState, useEffect } from 'react';
import type { VolatilitySource } from '@/lib/useVolatilitySource';

interface VolatilityInputProps {
  source: VolatilitySource;
  manualValue: number;
  onSourceChange: (source: VolatilitySource) => void;
  onManualChange: (value: number) => void;
  actualVolatility: number | null;
  loading?: boolean;
  error?: string | null;
}

const SOURCE_INFO = {
  manual: {
    label: 'Manual Input',
    description: 'Set your own volatility assumption',
  },
  dvol: {
    label: 'Deribit DVOL',
    description: '30-day forward-looking implied vol (best for prediction markets)',
  },
  'binance-atm-iv': {
    label: 'Binance ATM IV',
    description: 'At-the-money implied vol (best for short-term accuracy)',
  },
};

export default function VolatilityInput({
  source,
  manualValue,
  onSourceChange,
  onManualChange,
  actualVolatility,
  loading = false,
  error = null,
}: VolatilityInputProps) {
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState(String(Math.round(manualValue * 100)));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInputValue(String(Math.round(manualValue * 100)));
  }, [manualValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 200) {
      onManualChange(numValue / 100);
    }
  };

  const presets = [
    { label: '40%', value: 0.40 },
    { label: '60%', value: 0.60 },
    { label: '80%', value: 0.80 },
  ];

  const displayVolatility = actualVolatility ?? manualValue;
  const displayPercentage = Math.round(displayVolatility * 100);

  if (!mounted) {
    return (
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Volatility</h3>
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Volatility Model</h3>
        <span className="text-xs text-gray-500">Annualized</span>
      </div>

      {/* Source Dropdown */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          Volatility Source
        </label>
        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value as VolatilitySource)}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {Object.entries(SOURCE_INFO).map(([key, info]) => (
            <option key={key} value={key}>
              {info.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          {SOURCE_INFO[source].description}
        </p>
      </div>

      {/* Manual Input Field (only enabled when source is 'manual') */}
      <div className="mb-4">
        <label className="block text-sm text-gray-400 mb-2">
          {source === 'manual' ? 'Volatility (%)' : 'Current Value'}
        </label>
        <div className="relative">
          <input
            type="number"
            value={source === 'manual' ? inputValue : displayPercentage}
            onChange={handleInputChange}
            disabled={source !== 'manual'}
            min="1"
            max="200"
            step="1"
            className={`w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              source !== 'manual' ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">%</span>
        </div>
        {loading && source !== 'manual' && (
          <p className="mt-1 text-xs text-blue-400">Loading {SOURCE_INFO[source].label}...</p>
        )}
        {error && source !== 'manual' && (
          <p className="mt-1 text-xs text-yellow-400">⚠️ {error} (using fallback)</p>
        )}
        {!error && !loading && source !== 'manual' && actualVolatility && (
          <p className="mt-1 text-xs text-green-400">✓ Live from {SOURCE_INFO[source].label}</p>
        )}
      </div>

      {/* Quick Preset Buttons (only for manual) */}
      {source === 'manual' && (
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Quick Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => onManualChange(preset.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  Math.abs(manualValue - preset.value) < 0.01
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1 pt-4 border-t border-gray-800">
        <p className="font-semibold text-gray-400 mb-2">💡 About Volatility:</p>
        <p>• Higher vol = wider price swings expected</p>
        <p>• 40% = calm market conditions</p>
        <p>• 60% = typical BTC volatility</p>
        <p>• 80% = high volatility environment</p>
      </div>
    </div>
  );
}
