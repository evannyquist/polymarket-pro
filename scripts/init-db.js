require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to database...');
    
    // Create btc_prices table
    console.log('📊 Creating btc_prices table...');
    await sql`
      CREATE TABLE IF NOT EXISTS btc_prices (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        source VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create indexes for btc_prices
    console.log('📊 Creating indexes for btc_prices...');
    await sql`CREATE INDEX IF NOT EXISTS idx_btc_prices_timestamp ON btc_prices(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_btc_prices_created_at ON btc_prices(created_at DESC)`;
    
    // Create market_prices table
    console.log('📊 Creating market_prices table...');
    await sql`
      CREATE TABLE IF NOT EXISTS market_prices (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        token_id VARCHAR(100) NOT NULL,
        price DECIMAL(6, 5) NOT NULL,
        market_slug VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create indexes for market_prices
    console.log('📊 Creating indexes for market_prices...');
    await sql`CREATE INDEX IF NOT EXISTS idx_market_prices_timestamp ON market_prices(timestamp DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_market_prices_token_id ON market_prices(token_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_market_prices_created_at ON market_prices(created_at DESC)`;
    
    console.log('✅ Database initialized successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - btc_prices (with 2 indexes)');
    console.log('  - market_prices (with 3 indexes)');
    console.log('');
    console.log('🚀 Your database is ready to use!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();

