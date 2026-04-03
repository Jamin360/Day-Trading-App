import { useState, useEffect } from "react";
import { useAuth, supabase } from "@/App";
import { 
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function History() {
  const { user } = useAuth();
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        setTrades(data || []);
        setFilteredTrades(data || []);
      } catch (error) {
        console.error("Failed to fetch trades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, [user?.id]);

  useEffect(() => {
    let filtered = trades;

    // Filter by action
    if (filterAction !== "all") {
      filtered = filtered.filter(t => t.action === filterAction);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTrades(filtered);
  }, [trades, filterAction, searchQuery]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Symbol', 'Action', 'Quantity', 'Price', 'Total'];
    const csvContent = [
      headers.join(','),
      ...filteredTrades.map(t => [
        formatDate(t.timestamp),
        formatTime(t.timestamp),
        t.symbol,
        t.action.toUpperCase(),
        t.quantity,
        t.price,
        t.total
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade_history.csv';
    a.click();
  };

  // Calculate summary stats
  const totalBuys = filteredTrades.filter(t => t.action === 'buy').reduce((sum, t) => sum + t.total, 0);
  const totalSells = filteredTrades.filter(t => t.action === 'sell').reduce((sum, t) => sum + t.total, 0);
  const totalTrades = filteredTrades.length;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-zinc-400">Loading trade history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="history-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Trade History</h1>
          <p className="text-zinc-500 text-sm mt-1">View all your past trades</p>
        </div>
        <Button
          variant="outline"
          onClick={exportToCSV}
          className="border-zinc-800 text-zinc-400 hover:text-white"
          data-testid="export-csv-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#121214] border border-zinc-800 p-4 rounded-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Total Trades</div>
          <div className="font-mono text-xl font-bold text-white">{totalTrades}</div>
        </div>
        <div className="bg-[#121214] border border-emerald-900/50 p-4 rounded-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Total Bought</div>
          <div className="font-mono text-xl font-bold text-emerald-500">{formatCurrency(totalBuys)}</div>
        </div>
        <div className="bg-[#121214] border border-rose-900/50 p-4 rounded-sm">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Total Sold</div>
          <div className="font-mono text-xl font-bold text-rose-500">{formatCurrency(totalSells)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#121214] border-zinc-800 text-white placeholder:text-zinc-600"
            data-testid="search-input"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-40 bg-[#121214] border-zinc-800 text-white" data-testid="filter-action">
            <Filter className="w-4 h-4 mr-2 text-zinc-500" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181b] border-zinc-800">
            <SelectItem value="all">All Trades</SelectItem>
            <SelectItem value="buy">Buys Only</SelectItem>
            <SelectItem value="sell">Sells Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trade Table */}
      <div className="bg-[#121214] border border-zinc-800 rounded-sm overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-7 gap-4 p-4 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
          <div>Date</div>
          <div>Symbol</div>
          <div>Action</div>
          <div className="text-right">Quantity</div>
          <div className="text-right">Price</div>
          <div className="text-right">Total</div>
          <div className="text-right">Time</div>
        </div>

        {/* Table Body */}
        {filteredTrades.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {filteredTrades.map((trade) => (
              <div 
                key={trade.id} 
                className="grid grid-cols-2 md:grid-cols-7 gap-4 p-4 hover:bg-white/[0.02]"
                data-testid={`trade-row-${trade.id}`}
              >
                {/* Mobile: Date + Symbol */}
                <div className="md:hidden col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-sm flex items-center justify-center ${
                      trade.action === 'buy' ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                    }`}>
                      {trade.action === 'buy' ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                    <div>
                      <div className="font-medium text-white">{trade.symbol}</div>
                      <div className="text-xs text-zinc-500">{formatDate(trade.timestamp)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-white">{formatCurrency(trade.total)}</div>
                    <div className="text-xs text-zinc-500">{trade.quantity} @ {formatCurrency(trade.price)}</div>
                  </div>
                </div>

                {/* Desktop: Full Row */}
                <div className="hidden md:block text-sm text-zinc-300">{formatDate(trade.timestamp)}</div>
                <div className="hidden md:block font-medium text-white">{trade.symbol}</div>
                <div className="hidden md:block">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold uppercase rounded-sm ${
                    trade.action === 'buy' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {trade.action === 'buy' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trade.action}
                  </span>
                </div>
                <div className="hidden md:block text-right font-mono text-zinc-300">{trade.quantity}</div>
                <div className="hidden md:block text-right font-mono text-zinc-300">{formatCurrency(trade.price)}</div>
                <div className="hidden md:block text-right font-mono text-white">{formatCurrency(trade.total)}</div>
                <div className="hidden md:block text-right text-sm text-zinc-500">{formatTime(trade.timestamp)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-zinc-500">
              {trades.length === 0 
                ? "No trades yet. Start trading to see your history here."
                : "No trades match your filters."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
