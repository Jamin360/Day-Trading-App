import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { 
  LayoutDashboard, 
  TrendingUp, 
  History, 
  BookOpen, 
  BarChart3, 
  LogOut,
  Wallet,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/trading", label: "Trading", icon: TrendingUp },
    { path: "/history", label: "History", icon: History },
    { path: "/journal", label: "Journal", icon: BookOpen },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="h-16 bg-[#1C2333] border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-50" data-testid="navbar">
      <div className="h-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
          <div className="w-8 h-8 bg-[#6B9DC8] rounded flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading font-bold text-lg text-white hidden sm:block">
            DayTradingPro
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium
                transition-colors duration-150
                ${isActive(item.path) 
                  ? "bg-[#3B6FA0]/10 text-[#6B9DC8]" 
                  : "text-[#B8BAC0] hover:text-white hover:bg-[#242B3D]"
                }
              `}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden md:block">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {/* Balance Display */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#242B3D] border border-[rgba(255,255,255,0.07)] rounded-sm">
            <Wallet className="w-4 h-4 text-[#8A8B8F]" />
            <span className="font-mono text-sm text-white" data-testid="nav-balance">
              ${user?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
            </span>
          </div>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 text-[#B8BAC0] hover:text-white"
                data-testid="user-menu-trigger"
              >
                <div className="w-8 h-8 rounded-full bg-[#2A4F72] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden sm:block text-sm">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#1C2333] border-[rgba(255,255,255,0.07)]">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-[#8A8B8F]">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.07)]" />
              <DropdownMenuItem className="sm:hidden">
                <Wallet className="w-4 h-4 mr-2" />
                <span className="font-mono">${user?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800 sm:hidden" />
              <DropdownMenuItem 
                onClick={logout}
                className="text-rose-500 focus:text-rose-500 cursor-pointer"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
