import { useState, useEffect } from "react";
import { useAuth, supabase } from "@/App";
import { getStockData } from "@/lib/supabase";
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
  const { user } = useAuth();
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
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('journal')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Failed to fetch journal:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStocks = async () => {
    try {
      const stocksData = getStockData();
      setStocks(stocksData);
    } catch (error) {
      console.error("Failed to fetch stocks:", error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStocks();
  }, [user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSubmitting(true);
    try {
      if (!user?.id) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('journal')
        .insert({
          user_id: user.id,
          title,
          content,
          symbol: symbol || null,
          sentiment,
          lessons: lessons || null
        });

      if (error) throw error;
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
      const { error } = await supabase
        .from('journal')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);
      
      if (error) throw error;
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
      case 'bullish': return <TrendingUp className="w-4 h-4 text-[#4E8A62]" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-[#B85A5A]" />;
      default: return <Minus className="w-4 h-4 text-[#8A8B8F]" />;
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
        <div className="text-[#8A8B8F]">Loading journal...</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6" data-testid="journal-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-[#1C2333]">Trading Journal</h1>
          <p className="text-[#8A8B8F] text-sm mt-1">Document your trades and learn from them</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3B6FA0] hover:bg-[#2A4F72]" data-testid="new-entry-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#E8E6E1] border-[rgba(28,35,51,0.15)] text-[#1C2333] max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">New Journal Entry</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-[#8A8B8F] text-sm">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Learned about support levels"
                  className="bg-[#DEDCD7] border-[rgba(28,35,51,0.1)] text-[#1C2333] placeholder:text-[#8A8B8F]"
                  data-testid="entry-title-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#8A8B8F] text-sm">Related Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger className="bg-[#DEDCD7] border-[rgba(28,35,51,0.1)] text-[#1C2333]" data-testid="entry-symbol-select">
                      <SelectValue placeholder="Select stock" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E8E6E1] border-[rgba(28,35,51,0.15)]">
                      <SelectItem value="">None</SelectItem>
                      {stocks.map(s => (
                        <SelectItem key={s.symbol} value={s.symbol}>{s.symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#8A8B8F] text-sm">Market Sentiment</Label>
                  <Select value={sentiment} onValueChange={setSentiment}>
                    <SelectTrigger className="bg-[#DEDCD7] border-[rgba(28,35,51,0.1)] text-[#1C2333]" data-testid="entry-sentiment-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#E8E6E1] border-[rgba(28,35,51,0.15)]">
                      <SelectItem value="bullish">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#4E8A62]" />
                          Bullish
                        </span>
                      </SelectItem>
                      <SelectItem value="bearish">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-[#B85A5A]" />
                          Bearish
                        </span>
                      </SelectItem>
                      <SelectItem value="neutral">
                        <span className="flex items-center gap-2">
                          <Minus className="w-4 h-4 text-[#8A8B8F]" />
                          Neutral
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#8A8B8F] text-sm">Notes *</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What happened? What did you observe?"
                  rows={4}
                  className="bg-[#DEDCD7] border-[rgba(28,35,51,0.1)] text-[#1C2333] placeholder:text-[#8A8B8F] resize-none"
                  data-testid="entry-content-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#8A8B8F] text-sm">Lessons Learned</Label>
                <Textarea
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  placeholder="What will you do differently next time?"
                  rows={2}
                  className="bg-[#DEDCD7] border-[rgba(28,35,51,0.1)] text-[#1C2333] placeholder:text-[#8A8B8F] resize-none"
                  data-testid="entry-lessons-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-[rgba(28,35,51,0.15)] text-[#1C2333]"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-[#3B6FA0] hover:bg-[#2A4F72]"
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
                    <h3 className="font-heading font-semibold text-[#1C2333]">{entry.title}</h3>
                    {entry.symbol && (
                      <span className="px-2 py-0.5 text-xs font-mono bg-[rgba(59,111,160,0.12)] text-[#3B6FA0] rounded-sm">
                        {entry.symbol}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-sm flex items-center gap-1 ${getSentimentClass(entry.sentiment)}`}>
                      {getSentimentIcon(entry.sentiment)}
                      {entry.sentiment}
                    </span>
                  </div>
                  
                  <p className="text-[#8A8B8F] text-sm whitespace-pre-wrap">{entry.content}</p>
                  
                  {entry.lessons && (
                    <div className="mt-3 p-3 bg-[#DEDCD7] border border-[rgba(28,35,51,0.1)] rounded-sm">
                      <div className="text-xs uppercase tracking-wider text-[#8A8B8F] mb-1">Lessons Learned</div>
                      <p className="text-[#1C2333] text-sm">{entry.lessons}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-xs text-[#8A8B8F]">
                    <Calendar className="w-3 h-3" />
                    {formatDate(entry.created_at)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(entry.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#8A8B8F] hover:text-[#B85A5A] h-8 w-8"
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
        <div className="bg-[#E8E6E1] border border-[rgba(28,35,51,0.1)] rounded-sm p-12 text-center">
          <BookOpen className="w-12 h-12 text-[#8A8B8F] mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-[#1C2333] mb-2">No journal entries yet</h3>
          <p className="text-[#8A8B8F] text-sm mb-4">
            Start documenting your trades to track your learning journey
          </p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-[#3B6FA0] hover:bg-[#2A4F72]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Entry
          </Button>
        </div>
      )}
    </div>
  );
}
