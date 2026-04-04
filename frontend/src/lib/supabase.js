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
    detectSessionInUrl: false
  }
});

// Stock symbols for simulated trading with individual characteristics
export const STOCKS = {
  "AAPL": { name: "Apple Inc.", basePrice: 185.50, volatility: 0.012, drift: 0.0003 },
  "MSFT": { name: "Microsoft Corp.", basePrice: 378.25, volatility: 0.010, drift: 0.0005 },
  "GOOGL": { name: "Alphabet Inc.", basePrice: 141.80, volatility: 0.015, drift: 0.0002 },
  "AMZN": { name: "Amazon.com Inc.", basePrice: 178.90, volatility: 0.018, drift: -0.0001 },
  "TSLA": { name: "Tesla Inc.", basePrice: 248.50, volatility: 0.020, drift: 0.0001 },
  "NVDA": { name: "NVIDIA Corp.", basePrice: 495.75, volatility: 0.016, drift: 0.0008 },
  "META": { name: "Meta Platforms Inc.", basePrice: 505.30, volatility: 0.014, drift: 0.0004 },
  "JPM": { name: "JPMorgan Chase", basePrice: 198.40, volatility: 0.008, drift: 0.0002 },
  "V": { name: "Visa Inc.", basePrice: 275.60, volatility: 0.009, drift: 0.0003 },
  "WMT": { name: "Walmart Inc.", basePrice: 165.20, volatility: 0.008, drift: 0.0001 }
};

// Persistent state for random walk simulation
const stockState = {};
let tickCount = 0;
let sessionStartTime = Date.now();

// Initialize stock state
function initializeStockState() {
  Object.entries(STOCKS).forEach(([symbol, info]) => {
    if (!stockState[symbol]) {
      stockState[symbol] = {
        currentPrice: info.basePrice,
        openPrice: info.basePrice,
        dayHigh: info.basePrice,
        dayLow: info.basePrice,
        volume: 0
      };
    }
  });
}

// Box-Muller transform for standard normal distribution
function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Simulate stock price using random walk
export function simulatePrice(symbol) {
  initializeStockState();
  
  const stock = STOCKS[symbol];
  const state = stockState[symbol];
  const currentPrice = state.currentPrice;
  
  // Calculate new price using random walk: newPrice = currentPrice * (1 + drift + volatility * randomNormal())
  const normalRandom = randomNormal();
  let priceChange = stock.drift + stock.volatility * normalRandom;
  
  // Cap maximum single-tick change at ±8%
  priceChange = Math.max(-0.08, Math.min(0.08, priceChange));
  
  // Check for news event (15% chance every 60 seconds = every 12 ticks)
  if (tickCount > 0 && tickCount % 12 === 0 && Math.random() < 0.15) {
    const newsShock = (Math.random() - 0.5) * 0.10; // ±5%
    priceChange += newsShock;
    // Re-cap after news event
    priceChange = Math.max(-0.08, Math.min(0.08, priceChange));
  }
  
  const newPrice = currentPrice * (1 + priceChange);
  
  // Update persistent state
  state.currentPrice = parseFloat(newPrice.toFixed(2));
  state.dayHigh = Math.max(state.dayHigh, state.currentPrice);
  state.dayLow = Math.min(state.dayLow, state.currentPrice);
  state.volume += Math.floor(Math.random() * 500000) + 50000;
  
  return state.currentPrice;
}

// Get simulated stock data
export function getStockData() {
  initializeStockState();
  tickCount++;
  
  return Object.entries(STOCKS).map(([symbol, info]) => {
    const price = simulatePrice(symbol);
    const state = stockState[symbol];
    const change = price - state.openPrice;
    const changePercent = (change / state.openPrice) * 100;
    
    return {
      symbol,
      name: info.name,
      price,
      change: parseFloat(change.toFixed(2)),
      change_percent: parseFloat(changePercent.toFixed(2)),
      high: state.dayHigh,
      low: state.dayLow,
      open: state.openPrice,
      volume: state.volume,
      timestamp: new Date().toISOString()
    };
  });
}

// Reset stock state (for new trading day simulation)
export function resetStockState() {
  Object.keys(stockState).forEach(symbol => {
    const currentPrice = stockState[symbol].currentPrice;
    stockState[symbol] = {
      currentPrice,
      openPrice: currentPrice,
      dayHigh: currentPrice,
      dayLow: currentPrice,
      volume: 0
    };
  });
  tickCount = 0;
}

// Generate price history for charting using random walk
export function generatePriceHistory(symbol, minutes = 60) {
  if (!STOCKS[symbol]) return [];
  
  const stock = STOCKS[symbol];
  const history = [];
  let price = stock.basePrice * (0.98 + Math.random() * 0.04);
  
  for (let i = 0; i < minutes; i++) {
    const time = new Date(Date.now() - (minutes - i) * 60000);
    const open = price;
    
    // Use random walk for historical data too
    const normalRandom = randomNormal();
    let priceChange = stock.drift + stock.volatility * normalRandom;
    priceChange = Math.max(-0.08, Math.min(0.08, priceChange));
    
    const close = open * (1 + priceChange);
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
