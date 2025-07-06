import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAudit } from "@/hooks/useAudit";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import DealCard from "@/components/deals/DealCard";
import DealModal from "@/components/deals/DealModal";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, Store, Crown, MapPin, Calendar, Mail, Star, Phone, Edit2, Eye, Plus, Zap, TrendingUp, Heart, Trophy, ShoppingBag, Bell, Shield, ChevronRight, LogOut, MapPinIcon, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { DealWithMerchant } from "@shared/schema";

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { logAction } = useAudit();
  const { toast } = useToast();

  // Check if user is a merchant
  const isMerchant = user?.role === 'merchant';

  // Mutation to promote user to merchant
  const promoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/auth/promote-to-merchant", "POST", {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      logAction("User Promoted", "User upgraded to merchant status");
    },
  });

  // Fetch user stats
  const { data: savedDeals = [] } = useQuery({
    queryKey: ["/api/saved-deals"],
    enabled: !!user,
  });

  const { data: claimedDeals = [] } = useQuery({
    queryKey: ["/api/claimed-deals"],
    enabled: !!user,
  });

  const { data: merchants = [] } = useQuery({
    queryKey: ["/api/my-merchants"],
    enabled: !!user && isMerchant,
  });

  // Fetch all available deals for customer users
  const { data: allDeals = [] } = useQuery({
    queryKey: ["/api/deals"],
    enabled: !!user && !isMerchant,
  });

  const [selectedDeal, setSelectedDeal] = useState<DealWithMerchant | null>(null);

  const handleDealClick = (deal: DealWithMerchant) => {
    setSelectedDeal(deal);
    logAction("Deal Viewed", `Viewed deal: ${deal.title}`);
  };

  // Mutation to claim a deal
  const claimDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      const response = await apiRequest(`/api/deals/${dealId}/claim`, "POST", {});
      return response;
    },
    onSuccess: (_, dealId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/claimed-deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      logAction("Deal Claimed", `Claimed deal ID: ${dealId}`);
    },
  });

  const handleDealClaim = () => {
    if (selectedDeal) {
      claimDealMutation.mutate(selectedDeal.id);
      setSelectedDeal(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Please Sign In</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Sign in to view your profile and manage your account
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Shield className="w-4 h-4 mr-2" />
                  Privacy Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Preferences
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.location.href = '/api/auth/logout'}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* My Deals Section for Customers */}
        {!isMerchant && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-green-600" />
                <span>My Deals</span>
              </CardTitle>
              <CardDescription>
                Deals you've claimed and saved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claimed Deals */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                    Claimed ({claimedDeals?.length || 0})
                  </h3>
                  {claimedDeals?.length > 0 ? (
                    <div className="space-y-2">
                      {claimedDeals.slice(0, 3).map((claimedDeal) => (
                        <div
                          key={claimedDeal.id}
                          className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-green-900 dark:text-green-100">
                                {claimedDeal.deal.title}
                              </p>
                              <p className="text-xs text-green-700 dark:text-green-300">
                                {claimedDeal.deal.merchant.name}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Claimed
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No claimed deals yet</p>
                  )}
                </div>

                {/* Saved Deals */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Heart className="w-4 h-4 mr-2 text-red-500" />
                    Saved ({savedDeals?.length || 0})
                  </h3>
                  {savedDeals?.length > 0 ? (
                    <div className="space-y-2">
                      {savedDeals.slice(0, 3).map((savedDeal) => (
                        <div
                          key={savedDeal.id}
                          className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                                {savedDeal.deal.title}
                              </p>
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                {savedDeal.deal.merchant.name}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Saved
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No saved deals yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Deals Section for Customers */}
        {!isMerchant && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <span>Available Deals</span>
              </CardTitle>
              <CardDescription>
                Discover flash deals near you
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Array.isArray(allDeals) && allDeals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allDeals.slice(0, 6).map((deal: DealWithMerchant) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => handleDealClick(deal)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPinIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No deals available</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Check back later for new flash deals in your area
                  </p>
                </div>
              )}
              {Array.isArray(allDeals) && allDeals.length > 6 && (
                <div className="mt-4 text-center">
                  <Button variant="outline" onClick={() => window.location.href = '/'}>
                    View All Deals on Map
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Account Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Receive updates about deals and account activity</div>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Location Preferences</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Set your preferred areas for deal discovery</div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Privacy Settings</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Control your data and privacy preferences</div>
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Array.isArray(savedDeals) ? savedDeals.length : 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Saved Deals</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{Array.isArray(claimedDeals) ? claimedDeals.length : 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Claimed Deals</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {isMerchant ? (Array.isArray(merchants) ? merchants.length : 0) : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {isMerchant ? "My Businesses" : "Business Status"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Merchant Section */}
        {isMerchant ? (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                    <Crown className="w-5 h-5" />
                    <span>Business Dashboard</span>
                  </CardTitle>
                  <CardDescription className="text-purple-600 dark:text-purple-400">
                    Manage your restaurants and create flash deals
                  </CardDescription>
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                  Dashboard integrated below ↓
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-medium">Manage Locations</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Add and edit business locations</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Star className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-medium">Create Deals</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Add flash deals to the map</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-600" />
                  <div>
                    <div className="font-medium">Analytics</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Track deal performance</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Crown className="w-12 h-12 text-purple-600" />
              </div>
              <CardTitle className="text-purple-900 dark:text-purple-100">
                Become a Merchant
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                Join FlashDeals as a business owner and start creating amazing deals for local customers to discover.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <Store className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium">Create Business Profile</div>
                    <div className="text-gray-600 dark:text-gray-300">Set up your business info</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <MapPin className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium">Add Deals to Map</div>
                    <div className="text-gray-600 dark:text-gray-300">Reach local customers</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <Star className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium">Track Performance</div>
                    <div className="text-gray-600 dark:text-gray-300">Monitor deal success</div>
                  </div>
                </div>
                <Button 
                  onClick={() => promoteMutation.mutate()}
                  disabled={promoteMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  {promoteMutation.isPending ? "Setting up..." : "Upgrade to Merchant"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Merchant Dashboard - Inline */}
        {isMerchant && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Store className="w-5 h-5" />
                  <span>My Businesses</span>
                </CardTitle>
                <CardDescription>
                  Manage your restaurants and locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Merchant Dashboard</h3>
                  <p className="text-gray-600 mb-4">Your business management tools are here</p>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Business
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Active Deals</span>
                </CardTitle>
                <CardDescription>
                  Monitor your flash deals performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Deal management coming soon</h3>
                  <p className="text-gray-600 mb-4">Create and manage your flash deals</p>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Deal
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>

      {/* Deal Modal for Customers */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onClaim={handleDealClaim}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="profile" 
        onAuditClick={() => {}} 
      />
    </div>
  );
}