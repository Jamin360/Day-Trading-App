import { useState, useEffect, useRef } from "react";
import { useAuth, supabase } from "@/App";
import { useSearchParams } from "react-router-dom";
import { getStockData, generatePriceHistory } from "@/lib/supabase";
import { executeTrade, getPortfolio } from "@/lib/trading";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Minus,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

export default function Trading() {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [positions, setPositions] = useState([]);
  const [balance, setBalance] = useState(0);

  // Store chart history for all stocks
  const chartHistories = useRef({});

  // Derive selected stock from stocks array (never stale)
  const selected = stocks.find(s => s.symbol === selectedSymbol) ?? stocks[0];
  
  // Derive chart data for selected stock
  const chartData = chartHistories.current[selectedSymbol] || [];
  
  const [orderType, setOrderType] = useState("buy");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const fetchStocks = async () => {
    try {
      const stocksData = getStockData();
      
      // Use functional updater to avoid stale closure
      setStocks(prev => {
        // Append new data point to every stock's chart history
        stocksData.forEach(stock => {
          if (!chartHistories.current[stock.symbol]) {
            chartHistories.current[stock.symbol] = [];
          }
          
          const now = new Date();
          const timeStr = now.toTimeString().slice(0, 5);
          
          chartHistories.current[stock.symbol].push({
            time: timeStr,
            open: stock.open,
            high: stock.high,
            low: stock.low,
            close: stock.price,
            volume: stock.volume
          });
          
          // Keep only last 60 minutes of data
          if (chartHistories.current[stock.symbol].length > 60) {
            chartHistories.current[stock.symbol].shift();
          }
        });
        
        return stocksData;
      });
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      if (!user?.id) return;
      const portfolio = await getPortfolio(user.id);
      setPositions(portfolio.positions);
      setBalance(portfolio.balance);
      updateUser({ balance: portfolio.balance });
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Initialize chart histories with historical data for all stocks
      const stocksData = getStockData();
      stocksData.forEach(stock => {
        chartHistories.current[stock.symbol] = generatePriceHistory(stock.symbol, 60);
      });
      
      await Promise.all([fetchStocks(), fetchPortfolio()]);
      
      // Set initial selected stock from URL param or first stock
      const symbolParam = searchParams.get("symbol");
      if (symbolParam) {
        setSelectedSymbol(symbolParam);
      }
      
      setLoading(false);
    };
    init();

    // Set up polling for live updates
    const stockInterval = setInterval(fetchStocks, 5000);
    const portfolioInterval = setInterval(fetchPortfolio, 10000);
    
    return () => {
      clearInterval(stockInterval);
      clearInterval(portfolioInterval);
    };
  }, []);

  const handleStockSelect = (stock) => {
    setSelectedSymbol(stock.symbol);
    setQuantity(1);
  };

  const handleTrade = async () => {
    if (!selected || quantity <= 0 || !user?.id) return;

    setExecuting(true);
    try {
      await executeTrade(
        user.id,
        selected.symbol,
        orderType,
        quantity,
        selected.price
      );

      toast.success(`${orderType === 'buy' ? 'Bought' : 'Sold'} ${quantity} shares of ${selected.symbol}`);
      fetchPortfolio();
      setQuantity(1);
    } catch (error) {
      const message = error.message || `Failed to ${orderType}`;
      toast.error(message);
    } finally {
      setExecuting(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const totalCost = selected ? selected.price * quantity : 0;
  const canBuy = orderType === "buy" && totalCost <= balance;
  const position = positions.find(p => p.symbol === selected?.symbol);
  const canSell = orderType === "sell" && position && position.quantity >= quantity;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#18181b] border border-zinc-700 p-3 rounded-sm text-xs">
          <div className="font-mono text-zinc-400 mb-1">{data.time}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-zinc-500">Open:</span>
            <span className="font-mono text-white">{formatCurrency(data.open)}</span>
            <span className="text-zinc-500">High:</span>
            <span className="font-mono text-emerald-500">{formatCurrency(data.high)}</span>
            <span className="text-zinc-500">Low:</span>
            <span className="font-mono text-rose-500">{formatCurrency(data.low)}</span>
            <span className="text-zinc-500">Close:</span>
            <span className="font-mono text-white">{formatCurrency(data.close)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-zinc-400">Loading trading view...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-12 gap-1 p-1 bg-[#09090b]" data-testid="trading-page">
      {/* Watchlist / Positions - Left Column */}
      <div className="lg:col-span-3 xl:col-span-2 bg-[#121214] border border-zinc-800 rounded-sm overflow-hidden flex flex-col">
        <Tabs defaultValue="watchlist" className="flex flex-col h-full">
          <TabsList className="w-full grid grid-cols-2 bg-[#09090b] rounded-none p-1">
            <TabsTrigger value="watchlist" className="text-xs">Watchlist</TabsTrigger>
            <TabsTrigger value="positions" className="text-xs">Positions</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            {/* Watchlist Tab Content */}
            <div className="divide-y divide-zinc-800">
              {stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => handleStockSelect(stock)}
                  className={`p-3 cursor-pointer transition-colors duration-150 ${
                    selected?.symbol === stock.symbol 
                      ? 'bg-blue-500/10 border-l-2 border-l-blue-500' 
                      : 'hover:bg-white/[0.02]'
                  }`}
                  data-testid={`watchlist-${stock.symbol}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white text-sm">{stock.symbol}</div>
                      <div className="text-xs text-zinc-500 truncate max-w-[100px]">{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white">{formatCurrency(stock.price)}</div>
                      <div className={`font-mono text-xs flex items-center justify-end gap-0.5 ${
                        stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatPercent(stock.change_percent)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Tabs>
      </div>

      {/* Chart - Center Column */}
      <div className="lg:col-span-6 xl:col-span-7 bg-[#121214] border border-zinc-800 rounded-sm flex flex-col">
        {selected && (
          <>
            {/* Chart Header */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-heading font-bold text-xl text-white">{selected.symbol}</h2>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-sm ${
                      selected.change >= 0 
                        ? 'bg-emerald-500/10 text-emerald-500' 
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {selected.change >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                      {formatPercent(selected.change_percent)}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-500">{selected.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-white">{formatCurrency(selected.price)}</div>
                  <div className={`font-mono text-sm ${
                    selected.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {selected.change >= 0 ? '+' : ''}{formatCurrency(selected.change)}
                  </div>
                </div>
              </div>

              {/* Stock Stats */}
              <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Open</span>
                  <div className="font-mono text-zinc-300">{formatCurrency(selected.open)}</div>
                </div>
                <div>
                  <span className="text-zinc-500">High</span>
                  <div className="font-mono text-emerald-500">{formatCurrency(selected.high)}</div>
                </div>
                <div>
                  <span className="text-zinc-500">Low</span>
                  <div className="font-mono text-rose-500">{formatCurrency(selected.low)}</div>
                </div>
                <div>
                  <span className="text-zinc-500">Volume</span>
                  <div className="font-mono text-zinc-300">{(selected.volume / 1000000).toFixed(2)}M</div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 p-4" data-testid="price-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis 
                    dataKey="time" 
                    stroke="#52525b" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine 
                    y={chartData[0]?.open} 
                    stroke="#3f3f46" 
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={selected.change >= 0 ? "#22c55e" : "#ef4444"}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: selected.change >= 0 ? "#22c55e" : "#ef4444" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Live Indicator */}
            <div className="px-4 pb-3 flex items-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full pulse"></span>
              Simulated live data • Updates every 5s
            </div>
          </>
        )}
      </div>

      {/* Order Panel - Right Column */}
      <div className="lg:col-span-3 bg-[#121214] border border-zinc-800 rounded-sm flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-heading font-semibold text-white">Place Order</h3>
        </div>

        {selected ? (
          <div className="p-4 flex-1 flex flex-col">
            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                variant={orderType === "buy" ? "default" : "outline"}
                onClick={() => setOrderType("buy")}
                className={orderType === "buy" 
                  ? "btn-buy text-white font-bold"
                  : "border-zinc-800 text-zinc-400 hover:text-emerald-500 hover:border-emerald-800"
                }
                data-testid="buy-tab"
              >
                BUY
              </Button>
              <Button
                variant={orderType === "sell" ? "default" : "outline"}
                onClick={() => setOrderType("sell")}
                className={orderType === "sell"
                  ? "btn-sell text-white font-bold"
                  : "border-zinc-800 text-zinc-400 hover:text-rose-500 hover:border-rose-800"
                }
                data-testid="sell-tab"
              >
                SELL
              </Button>
            </div>

            {/* Symbol */}
            <div className="mb-4">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider">Symbol</Label>
              <div className="mt-1 p-3 bg-zinc-900/50 border border-zinc-800 rounded-sm">
                <span className="font-bold text-white">{selected.symbol}</span>
                <span className="text-zinc-500 ml-2">@ {formatCurrency(selected.price)}</span>
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <Label className="text-zinc-500 text-xs uppercase tracking-wider">Quantity</Label>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="border-zinc-800 text-zinc-400 hover:text-white h-10 w-10"
                  data-testid="decrease-qty"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="text-center font-mono bg-zinc-900/50 border-zinc-800 text-white"
                  data-testid="quantity-input"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="border-zinc-800 text-zinc-400 hover:text-white h-10 w-10"
                  data-testid="increase-qty"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Price per share</span>
                <span className="font-mono text-white">{formatCurrency(selected.price)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-500 text-sm">Quantity</span>
                <span className="font-mono text-white">{quantity}</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="font-mono text-lg font-bold text-white">{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Balance / Position Info */}
            <div className="mb-4 text-sm">
              {orderType === "buy" ? (
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Available Balance</span>
                  <span className="font-mono text-zinc-300">{formatCurrency(balance)}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Shares Owned</span>
                  <span className="font-mono text-zinc-300">{position?.quantity || 0}</span>
                </div>
              )}
            </div>

            {/* Execute Button */}
            <div className="mt-auto">
              <Button
                onClick={handleTrade}
                disabled={executing || (orderType === "buy" ? !canBuy : !canSell)}
                className={`w-full font-bold uppercase tracking-wide h-12 ${
                  orderType === "buy"
                    ? "btn-buy disabled:opacity-50"
                    : "btn-sell disabled:opacity-50"
                }`}
                data-testid="execute-trade-btn"
              >
                {executing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  `${orderType === "buy" ? "Buy" : "Sell"} ${selected.symbol}`
                )}
              </Button>
              
              {orderType === "buy" && !canBuy && (
                <p className="text-rose-500 text-xs text-center mt-2">Insufficient balance</p>
              )}
              {orderType === "sell" && !canSell && (
                <p className="text-rose-500 text-xs text-center mt-2">
                  {position ? "Insufficient shares" : "No position to sell"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-zinc-500">
            Select a stock to trade
          </div>
        )}
      </div>
    </div>
  );
}
