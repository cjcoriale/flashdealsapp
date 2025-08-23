import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./hooks/useAuth";
import MapPage from "@/pages/map";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import DealsPage from "@/pages/deals";
import SavedDealsPage from "@/pages/saved-deals";
import ClaimedDealsPage from "@/pages/claimed-deals";
import AnalyticsPage from "@/pages/analytics";
import MerchantDashboard from "@/pages/merchant-dashboard";
import ProfilePage from "@/pages/profile";
import CustomerHome from "@/pages/customer-home";
import MerchantHome from "@/pages/merchant-home";
import NotificationsPage from "@/pages/notifications";
import FavoriteMerchantsPage from "@/pages/favorite-merchants";
import NotFound from "@/pages/not-found";
import { Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { useEffect, lazy } from "react";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {isLoading ? (
        <Route>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </Route>
      ) : isAuthenticated ? (
        <>
          {/* Role-based routing - merchants go to dashboard, customers to map */}
          <Route path="/" component={
            user?.role === 'super_merchant' ? MerchantDashboard : 
            user?.role === 'merchant' ? MerchantDashboard : 
            MapPage
          } />
          
          {/* Role-based home content available via deals route */}
          <Route path="/deals" component={
            user?.role === 'super_merchant' ? MerchantHome : 
            user?.role === 'merchant' ? MerchantHome : 
            CustomerHome
          } />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/notifications" component={NotificationsPage} />
          
          {/* Customer-specific routes */}
          {user?.role === 'customer' && (
            <>
              <Route path="/saved-deals" component={SavedDealsPage} />
              <Route path="/claimed-deals" component={ClaimedDealsPage} />
              <Route path="/favorite-merchants" component={FavoriteMerchantsPage} />
            </>
          )}
          
          {/* Merchant-specific routes */}
          {(user?.role === 'merchant' || user?.role === 'super_merchant') && (
            <>
              <Route path="/merchant-dashboard" component={MerchantDashboard} />
              <Route path="/analytics" component={AnalyticsPage} />
            </>
          )}
          
          {/* Map always available for all users */}
          <Route path="/map" component={MapPage} />
          
          {/* Legacy routes for backward compatibility */}
          <Route path="/home" component={
            user?.role === 'super_merchant' ? MerchantHome :
            user?.role === 'merchant' ? MerchantHome : 
            CustomerHome
          } />
        </>
      ) : (
        <Route path="/" component={Landing} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function TokenHandler() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Wait for page to be fully loaded
    const handleToken = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const logoutParam = urlParams.get('logout');
      
      console.log('TokenHandler: Full URL:', window.location.href);
      console.log('TokenHandler: URL params:', window.location.search);
      console.log('TokenHandler: Found token in URL:', token);
      console.log('TokenHandler: Current localStorage token:', localStorage.getItem('auth_token'));
      
      // Handle logout
      if (logoutParam === 'success') {
        console.log('TokenHandler: Logout detected, clearing auth token');
        localStorage.removeItem('auth_token');
        
        // Clean up the URL by removing the logout parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('logout');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Invalidate auth query to force refetch and show login state
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        return;
      }
      
      if (token) {
        // Store the token in localStorage
        localStorage.setItem('auth_token', token);
        console.log('Auth token stored from URL:', token);
        
        // Clean up the URL by removing the token parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('token');
        newUrl.searchParams.delete('auth');
        window.history.replaceState({}, '', newUrl.toString());
        
        console.log('URL cleaned, token should now be available for requests');
        console.log('New localStorage token:', localStorage.getItem('auth_token'));
        
        // Invalidate auth query to force refetch with new token
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        // Don't reload, just let React Query refetch
        return;
      }
    };

    // Run immediately and also after a short delay to catch any timing issues
    handleToken();
    const timeoutId = setTimeout(handleToken, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TokenHandler />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
