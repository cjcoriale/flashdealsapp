import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./hooks/useAuth";
import MapPage from "@/pages/map";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import DealsPage from "@/pages/deals";
import SavedDealsPage from "@/pages/saved-deals";
import AnalyticsPage from "@/pages/analytics";
import MerchantDashboard from "@/pages/merchant-dashboard";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route path="/home" component={Home} />
      <Route path="/deals" component={DealsPage} />
      <Route path="/saved-deals" component={SavedDealsPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/merchant" component={MerchantDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
