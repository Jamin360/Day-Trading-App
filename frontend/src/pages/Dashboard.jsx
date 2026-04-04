import { useState, useEffect } from "react";
import { useAuth, supabase } from "@/App";
import { Link } from "react-router-dom";
import { getStockData } from "@/lib/supabase";
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
  const { user, updateUser } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      if (!user?.id) return;

      // Fetch portfolio data
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id);

      // Get stock data
      const stocksData = getStockData();
      setStocks(stocksData);

      // Calculate portfolio with current prices
      const portfolioPositions = (positions || []).map(pos => {
        const stock = stocksData.find(s => s.symbol === pos.symbol);
        const currentPrice = stock?.price || pos.avg_price;
        const marketValue = currentPrice * pos.quantity;
        const costBasis = pos.avg_price * pos.quantity;
        const pnl = marketValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        return {
          symbol: pos.symbol,
          name: pos.name,
          quantity: pos.quantity,
          avg_price: parseFloat(pos.avg_price),
          current_price: currentPrice,
          market_value: marketValue,
          pnl: pnl,
          pnl_percent: pnlPercent
        };
      });

      const portfolioValue = portfolioPositions.reduce((sum, p) => sum + p.market_value, 0);
      const totalCost = portfolioPositions.reduce((sum, p) => sum + (p.avg_price * p.quantity), 0);
      const totalPnl = portfolioValue - totalCost;
      const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
      const balance = parseFloat(profile?.balance || 0);
      const totalValue = balance + portfolioValue;

      setPortfolio({
        balance,
        portfolio_value: portfolioValue,
        total_value: totalValue,
        total_pnl: totalPnl,
        total_pnl_percent: totalPnlPercent,
        positions: portfolioPositions
      });

      updateUser({ balance });

      // Fetch recent trades
      const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(5);

      setRecentTrades(trades || []);
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
  }, [user?.id]);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset your account? This will delete all trades and positions.")) {
      return;
    }
    
    setResetting(true);
    try {
      // Delete all positions, trades, and journal entries
      await Promise.all([
        supabase.from('positions').delete().eq('user_id', user.id),
        supabase.from('trades').delete().eq('user_id', user.id),
        supabase.from('journal').delete().eq('user_id', user.id),
        supabase.from('profiles').update({ balance: 100000.00 }).eq('id', user.id)
      ]);

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
            className="border-[rgba(28,35,51,0.1)] text-[#B85A5A] hover:text-[#9A4848] hover:border-[#B85A5A]"
            data-testid="reset-account-btn"
          >
            {resetting ? "Resetting..." : "Reset Account"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Value */}
        <div className="bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] p-5 rounded-sm" data-testid="total-value-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#8A8B8F]">Total Value</span>
            <PieChart className="w-4 h-4 text-[#3B6FA0]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#1C2333]">
            {formatCurrency(portfolio?.total_value || 100000)}
          </div>
          <div className={`flex items-center gap-1 mt-2 text-sm font-mono ${
            (portfolio?.total_pnl || 0) >= 0 ? 'text-[#4E8A62]' : 'text-[#B85A5A]'
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
        <div className="bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] p-5 rounded-sm" data-testid="cash-balance-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#8A8B8F]">Cash Balance</span>
            <Wallet className="w-4 h-4 text-[#4E8A62]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#1C2333]">
            {formatCurrency(portfolio?.balance || 100000)}
          </div>
          <div className="text-sm text-[#8A8B8F] mt-2">
            Available to trade
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] p-5 rounded-sm" data-testid="portfolio-value-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#8A8B8F]">Portfolio Value</span>
            <Activity className="w-4 h-4 text-[#3B6FA0]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#1C2333]">
            {formatCurrency(portfolio?.portfolio_value || 0)}
          </div>
          <div className="text-sm text-[#8A8B8F] mt-2">
            {portfolio?.positions?.length || 0} positions
          </div>
        </div>

        {/* Total P&L */}
        <div className={`bg-[#E8E6E1] border p-5 rounded-sm ${
          (portfolio?.total_pnl || 0) >= 0 ? 'border-[rgba(78,138,98,0.3)]' : 'border-[rgba(184,90,90,0.3)]'
        }`} data-testid="total-pnl-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[#8A8B8F]">Total P&L</span>
            {(portfolio?.total_pnl || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#4E8A62]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-[#B85A5A]" />
            )}
          </div>
          <div className={`font-mono text-2xl font-bold ${
            (portfolio?.total_pnl || 0) >= 0 ? 'text-[#4E8A62]' : 'text-[#B85A5A]'
          }`}>
            {formatCurrency(portfolio?.total_pnl || 0)}
          </div>
          <div className={`text-sm font-mono mt-2 ${
            (portfolio?.total_pnl_percent || 0) >= 0 ? 'text-[#4E8A62]' : 'text-[#B85A5A]'
          }`}>
            {formatPercent(portfolio?.total_pnl_percent || 0)}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Positions */}
        <div className="lg:col-span-2 bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] rounded-sm">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(28,35,51,0.1)]">
            <h2 className="font-heading font-semibold text-[#1C2333]">Open Positions</h2>
            <Link 
              to="/trading" 
              className="text-sm text-[#3B6FA0] hover:text-[#2A4F72]"
              data-testid="view-trading-link"
            >
              Trade Now
            </Link>
          </div>
          
          {portfolio?.positions?.length > 0 ? (
            <div className="divide-y divide-[rgba(28,35,51,0.1)]">
              {portfolio.positions.map((position) => (
                <div key={position.symbol} className="p-4 hover:bg-[#DEDCD7]" data-testid={`position-${position.symbol}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#1C2333]">{position.symbol}</div>
                      <div className="text-sm text-[#8A8B8F]">{position.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[#1C2333]">{formatCurrency(position.market_value)}</div>
                      <div className={`font-mono text-sm ${
                        position.pnl >= 0 ? 'text-[#4E8A62]' : 'text-[#B85A5A]'
                      }`}>
                        {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)} ({formatPercent(position.pnl_percent)})
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[#8A8B8F]">
                    <span>Qty: <span className="font-mono text-[#1C2333]">{position.quantity}</span></span>
                    <span>Avg: <span className="font-mono text-[#1C2333]">{formatCurrency(position.avg_price)}</span></span>
                    <span>Current: <span className="font-mono text-[#1C2333]">{formatCurrency(position.current_price)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-[#8A8B8F] mx-auto mb-3" />
              <p className="text-[#8A8B8F] mb-4">No open positions yet</p>
              <Link to="/trading">
                <Button className="bg-[#3B6FA0] hover:bg-[#2A4F72]" data-testid="start-trading-btn">
                  Start Trading
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Market Overview */}
        <div className="bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] rounded-sm">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(28,35,51,0.1)]">
            <h2 className="font-heading font-semibold text-[#1C2333]">Market Overview</h2>
            <div className="flex items-center gap-1 text-xs text-[#4E8A62]">
              <span className="w-2 h-2 bg-[#4E8A62] rounded-full pulse"></span>
              Live
            </div>
          </div>
          
          <div className="divide-y divide-[rgba(28,35,51,0.1)] max-h-[400px] overflow-y-auto">
            {stocks.map((stock) => (
              <Link 
                key={stock.symbol}
                to={`/trading?symbol=${stock.symbol}`}
                className="block p-3 hover:bg-[#DEDCD7]"
                data-testid={`market-${stock.symbol}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#1C2333] text-sm">{stock.symbol}</div>
                    <div className="text-xs text-[#8A8B8F] truncate max-w-[120px]">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-[#1C2333]">{formatCurrency(stock.price)}</div>
                    <div className={`font-mono text-xs ${
                      stock.change >= 0 ? 'text-[#4E8A62]' : 'text-[#B85A5A]'
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
        <div className="mt-6 bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] rounded-sm">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(28,35,51,0.1)]">
            <h2 className="font-heading font-semibold text-[#1C2333]">Recent Trades</h2>
            <Link 
              to="/history" 
              className="text-sm text-[#3B6FA0] hover:text-[#2A4F72]"
              data-testid="view-history-link"
            >
              View All
            </Link>
          </div>
          
          <div className="divide-y divide-[rgba(28,35,51,0.1)]">
            {recentTrades.map((trade) => (
              <div key={trade.id} className="p-4 flex items-center justify-between" data-testid={`trade-${trade.id}`}>
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 text-xs font-bold uppercase rounded-sm ${
                    trade.action === 'buy' 
                      ? 'bg-[rgba(78,138,98,0.12)] text-[#4E8A62]' 
                      : 'bg-[rgba(184,90,90,0.12)] text-[#B85A5A]'
                  }`}>
                    {trade.action}
                  </div>
                  <div>
                    <div className="font-medium text-[#1C2333]">{trade.symbol}</div>
                    <div className="text-xs text-[#8A8B8F]">
                      {new Date(trade.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#1C2333]">{formatCurrency(trade.total)}</div>
                  <div className="text-xs text-[#8A8B8F]">
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
