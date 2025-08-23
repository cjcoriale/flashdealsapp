import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronLeft, MapPin, Clock, DollarSign, Loader2, Archive, Trash2 } from "lucide-react";
import { DealClaimWithDetails } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import BottomNavigation from "@/components/layout/BottomNavigation";

export default function ClaimedDealsPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  // Fetch active claimed deals
  const { data: claimedDeals = [], isLoading: loadingActive } = useQuery<DealClaimWithDetails[]>({
    queryKey: ["/api/claimed-deals"],
    enabled: !!user && viewMode === 'active',
  });

  // Fetch archived claimed deals
  const { data: archivedDeals = [], isLoading: loadingArchived } = useQuery<DealClaimWithDetails[]>({
    queryKey: ["/api/claimed-deals/archived"],
    enabled: !!user && viewMode === 'archived',
  });

  // Archive deal mutation
  const archiveMutation = useMutation({
    mutationFn: async (claimId: number) => {
      await apiRequest("PATCH", `/api/claimed-deals/${claimId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claimed-deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/claimed-deals/archived"] });
      toast({
        title: "Deal Archived",
        description: "Deal has been moved to your archive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive deal",
        variant: "destructive",
      });
    },
  });

  // Delete deal mutation
  const deleteMutation = useMutation({
    mutationFn: async (claimId: number) => {
      await apiRequest("DELETE", `/api/claimed-deals/${claimId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claimed-deals/archived"] });
      toast({
        title: "Deal Deleted",
        description: "Deal has been permanently removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete deal",
        variant: "destructive",
      });
    },
  });

  const displayDeals = viewMode === 'active' ? claimedDeals : archivedDeals;
  const isLoading = viewMode === 'active' ? loadingActive : loadingArchived;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-green-500" />
                My Claimed Deals
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {viewMode === 'active' 
                  ? claimedDeals.length > 0 
                    ? `You have ${claimedDeals.length} active deal${claimedDeals.length === 1 ? '' : 's'}`
                    : "Track your claimed deals and savings"
                  : archivedDeals.length > 0
                    ? `You have ${archivedDeals.length} archived deal${archivedDeals.length === 1 ? '' : 's'}`
                    : "Your archived deals will appear here"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active/Archive Toggle */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('active')}
              className="flex-1"
            >
              Active
              {claimedDeals.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {claimedDeals.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={viewMode === 'archived' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('archived')}
              className="flex-1"
            >
              Archive
              {archivedDeals.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {archivedDeals.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Savings Summary - Pinned at top */}
      {claimedDeals.length > 0 && viewMode === 'active' && (
        <div className="bg-white dark:bg-gray-800 border-b shadow-sm">
          <div className="max-w-4xl mx-auto p-4">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Your Savings Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {claimedDeals.length}
                    </div>
                    <div className="text-sm text-green-600 font-medium">Deals Claimed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      ${claimedDeals.reduce((total, claim) => {
                        const savings = claim.deal.originalPrice - claim.deal.discountedPrice;
                        return total + savings;
                      }, 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600 font-medium">Total Saved</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {displayDeals.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="py-12 text-center">
              {viewMode === 'active' ? (
                <>
                  <Trophy className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Deals</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Start claiming deals from the map to see them here. Each deal you claim will appear in this list.
                  </p>
                  <Button onClick={() => window.location.href = '/'}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Find Deals to Claim
                  </Button>
                </>
              ) : (
                <>
                  <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Archived Deals</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Deals you archive will appear here for future reference.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          // Claimed deals list
          <div className="space-y-4">
            {displayDeals.map((claimedDeal) => {
              const deal = claimedDeal.deal;
              const merchant = deal.merchant;
              const savings = deal.originalPrice - deal.discountedPrice;
              
              return (
                <Card key={claimedDeal.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {deal.title}
                          </h3>
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <Trophy className="w-3 h-3 mr-1" />
                            Claimed
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {deal.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {merchant.name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Claimed {claimedDeal.claimedAt ? format(new Date(claimedDeal.claimedAt), "MMM dd, yyyy") : "Recently"}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-green-600">
                              ${deal.discountedPrice.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500 line-through">
                              ${deal.originalPrice.toFixed(2)}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-green-700 bg-green-100">
                            Save ${savings.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {deal.discountPercentage}% OFF
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Status: {claimedDeal.status}
                        </div>
                        <div className="mt-3">
                          {viewMode === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => archiveMutation.mutate(claimedDeal.id)}
                              disabled={archiveMutation.isPending}
                            >
                              <Archive className="w-4 h-4 mr-1" />
                              Archive
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(claimedDeal.id)}
                              disabled={deleteMutation.isPending}
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation currentPage="profile" onAuditClick={() => {}} />
    </div>
  );
}