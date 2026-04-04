import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/lib/supabase";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Trading from "@/pages/Trading";
import History from "@/pages/History";
import Journal from "@/pages/Journal";
import Analytics from "@/pages/Analytics";

// Components
import { Navbar } from "@/components/Navbar";

// Export supabase for use in pages
export { supabase };

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 [AUTH LISTENER] Event triggered:', event);
      console.log('🔔 [AUTH LISTENER] Session:', session?.user?.email);
      setSession(session);
      
      // Don't fetch profile on SIGNED_UP event - let register() handle it
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔔 [AUTH LISTENER] SIGNED_IN - fetching profile');
        fetchUserProfile(session.user.id);
      } else if (session?.user && event !== 'SIGNED_UP') {
        console.log('🔔 [AUTH LISTENER]', event, '- fetching profile');
        fetchUserProfile(session.user.id);
      } else {
        console.log('🔔 [AUTH LISTENER] Clearing user state');
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser({
        id: data.id,
        email: data.email,
        name: data.name,
        balance: parseFloat(data.balance)
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  };

  const register = async (email, password, name) => {
    console.log('📝 [REGISTER] Starting registration for:', email);
    
    try {
      console.log('📝 [REGISTER] Calling supabase.auth.signUp...');
      
      // Sign up the user with email confirmation disabled
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin + '/Day-Trading-App/dashboard',
        },
      });
      
      console.log('📝 [REGISTER] signUp returned - data:', data?.user?.email);
      console.log('📝 [REGISTER] signUp returned - user confirmed:', data?.user?.confirmed_at);
      console.log('📝 [REGISTER] signUp returned - error:', error);
      
      if (error) {
        console.error('📝 [REGISTER] Error during signUp:', error.message);
        throw new Error(error.message);
      }

      // Manually create profile after signup completes
      if (data?.user) {
        console.log('📝 [REGISTER] User created, waiting 100ms before profile insert...');
        // Small delay to ensure signup is fully processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('📝 [REGISTER] Inserting profile into database...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name,
            balance: 100000.00
          });
        
        if (profileError) {
          console.log('📝 [REGISTER] Profile insert error:', profileError);
          if (!profileError.message.includes('duplicate')) {
            console.error('📝 [REGISTER] Non-duplicate profile error:', profileError);
          } else {
            console.log('📝 [REGISTER] Profile already exists (duplicate key)');
          }
        } else {
          console.log('📝 [REGISTER] Profile created successfully!');
        }
      }
      
      console.log('📝 [REGISTER] Registration complete!');
    } catch (err) {
      console.error('📝 [REGISTER] Exception caught:', err);
      throw err;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// App Layout
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter basename="/Day-Trading-App">
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/trading" element={
            <ProtectedRoute>
              <AppLayout>
                <Trading />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <AppLayout>
                <History />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/journal" element={
            <ProtectedRoute>
              <AppLayout>
                <Journal />
              </AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <AppLayout>
                <Analytics />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
