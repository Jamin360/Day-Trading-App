import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      toast.success("Account created! Welcome to DayTradingPro");
      navigate("/dashboard");
    } catch (err) {
      const message = err.response?.data?.detail || "Registration failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Start with $100,000 virtual cash",
    "Real-time market simulation",
    "Track your P&L performance",
    "Trading journal for learning"
  ];

  return (
    <div className="min-h-screen bg-[#09090b] grid-bg flex items-center justify-center p-4" data-testid="register-page">
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

        {/* Register Card */}
        <div className="glass-card p-8 rounded-sm">
          <div className="text-center mb-6">
            <h2 className="font-heading font-bold text-xl text-white mb-2">Create your account</h2>
            <p className="text-zinc-500 text-sm">Start your trading journey today</p>
          </div>

          {/* Features */}
          <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-emerald-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-rose-500/10 border border-rose-500/20 rounded-sm text-rose-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-400 text-sm">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-500"
                data-testid="register-name-input"
              />
            </div>

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
                data-testid="register-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-500 pr-10"
                  data-testid="register-password-input"
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
              data-testid="register-submit-btn"
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-zinc-500 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-500 hover:text-blue-400" data-testid="login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
