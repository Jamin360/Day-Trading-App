# Day Trading App - Supabase Migration

This app has been migrated from MongoDB backend to Supabase (PostgreSQL).

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for your project to finish setting up

### 2. Run the SQL Schema

1. Open your Supabase project dashboard
2. Go to the SQL Editor (left sidebar)
3. Copy the contents of `supabase-schema.sql`
4. Paste and run it in the SQL Editor

This will create all the necessary tables:
- `profiles` - User profile information
- `trades` - Trade history
- `positions` - Current stock positions
- `journal` - Trading journal entries

### 3. Configure Environment Variables

1. Copy `frontend/.env.example` to `frontend/.env`
2. Get your Supabase credentials:
   - Go to Project Settings → API
   - Copy the `Project URL` and `anon/public` key
3. Update your `.env` file with these values:

```env
REACT_APP_SUPABASE_URL=your_project_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Install Dependencies & Run

```bash
cd frontend
npm install
npm start
```

## Database Schema

### Tables

**profiles**
- Extends Supabase auth.users
- Stores user balance and metadata
- Automatically created when user signs up

**trades**
- Records all buy/sell transactions
- Linked to user via user_id
- Includes symbol, action, quantity, price, total, timestamp

**positions**
- Current stock holdings
- One row per symbol per user
- Tracks quantity and average price

**journal**
- Trading journal entries
- Can be linked to specific trades (optional)
- Includes sentiment tracking (bullish/bearish/neutral)

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Users cannot view or modify other users' records

## Features

- ✅ Real-time stock price simulation
- ✅ Buy/sell trading with virtual $100k starting balance
- ✅ Portfolio tracking with P&L calculations
- ✅ Trade history with filtering and CSV export
- ✅ Trading journal with sentiment analysis
- ✅ Performance analytics and statistics
- ✅ Secure authentication via Supabase Auth
- ✅ Row-level security for data protection

## Stock Simulation

The app simulates 10 stocks:
- AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META, JPM, V, WMT

Prices are simulated client-side with realistic volatility and are refreshed every 5 seconds.

## Deployment

To deploy to GitHub Pages:

```bash
npm run build
npm run deploy
```

The app is configured for deployment at: https://jamin360.github.io/Day-Trading-App/
