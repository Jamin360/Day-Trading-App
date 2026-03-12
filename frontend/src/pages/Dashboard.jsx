import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { Link } from "react-router-dom";
import axios from "axios";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, token, updateUser } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [portfolioRes, stocksRes, tradesRes] = await Promise.all([
        axios.get(`${API}/portfolio`, { headers }),
        axios.get(`${API}/stocks`),
        axios.get(`${API}/trades?limit=5`, { headers })
      ]);

      setPortfolio(portfolioRes.data);
      setStocks(stocksRes.data);
      setRecentTrades(tradesRes.data);
      updateUser({ balance: portfolioRes.data.balance });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [token]);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset your account? This will delete all trades and positions.")) {
      return;
    }
    
    setResetting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/reset`, {}, { headers });
      toast.success("Account reset successfully!");
      fetchData();
    } catch (error) {
      toast.error("Failed to reset account");
    } finally {
      setResetting(false);
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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-zinc-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-zinc-800 text-zinc-400 hover:text-white"
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetting}
            className="border-zinc-800 text-rose-500 hover:text-rose-400 hover:border-rose-800"
            data-testid="reset-account-btn"
          >
            {resetting ? "Resetting..." : "Reset Account"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Value */}
        <div className="bg-[#121214] border border-zinc-800 p-5 rounded-sm" data-testid="total-value-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Value</span>
            <PieChart className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {formatCurrency(portfolio?.total_value || 100000)}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-sm font-mono ${
            (portfolio?.total_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {(portfolio?.total_pnl || 0) >= 0 ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
            {formatCurrency(Math.abs(portfolio?.total_pnl || 0))} ({formatPercent(portfolio?.total_pnl_percent || 0)})
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-[#121214] border border-zinc-800 p-5 rounded-sm" data-testid="cash-balance-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Cash Balance</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {formatCurrency(portfolio?.balance || 100000)}
          </div>
          <div className="text-sm text-zinc-500 mt-2">
            Available to trade
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="bg-[#121214] border border-zinc-800 p-5 rounded-sm" data-testid="portfolio-value-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Portfolio Value</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {formatCurrency(portfolio?.portfolio_value || 0)}
          </div>
          <div className="text-sm text-zinc-500 mt-2">
            {portfolio?.positions?.length || 0} positions
          </div>
        </div>

        {/* Total P&L */}
        <div className={`bg-[#121214] border p-5 rounded-sm ${
          (portfolio?.total_pnl || 0) >= 0 ? 'border-emerald-900/50' : 'border-rose-900/50'
        }`} data-testid="total-pnl-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total P&L</span>
            {(portfolio?.total_pnl || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className={`font-mono text-2xl font-bold ${
            (portfolio?.total_pnl || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {formatCurrency(portfolio?.total_pnl || 0)}
          </div>
          <div className={`text-sm font-mono mt-2 ${
            (portfolio?.total_pnl_percent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {formatPercent(portfolio?.total_pnl_percent || 0)}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className="lg:col-span-2 bg-[#121214] border border-zinc-800 rounded-sm">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="font-heading font-semibold text-white">Open Positions</h2>
            <Link 
              to="/trading" 
              className="text-sm text-blue-500 hover:text-blue-400"
              data-testid="view-trading-link"
            >
              Trade Now
            </Link>
          </div>
          
          {portfolio?.positions?.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {portfolio.positions.map((position) => (
                <div key={position.symbol} className="p-4 hover:bg-white/[0.02]" data-testid={`position-${position.symbol}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{position.symbol}</div>
                      <div className="text-sm text-zinc-500">{position.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-white">{formatCurrency(position.market_value)}</div>
                      <div className={`font-mono text-sm ${
                        position.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)} ({formatPercent(position.pnl_percent)})
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
                    <span>Qty: <span className="font-mono text-zinc-400">{position.quantity}</span></span>
                    <span>Avg: <span className="font-mono text-zinc-400">{formatCurrency(position.avg_price)}</span></span>
                    <span>Current: <span className="font-mono text-zinc-400">{formatCurrency(position.current_price)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 mb-4">No open positions yet</p>
              <Link to="/trading">
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="start-trading-btn">
                  Start Trading
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Market Overview */}
        <div className="bg-[#121214] border border-zinc-800 rounded-sm">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="font-heading font-semibold text-white">Market Overview</h2>
            <div className="flex items-center gap-1 text-xs text-emerald-500">
              <span className="w-2 h-2 bg-emerald-500 rounded-full pulse"></span>
              Live
            </div>
          </div>
          
          <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
            {stocks.map((stock) => (
              <Link 
                key={stock.symbol}
                to={`/trading?symbol=${stock.symbol}`}
                className="block p-3 hover:bg-white/[0.02]"
                data-testid={`market-${stock.symbol}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white text-sm">{stock.symbol}</div>
                    <div className="text-xs text-zinc-500 truncate max-w-[120px]">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">{formatCurrency(stock.price)}</div>
                    <div className={`font-mono text-xs ${
                      stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {stock.change >= 0 ? '+' : ''}{formatPercent(stock.change_percent)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <div className="mt-6 bg-[#121214] border border-zinc-800 rounded-sm">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="font-heading font-semibold text-white">Recent Trades</h2>
            <Link 
              to="/history" 
              className="text-sm text-blue-500 hover:text-blue-400"
              data-testid="view-history-link"
            >
              View All
            </Link>
          </div>
          
          <div className="divide-y divide-zinc-800">
            {recentTrades.map((trade) => (
              <div key={trade.id} className="p-4 flex items-center justify-between" data-testid={`trade-${trade.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 text-xs font-bold uppercase rounded-sm ${
                    trade.action === 'buy' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {trade.action}
                  </div>
                  <div>
                    <div className="font-medium text-white">{trade.symbol}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-white">{formatCurrency(trade.total)}</div>
                  <div className="text-xs text-zinc-500">
                    {trade.quantity} shares @ {formatCurrency(trade.price)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
