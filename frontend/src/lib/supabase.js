import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});

// Stock symbols for simulated trading
export const STOCKS = {
  "AAPL": { name: "Apple Inc.", basePrice: 185.50 },
  "MSFT": { name: "Microsoft Corp.", basePrice: 378.25 },
  "GOOGL": { name: "Alphabet Inc.", basePrice: 141.80 },
  "AMZN": { name: "Amazon.com Inc.", basePrice: 178.90 },
  "TSLA": { name: "Tesla Inc.", basePrice: 248.50 },
  "NVDA": { name: "NVIDIA Corp.", basePrice: 495.75 },
  "META": { name: "Meta Platforms Inc.", basePrice: 505.30 },
  "JPM": { name: "JPMorgan Chase", basePrice: 198.40 },
  "V": { name: "Visa Inc.", basePrice: 275.60 },
  "WMT": { name: "Walmart Inc.", basePrice: 165.20 }
};

// Simulate stock price
export function simulatePrice(basePrice, volatility = 0.02) {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return parseFloat((basePrice * (1 + change)).toFixed(2));
}

// Get simulated stock data
export function getStockData() {
  return Object.entries(STOCKS).map(([symbol, info]) => {
    const price = simulatePrice(info.basePrice, 0.003);
    const open = simulatePrice(info.basePrice, 0.01);
    const change = price - open;
    const changePercent = (change / open) * 100;
    
    return {
      symbol,
      name: info.name,
      price,
      change: parseFloat(change.toFixed(2)),
      change_percent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat((Math.max(price, open) * 1.005).toFixed(2)),
      low: parseFloat((Math.min(price, open) * 0.995).toFixed(2)),
      open,
      volume: Math.floor(Math.random() * 40000000) + 1000000,
      timestamp: new Date().toISOString()
    };
  });
}

// Generate price history for charting
export function generatePriceHistory(symbol, minutes = 60) {
  if (!STOCKS[symbol]) return [];
  
  const basePrice = STOCKS[symbol].basePrice;
  const history = [];
  let price = basePrice * (0.98 + Math.random() * 0.04);
  
  for (let i = 0; i < minutes; i++) {
    const time = new Date(Date.now() - (minutes - i) * 60000);
    const open = price;
    const close = simulatePrice(open, 0.002);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);
    
    history.push({
      time: time.toTimeString().slice(0, 5),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 490000) + 10000
    });
    
    price = close;
  }
  
  return history;
}
