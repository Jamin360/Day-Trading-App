import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { 
  Plus,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Journal() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [symbol, setSymbol] = useState("");
  const [sentiment, setSentiment] = useState("neutral");
  const [lessons, setLessons] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/journal?limit=50`, { headers });
      setEntries(response.data);
    } catch (error) {
      console.error("Failed to fetch journal:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await axios.get(`${API}/stocks`);
      setStocks(response.data);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStocks();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSubmitting(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/journal`, {
        title,
        content,
        symbol: symbol || null,
        sentiment,
        lessons: lessons || null
      }, { headers });

      toast.success("Journal entry created");
      setDialogOpen(false);
      resetForm();
      fetchEntries();
    } catch (error) {
      toast.error("Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm("Delete this journal entry?")) return;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API}/journal/${entryId}`, { headers });
      toast.success("Entry deleted");
      fetchEntries();
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSymbol("");
    setSentiment("neutral");
    setLessons("");
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSentimentIcon = (s) => {
    switch(s) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-rose-500" />;
      default: return <Minus className="w-4 h-4 text-zinc-500" />;
    }
  };

  const getSentimentClass = (s) => {
    switch(s) {
      case 'bullish': return 'sentiment-bullish';
      case 'bearish': return 'sentiment-bearish';
      default: return 'sentiment-neutral';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-zinc-400">Loading journal...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="journal-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Trading Journal</h1>
          <p className="text-zinc-500 text-sm mt-1">Document your trades and learn from them</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" data-testid="new-entry-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121214] border-zinc-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">New Journal Entry</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Learned about support levels"
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600"
                  data-testid="entry-title-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-sm">Related Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white" data-testid="entry-symbol-select">
                      <SelectValue placeholder="Select stock" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-zinc-800">
                      <SelectItem value="">None</SelectItem>
                      {stocks.map(s => (
                        <SelectItem key={s.symbol} value={s.symbol}>{s.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-sm">Market Sentiment</Label>
                  <Select value={sentiment} onValueChange={setSentiment}>
                    <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white" data-testid="entry-sentiment-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181b] border-zinc-800">
                      <SelectItem value="bullish">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          Bullish
                        </span>
                      </SelectItem>
                      <SelectItem value="bearish">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-rose-500" />
                          Bearish
                        </span>
                      </SelectItem>
                      <SelectItem value="neutral">
                        <span className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-zinc-500" />
                          Neutral
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Notes *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What happened? What did you observe?"
                  rows={4}
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
                  data-testid="entry-content-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-sm">Lessons Learned</Label>
                <Textarea
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  placeholder="What will you do differently next time?"
                  rows={2}
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 resize-none"
                  data-testid="entry-lessons-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-zinc-800 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="save-entry-btn"
                >
                  {submitting ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Journal Entries */}
      {entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div 
              key={entry.id} 
              className="journal-card group"
              data-testid={`journal-entry-${entry.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-heading font-semibold text-white">{entry.title}</h3>
                    {entry.symbol && (
                      <span className="px-2 py-0.5 text-xs font-mono bg-blue-500/10 text-blue-500 rounded-sm">
                        {entry.symbol}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-sm flex items-center gap-1 ${getSentimentClass(entry.sentiment)}`}>
                      {getSentimentIcon(entry.sentiment)}
                      {entry.sentiment}
                    </span>
                  </div>
                  
                  <p className="text-zinc-400 text-sm whitespace-pre-wrap">{entry.content}</p>
                  
                  {entry.lessons && (
                    <div className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-sm">
                      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Lessons Learned</div>
                      <p className="text-zinc-300 text-sm">{entry.lessons}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.created_at)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-500 h-8 w-8"
                    data-testid={`delete-entry-${entry.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#121214] border border-zinc-800 rounded-sm p-12 text-center">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-white mb-2">No journal entries yet</h3>
          <p className="text-zinc-500 text-sm mb-4">
            Start documenting your trades to track your learning journey
          </p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Entry
          </Button>
        </div>
      )}
    </div>
  );
}
