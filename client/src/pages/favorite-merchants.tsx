import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Star, MapPin, Phone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/layout/PageHeader";
import { apiRequest } from "@/lib/queryClient";
import type { Merchant } from "@shared/schema";

interface MerchantWithFavorite extends Merchant {
  isFavorited: boolean;
}

export default function FavoriteMerchants() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'favorites' | 'all'>('all');

  // Get all merchants
  const { data: allMerchants = [], isLoading: loadingAll } = useQuery<Merchant[]>({
    queryKey: ['/api/merchants'],
    enabled: viewMode === 'all',
  });

  // Get user's favorite merchants
  const { data: favoriteMerchants = [], isLoading: loadingFavorites } = useQuery<Merchant[]>({
    queryKey: ['/api/favorite-merchants'],
    enabled: isAuthenticated,
  });

  // Get favorited merchant IDs for checking status
  const favoritedIds = new Set(favoriteMerchants.map((m: Merchant) => m.id));

  // Combine data for "all" view
  const allMerchantsWithFavorite: MerchantWithFavorite[] = allMerchants.map((merchant: Merchant) => ({
    ...merchant,
    isFavorited: favoritedIds.has(merchant.id),
  }));

  const favoriteMutation = useMutation({
    mutationFn: async ({ merchantId, action }: { merchantId: number; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        return apiRequest('POST', `/api/merchants/${merchantId}/favorite`);
      } else {
        return apiRequest('DELETE', `/api/merchants/${merchantId}/favorite`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorite-merchants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/merchants'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = (merchantId: number, isFavorited: boolean) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to favorite merchants",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({
      merchantId,
      action: isFavorited ? 'remove' : 'add',
    });
  };

  const formatRating = (rating: number) => `${rating.toFixed(1)}`;
  
  const displayMerchants: (Merchant | MerchantWithFavorite)[] = viewMode === 'favorites' ? favoriteMerchants : allMerchantsWithFavorite;
  const isLoading = viewMode === 'favorites' ? loadingFavorites : loadingAll;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <PageHeader 
        title="Favorite Merchants" 
        backTo="/profile"
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'favorites' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('favorites')}
            >
              My Favorites
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              Browse All
            </Button>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-8">
        {displayMerchants.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {viewMode === 'favorites' 
                ? "No favorite merchants yet" 
                : "No merchants available"
              }
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {viewMode === 'favorites'
                ? "Browse merchants and favorite them to see all their deals!"
                : "Check back later for new merchants in your area."
              }
            </p>
            {viewMode === 'favorites' && (
              <Button onClick={() => setViewMode('all')}>
                Browse All Merchants
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayMerchants.map((merchant: Merchant | MerchantWithFavorite) => {
              const isFavorited = 'isFavorited' in merchant ? merchant.isFavorited : true;
              
              return (
                <Card key={merchant.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {merchant.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {merchant.category}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleFavorite(merchant.id, isFavorited)}
                        disabled={favoriteMutation.isPending}
                        className={`p-2 ${isFavorited ? 'text-red-500' : 'text-gray-400'}`}
                      >
                        <Heart 
                          className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} 
                        />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {merchant.description}
                      </p>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{merchant.address}</span>
                      </div>

                      {merchant.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Phone className="w-4 h-4" />
                          <span>{merchant.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">
                            {formatRating(merchant.rating || 0)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({merchant.reviewCount} reviews)
                          </span>
                        </div>
                        
                        {isFavorited && (
                          <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            <Heart className="w-3 h-3 fill-current" />
                            <span>Favorited</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {viewMode === 'favorites' && favoriteMerchants.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Pro Tip: Favorited merchants
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              You'll see <strong>all deals</strong> from your favorited merchants, regardless of your location. 
              Other merchants only show deals when you're nearby!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}