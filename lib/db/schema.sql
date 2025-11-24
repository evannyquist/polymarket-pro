-- Bitcoin price data from RTDS
CREATE TABLE IF NOT EXISTS btc_prices (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'chainlink' or 'binance'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast timestamp queries
CREATE INDEX IF NOT EXISTS idx_btc_prices_timestamp ON btc_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_btc_prices_created_at ON btc_prices(created_at DESC);

-- Polymarket market price data from RTDS
CREATE TABLE IF NOT EXISTS market_prices (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  token_id VARCHAR(100) NOT NULL,
  price DECIMAL(6, 5) NOT NULL, -- Market probability (0-1)
  market_slug VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_market_prices_timestamp ON market_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_prices_token_id ON market_prices(token_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_created_at ON market_prices(created_at DESC);

-- Auto-delete old records (older than 24 hours)
-- This will be handled by a cron job or periodic cleanup function


