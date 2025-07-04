import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MapPin, Clock, Trash2, Star, StarIcon } from "lucide-react";
import { SavedDealWithDetails } from "@shared/schema";

export default function SavedDealsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: savedDeals = [], isLoading } = useQuery({
    queryKey: ["/api/saved-deals"],
    enabled: isAuthenticated,
  });

  const unsaveDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      await apiRequest("DELETE", `/api/deals/${dealId}/save`);
    },
    onSuccess: () => {
      toast({
        title: "Deal Removed",
        description: "Deal has been removed from your saved list",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-deals"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to remove deal",
        variant: "destructive",
      });
    },
  });

  const claimDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      await apiRequest("POST", `/api/deals/${dealId}/claim`);
    },
    onSuccess: () => {
      toast({
        title: "Deal Claimed",
        description: "Deal has been claimed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/claimed-deals"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to claim deal",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatDiscount = (percentage: number) => `${percentage}% OFF`;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view your saved deals
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/api/login'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading saved deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <Star className="w-8 h-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Saved Deals
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {savedDeals.length} deal{savedDeals.length !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {savedDeals.length === 0 ? (
          <div className="text-center py-16">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No saved deals yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start exploring deals and save the ones you like!
            </p>
            <Button onClick={() => window.location.href = '/deals'}>
              Browse Deals
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedDeals.map((savedDeal: SavedDealWithDetails) => {
              const deal = savedDeal.deal;
              const timeLeft = new Date(deal.endTime).getTime() - new Date().getTime();
              const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
              const isExpired = timeLeft <= 0;
              
              return (
                <Card key={savedDeal.id} className={`hover:shadow-lg transition-shadow ${isExpired ? 'opacity-60' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{deal.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {formatDiscount(deal.discountPercentage)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unsaveDealMutation.mutate(deal.id)}
                          disabled={unsaveDealMutation.isPending}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{deal.merchant.name}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(deal.originalPrice)}
                        </span>
                        <span className="text-lg font-bold text-green-600 ml-2">
                          {formatPrice(deal.discountedPrice)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {deal.description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant={isExpired ? "destructive" : hoursLeft < 24 ? "destructive" : "secondary"} className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {isExpired ? "Expired" : `${hoursLeft}h left`}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {deal.currentRedemptions || 0}/{deal.maxRedemptions} claimed
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => claimDealMutation.mutate(deal.id)}
                        disabled={claimDealMutation.isPending || isExpired}
                      >
                        {isExpired ? "Expired" : claimDealMutation.isPending ? "Claiming..." : "Claim Deal"}
                      </Button>
                    </div>
                    
                    <div className="mt-3 text-xs text-gray-500">
                      Saved {new Date(savedDeal.savedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}