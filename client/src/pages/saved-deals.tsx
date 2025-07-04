import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MapPin, Clock, Trash2, Star, StarIcon } from "lucide-react";
import { SavedDealWithDetails } from "@shared/schema";
import BottomNavigation from "@/components/layout/BottomNavigation";
import AuthModal from "@/components/auth/AuthModal";

export default function SavedDealsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authModal = useAuthModal();
  
  // Get actual saved deals if authenticated
  const { data: savedDeals = [], isLoading } = useQuery({
    queryKey: ["/api/saved-deals"],
    enabled: isAuthenticated,
  });

  // Get all deals for preview when not authenticated
  const { data: allDeals = [] } = useQuery({
    queryKey: ["/api/deals"],
    enabled: !isAuthenticated,
  });

  // Show preview deals when not authenticated
  const previewDeals = !isAuthenticated ? allDeals.slice(0, 3).map((deal: any) => ({
    id: `preview-${deal.id}`,
    deal,
    userId: 'preview',
    dealId: deal.id,
    savedAt: new Date()
  })) : [];

  const displayDeals = isAuthenticated ? savedDeals : previewDeals;

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
          authModal.openModal('/saved-deals');
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
        title: "Deal Claimed!",
        description: "You've successfully claimed this deal",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-deals"] });
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
          authModal.openModal('/saved-deals');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
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
                {isAuthenticated 
                  ? `${savedDeals.length} deal${savedDeals.length !== 1 ? 's' : ''} saved`
                  : "Preview of available deals"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {displayDeals.length === 0 ? (
          <div className="text-center py-16">
            <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {isAuthenticated ? "No saved deals yet" : "Sign in to save deals"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {isAuthenticated 
                ? "Start exploring deals and save the ones you like!"
                : "Sign in to save your favorite deals and access them anytime!"
              }
            </p>
            <Button onClick={() => isAuthenticated ? window.location.href = '/deals' : authModal.openModal('/saved-deals')}>
              {isAuthenticated ? "Browse Deals" : "Sign In"}
            </Button>
          </div>
        ) : (
          <div>
            {!isAuthenticated && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  You're viewing a preview. <button 
                    onClick={() => authModal.openModal('/saved-deals')}
                    className="underline font-medium hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    Sign in
                  </button> to save deals and access your personal collection.
                </p>
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayDeals.map((savedDeal: SavedDealWithDetails) => {
                const deal = savedDeal.deal;
                const timeLeft = new Date(deal.endTime).getTime() - new Date().getTime();
                const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
                const isExpired = timeLeft <= 0;
                
                return (
                  <Card key={savedDeal.id} className={`hover:shadow-lg transition-shadow ${isExpired ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{deal.title}</CardTitle>
                        <Badge variant="destructive" className="bg-red-500 text-white font-bold">
                          {formatDiscount(deal.discountPercentage)}
                        </Badge>
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
                        <Badge 
                          variant={hoursLeft < 24 ? "destructive" : "default"} 
                          className={`text-xs ${hoursLeft < 24 ? 'bg-red-500' : 'bg-blue-500'} text-white`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {isExpired ? "Expired" : `${hoursLeft}h left`}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {deal.currentRedemptions || 0}/{deal.maxRedemptions} claimed
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        {isAuthenticated ? (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => claimDealMutation.mutate(deal.id)}
                              disabled={claimDealMutation.isPending || isExpired}
                            >
                              {isExpired ? "Expired" : claimDealMutation.isPending ? "Claiming..." : "Claim Deal"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => unsaveDealMutation.mutate(deal.id)}
                              disabled={unsaveDealMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => authModal.openModal('/saved-deals')}
                          >
                            Sign In to Claim
                          </Button>
                        )}
                      </div>
                      
                      <div className="mt-3 text-xs text-gray-500">
                        Saved {new Date(savedDeal.savedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="saved" 
        onAuditClick={() => {}} 
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={authModal.closeModal}
        redirectAfterAuth={authModal.redirectAfterAuth}
      />
    </div>
  );
}