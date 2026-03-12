import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const message = err.response?.data?.detail || "Login failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] grid-bg flex items-center justify-center p-4" data-testid="login-page">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1771226281112-b7119ef4112e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njl8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGZpbmFuY2lhbCUyMGRhdGElMjB2aXN1YWxpemF0aW9uJTIwZGFyayUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzczMzQ0MTU1fDA&ixlib=rb-4.1.0&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center glow-blue">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">DayTradingPro</h1>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 rounded-sm">
          <div className="text-center mb-6">
            <h2 className="font-heading font-bold text-xl text-white mb-2">Welcome back</h2>
            <p className="text-zinc-500 text-sm">Sign in to continue trading</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-sm text-rose-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-500"
                data-testid="login-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-500 pr-10"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 glow-blue"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-zinc-500 text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-500 hover:text-blue-400" data-testid="register-link">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          Practice trading with $100,000 virtual cash
        </p>
      </div>
    </div>
  );
}
