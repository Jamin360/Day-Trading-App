import { useState, useEffect } from "react";
import { useAuth, supabase } from "@/App";
import { getPortfolio } from "@/lib/trading";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  BarChart3,
  PieChart
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

export default function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.id) return;
        
        // Fetch all trades
        const { data: trades, error: tradesError } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id);
        
        if (tradesError) throw tradesError;

        // Fetch portfolio
        const portfolioData = await getPortfolio(user.id);

        // Calculate analytics
        const totalTrades = trades?.length || 0;
        const buyTrades = trades?.filter(t => t.action === 'buy').length || 0;
        const sellTrades = trades?.filter(t => t.action === 'sell').length || 0;
        const totalVolume = trades?.reduce((sum, t) => sum + parseFloat(t.total), 0) || 0;
        const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;

        // Group by symbol
        const bySymbol = {};
        trades?.forEach(trade => {
          if (!bySymbol[trade.symbol]) {
            bySymbol[trade.symbol] = { trades: 0, volume: 0 };
          }
          bySymbol[trade.symbol].trades += 1;
          bySymbol[trade.symbol].volume += parseFloat(trade.total);
        });

        // Calculate total P&L from portfolio
        const totalCost = portfolioData.positions.reduce(
          (sum, p) => sum + (p.avg_price * p.quantity), 0
        );
        const totalPnl = portfolioData.portfolio_value - totalCost;
        const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

        setAnalytics({
          total_trades: totalTrades,
          buy_trades: buyTrades,
          sell_trades: sellTrades,
          total_volume: totalVolume,
          avg_trade_size: avgTradeSize,
          by_symbol: bySymbol
        });

        setPortfolio({
          ...portfolioData,
          total_pnl: totalPnl,
          total_pnl_percent: totalPnlPercent
        });
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-zinc-400">Loading analytics...</div>
      </div>
    );
  }

  // Prepare chart data
  const symbolData = analytics?.by_symbol 
    ? Object.entries(analytics.by_symbol).map(([symbol, data]) => ({
        symbol,
        trades: data.trades,
        volume: data.volume
      }))
    : [];

  const tradeTypeData = [
    { name: 'Buys', value: analytics?.buy_trades || 0, color: '#22c55e' },
    { name: 'Sells', value: analytics?.sell_trades || 0, color: '#ef4444' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#18181b] border border-zinc-700 p-3 rounded-sm text-xs">
          <div className="font-mono text-white mb-1">{label}</div>
          {payload.map((entry, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-zinc-500">{entry.name}:</span>
              <span className="font-mono text-white">
                {entry.name === 'Volume' ? formatCurrency(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="analytics-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-white">Performance Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Track and analyze your trading performance</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#121214] border border-zinc-800 p-5 rounded-sm" data-testid="total-trades-stat">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Trades</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {analytics?.total_trades || 0}
          </div>
        </div>

        <div className="bg-[#121214] border border-zinc-800 p-5 rounded-sm" data-testid="total-volume-stat">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Volume</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {formatCurrency(analytics?.total_volume || 0)}
          </div>
        </div>

        <div className="bg-[#121214] border border-zinc-800 p-5 rounded-sm" data-testid="avg-trade-stat">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Avg Trade Size</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {formatCurrency(analytics?.avg_trade_size || 0)}
          </div>
        </div>

        <div className={`bg-[#121214] border p-5 rounded-sm ${
          (portfolio?.total_pnl || 0) >= 0 ? 'border-emerald-900/50' : 'border-rose-900/50'
        }`} data-testid="total-pnl-stat">
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
          <div className={`text-sm font-mono mt-1 ${
            (portfolio?.total_pnl_percent || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
          }`}>
            {formatPercent(portfolio?.total_pnl_percent || 0)}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume by Symbol */}
        <div className="bg-[#121214] border border-zinc-800 rounded-sm p-6" data-testid="volume-chart">
          <h3 className="font-heading font-semibold text-white mb-4">Volume by Symbol</h3>
          {symbolData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolData}>
                  <XAxis 
                    dataKey="symbol" 
                    stroke="#52525b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#52525b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="volume" 
                    name="Volume"
                    fill="#3b82f6" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">
              No trading data yet
            </div>
          )}
        </div>

        {/* Trade Distribution */}
        <div className="bg-[#121214] border border-zinc-800 rounded-sm p-6" data-testid="distribution-chart">
          <h3 className="font-heading font-semibold text-white mb-4">Trade Distribution</h3>
          {analytics?.total_trades > 0 ? (
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={tradeTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tradeTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#18181b] border border-zinc-700 p-3 rounded-sm text-xs">
                            <div className="font-medium text-white">{payload[0].name}</div>
                            <div className="font-mono text-zinc-400">{payload[0].value} trades</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">
              No trading data yet
            </div>
          )}
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
              <span className="text-sm text-zinc-400">Buys ({analytics?.buy_trades || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
              <span className="text-sm text-zinc-400">Sells ({analytics?.sell_trades || 0})</span>
            </div>
          </div>
        </div>

        {/* Trades by Symbol */}
        <div className="bg-[#121214] border border-zinc-800 rounded-sm p-6" data-testid="trades-chart">
          <h3 className="font-heading font-semibold text-white mb-4">Trades by Symbol</h3>
          {symbolData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={symbolData} layout="vertical">
                  <XAxis 
                    type="number"
                    stroke="#52525b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="symbol"
                    stroke="#52525b" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="trades" 
                    name="Trades"
                    fill="#6366f1" 
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-500">
              No trading data yet
            </div>
          )}
        </div>

        {/* Portfolio Composition */}
        <div className="bg-[#121214] border border-zinc-800 rounded-sm p-6" data-testid="portfolio-chart">
          <h3 className="font-heading font-semibold text-white mb-4">Portfolio Composition</h3>
          {portfolio?.positions?.length > 0 ? (
            <>
              <div className="space-y-3">
                {portfolio.positions.map((pos) => {
                  const percentage = (pos.market_value / portfolio.portfolio_value) * 100;
                  return (
                    <div key={pos.symbol}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{pos.symbol}</span>
                        <span className="text-sm text-zinc-400">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-zinc-500">{formatCurrency(pos.market_value)}</span>
                        <span className={pos.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          {pos.pnl >= 0 ? '+' : ''}{formatCurrency(pos.pnl)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Cash</span>
                  <span className="font-mono text-white">{formatCurrency(portfolio.balance)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-zinc-500">Invested</span>
                  <span className="font-mono text-white">{formatCurrency(portfolio.portfolio_value)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-zinc-500">
              <PieChart className="w-12 h-12 mb-3 text-zinc-700" />
              <p>No positions yet</p>
              <p className="text-sm">Start trading to see your portfolio</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
