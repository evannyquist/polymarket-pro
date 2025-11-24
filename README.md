# BTC 15-Minute Trading - Polymarket Pro

A professional trading application for Bitcoin 15-minute prediction markets on Polymarket, featuring real-time price tracking, predictive analytics using volatility modeling, and full trading capabilities.

## Features

- **Real-Time BTC Price Tracking**: Live Bitcoin price data via Polymarket RTDS
- **Predictive Analytics**: Probability calculations using historical volatility and Black-Scholes approach
- **Trading Integration**: Full wallet connection and order placement via Polymarket CLOB API
- **Database-Backed Data**: 24-hour price history storage using Vercel Postgres
- **Automated Data Collection**: Continuous RTDS data collection with automatic cleanup

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Charts**: Lightweight Charts
- **Wallet**: Wagmi, Viem (Polygon network)
- **Database**: Vercel Postgres
- **APIs**: Polymarket CLOB API, Polymarket RTDS WebSocket

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel account (for Postgres database)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in the following in `.env.local`:
- `POSTGRES_URL` and related variables (get from Vercel Postgres)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (optional, get from WalletConnect Cloud)

4. Initialize the database by running the SQL from `lib/db/schema.sql` in your Vercel Postgres dashboard

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## Database Setup

This application uses Vercel Postgres to store:
- Bitcoin price history (last 24 hours)
- Polymarket market price history (last 24 hours)

### Schema

The database has two main tables:
- `btc_prices`: Stores BTC price updates from RTDS
- `market_prices`: Stores Polymarket market odds over time

See `lib/db/schema.sql` for the complete schema.

### Data Collection

Data is collected in two ways:
1. **Client-side**: The app connects to Polymarket RTDS WebSocket in the browser
2. **Server-side**: Vercel Cron jobs run periodically to collect and clean up data

Configure cron jobs in `vercel.json`:
- Data collection: Every minute
- Cleanup: Every hour

## Trading

### Wallet Connection

The app supports:
- MetaMask (via injected connector)
- WalletConnect (requires project ID)

Connect your wallet to view positions and place orders.

### Order Placement

Orders are placed through the Polymarket CLOB API:
1. User enters amount and selects BUY/SELL
2. Order is signed using EIP-712 (wallet signature)
3. Order is submitted to Polymarket CLOB

**Note**: The current implementation has a placeholder for order signing. Full EIP-712 implementation requires Polymarket's order domain and types.

## Predictive Model

The app calculates the probability that BTC will be above the target price using:

- **Current BTC Price**: Real-time from RTDS
- **Target Price**: From the market question
- **Time Remaining**: Until the 15-minute period ends
- **24h Volatility**: Standard deviation of BTC returns

Formula:
```
z = ln(S/K) / (σ * sqrt(T))
probability = N(z)
```

Where:
- S = current price
- K = target price
- σ = volatility
- T = time in years
- N(z) = cumulative normal distribution

## API Routes

### RTDS Data Collection
- `POST /api/rtds/collect-btc-price` - Store BTC price
- `POST /api/rtds/collect-market-price` - Store market price
- `GET /api/rtds/btc-price-15m-ago` - Get BTC price from 15 min ago
- `GET /api/rtds/btc-volatility-24h` - Calculate 24h volatility
- `GET /api/rtds/market-price-history` - Get market price history
- `POST /api/rtds/cleanup` - Clean up old records

### Trading
- `POST /api/trading/place-order` - Place an order
- `GET /api/trading/open-orders` - Get user's open orders
- `GET /api/trading/positions` - Get user's positions
- `POST /api/trading/cancel-order` - Cancel an order

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy!

Vercel will automatically:
- Set up Postgres database (add via Vercel dashboard)
- Run cron jobs for data collection
- Deploy to edge functions

## Architecture

```
app/
├── api/              # API routes
│   ├── rtds/         # Data collection endpoints
│   └── trading/      # Trading endpoints
├── layout.tsx        # Root layout with Wagmi provider
└── page.tsx          # Main trading page

components/
├── chart/            # Chart components
├── trading/          # Trading UI components
└── Providers.tsx     # React Query + Wagmi providers

lib/
├── db/               # Database queries and schema
├── polymarket/       # Polymarket API client
├── useBTCVolatility.ts        # Volatility hook
├── useProbabilityModel.ts     # Probability calculation
└── wagmi-config.ts   # Wallet configuration
```

## Contributing

Contributions are welcome! Please open an issue or PR.

## License

MIT

## Disclaimer

This is an educational project. Trading involves risk. Always do your own research before trading.
