# Setup Instructions

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Vercel Postgres

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create a new one)
3. Go to Storage → Create Database → Postgres
4. Copy the connection string and environment variables
5. Add them to your `.env.local` file

### 3. Initialize Database Tables

In the Vercel Postgres dashboard:

1. Go to the "Query" tab
2. Paste and run the contents of `lib/db/schema.sql`
3. Verify tables are created:
```sql
SELECT * FROM pg_tables WHERE schemaname = 'public';
```

### 4. Configure Environment Variables

Create `.env.local`:

```bash
# Copy from Vercel Postgres dashboard
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NO_SSL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# Glassnode API Key (for DVOL volatility data)
# Get from https://studio.glassnode.com/settings/api
GLASSNODE_API_KEY="your-api-key-here"

# Optional: WalletConnect Project ID
# Get from https://cloud.walletconnect.com/
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Vercel Deployment

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### 2. Import to Vercel

1. Go to [Vercel](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js

### 3. Add Database

1. In project settings → Storage
2. Create Postgres database
3. Environment variables are automatically added

### 4. Deploy

Click "Deploy" - Vercel will build and deploy your app.

### 5. Enable Cron Jobs

Cron jobs are configured in `vercel.json` and will run automatically on Vercel:

- **Data Collection**: Every minute
  - Path: `/api/cron/collect-data`
  - Collects BTC and market prices from RTDS

- **Cleanup**: Every hour
  - Path: `/api/rtds/cleanup`
  - Removes records older than 24 hours

Verify cron jobs in: Project Settings → Cron Jobs

## Testing

### Test Database Connection

```bash
# In your browser console at http://localhost:3000
fetch('/api/rtds/collect-btc-price', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ price: 95000, source: 'test' })
}).then(r => r.json()).then(console.log)

# Check if it was stored
fetch('/api/rtds/collect-btc-price').then(r => r.json()).then(console.log)
```

### Test Volatility Calculation

```bash
# After collecting some price data
fetch('/api/rtds/btc-volatility-24h').then(r => r.json()).then(console.log)
```

### Test Trading API (requires wallet connection)

1. Connect your wallet
2. Enter an amount
3. Click BUY or SELL
4. Check browser console for logs

## Troubleshooting

### Database Connection Errors

**Error**: `relation "btc_prices" does not exist`
- Solution: Run the schema.sql file in Vercel Postgres dashboard

**Error**: `ECONNREFUSED`
- Solution: Check that POSTGRES_URL is set correctly in .env.local

### RTDS Connection Issues

**Error**: WebSocket connection fails
- Check browser console for detailed errors
- Polymarket RTDS might be temporarily unavailable
- Try refreshing the page

### Wallet Connection Issues

**Error**: "No injected provider found"
- Install MetaMask or another Web3 wallet
- Make sure you're on a supported browser (Chrome, Firefox, Brave)

**Error**: "Wrong network"
- Switch to Polygon network in your wallet
- Polygon Chain ID: 137

### Build Errors

**Error**: Module not found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error**: TypeScript errors
```bash
# Check TypeScript
npm run build
```

## Next Steps

1. **Collect Initial Data**: Let the app run for at least 1 hour to collect sufficient price history for volatility calculations

2. **Test Trading**: Connect a wallet (use a test wallet with small amounts first)

3. **Monitor Logs**: Check Vercel logs to ensure cron jobs are running correctly

4. **Customize**: Adjust the predictive model parameters in `lib/useProbabilityModel.ts` if needed

## Support

For issues or questions:
1. Check the main README.md
2. Review Polymarket documentation: https://docs.polymarket.com/
3. Check Vercel documentation: https://vercel.com/docs

