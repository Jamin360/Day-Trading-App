-- DayTradingPro Supabase Schema
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS TABLE ====================
-- Note: Supabase Auth handles user authentication
-- We'll create a profiles table to extend the auth.users table

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==================== TRADES TABLE ====================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(12, 2) NOT NULL CHECK (price > 0),
  total DECIMAL(12, 2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==================== POSITIONS TABLE ====================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  avg_price DECIMAL(12, 2) NOT NULL CHECK (avg_price > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);

-- Enable Row Level Security
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for positions
CREATE POLICY "Users can view own positions" ON positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own positions" ON positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own positions" ON positions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own positions" ON positions
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== JOURNAL TABLE ====================
CREATE TABLE IF NOT EXISTS journal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  symbol TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish', 'neutral')),
  lessons TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_symbol ON journal(symbol);
CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal(created_at DESC);

-- Enable Row Level Security
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

-- RLS Policies for journal
CREATE POLICY "Users can view own journal entries" ON journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries" ON journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries" ON journal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries" ON journal
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== TRIGGERS ====================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_updated_at BEFORE UPDATE ON journal
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== FUNCTIONS ====================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    100000.00
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==================== VIEWS ====================

-- View for portfolio summary
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT 
  user_id,
  COUNT(*) as total_positions,
  COALESCE(SUM(quantity * avg_price), 0) as cost_basis
FROM positions
GROUP BY user_id;

-- View for trade statistics
CREATE OR REPLACE VIEW trade_statistics AS
SELECT 
  user_id,
  COUNT(*) as total_trades,
  COUNT(*) FILTER (WHERE action = 'buy') as buy_trades,
  COUNT(*) FILTER (WHERE action = 'sell') as sell_trades,
  COALESCE(SUM(total), 0) as total_volume,
  COALESCE(AVG(total), 0) as avg_trade_size
FROM trades
GROUP BY user_id;

-- ==================== COMMENTS ====================

COMMENT ON TABLE profiles IS 'User profile information extending Supabase auth.users';
COMMENT ON TABLE trades IS 'Historical record of all buy/sell trades';
COMMENT ON TABLE positions IS 'Current stock positions held by users';
COMMENT ON TABLE journal IS 'Trading journal entries for reflection and learning';
