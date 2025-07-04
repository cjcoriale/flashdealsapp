import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MapPin, Clock, Star, StarIcon, Search, Filter } from "lucide-react";
import { DealWithMerchant } from "@shared/schema";
import BottomNavigation from "@/components/layout/BottomNavigation";
import AuthModal from "@/components/auth/AuthModal";

export default function DealsPage() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authModal = useAuthModal();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["/api/deals"],
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/search", { q: searchQuery }],
    enabled: searchQuery.length > 0,
  });

  const { data: savedDeals = [] } = useQuery({
    queryKey: ["/api/saved-deals"],
    enabled: isAuthenticated,
  });

  const saveDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      await apiRequest("POST", `/api/deals/${dealId}/save`);
    },
    onSuccess: () => {
      toast({
        title: "Deal Saved",
        description: "Deal has been added to your saved list",
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
        description: "Failed to save deal",
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

  const displayDeals = searchQuery ? searchResults : deals;
  const filteredDeals = categoryFilter === "all" 
    ? displayDeals 
    : displayDeals.filter((deal: DealWithMerchant) => deal.category === categoryFilter);

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatDiscount = (percentage: number) => `${percentage}% OFF`;
  
  const isDealSaved = (dealId: number) => {
    return savedDeals.some((saved: any) => saved.dealId === dealId);
  };

  const categories = Array.from(new Set(deals.map((deal: DealWithMerchant) => deal.category)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            All Deals
          </h1>
          
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search deals, merchants, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            {searchQuery && (
              <span>Search results for "{searchQuery}" - </span>
            )}
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Deals Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeals.map((deal: DealWithMerchant) => {
            const timeLeft = new Date(deal.endTime).getTime() - new Date().getTime();
            const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
            
            return (
              <Card key={deal.id} className="hover:shadow-lg transition-shadow">
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
                      {hoursLeft}h left
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
                          disabled={claimDealMutation.isPending}
                        >
                          {claimDealMutation.isPending ? "Claiming..." : "Claim Deal"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => saveDealMutation.mutate(deal.id)}
                          disabled={saveDealMutation.isPending || isDealSaved(deal.id)}
                        >
                          {isDealSaved(deal.id) ? (
                            <StarIcon className="w-4 h-4 fill-current" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => authModal.openModal(`/deals`)}
                      >
                        Sign In to Claim
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredDeals.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No deals found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {searchQuery 
                ? "Try adjusting your search terms or filters"
                : "Check back later for new deals"
              }
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="deals" 
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