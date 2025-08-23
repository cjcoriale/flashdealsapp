import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAudit } from "@/hooks/useAudit";
import { useToast } from "@/hooks/use-toast";
import EditProfileModal from "@/components/modals/EditProfileModal";

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
import { User, Settings, Store, Crown, MapPin, Star, Heart, Trophy, ShoppingBag, Bell, Shield, LogOut, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { DealClaimWithDetails, SavedDealWithDetails, Merchant } from "@shared/schema";

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
  const { data: savedDeals = [] } = useQuery<SavedDealWithDetails[]>({
    queryKey: ["/api/saved-deals"],
    enabled: !!user,
  });

  const { data: claimedDeals = [] } = useQuery<DealClaimWithDetails[]>({
    queryKey: ["/api/claimed-deals"],
    enabled: !!user,
  });

  const { data: merchants = [] } = useQuery<Merchant[]>({
    queryKey: ["/api/my-merchants"],
    enabled: !!user && isMerchant,
  });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

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
                <DropdownMenuItem onClick={() => setIsEditProfileOpen(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/notifications'}>
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
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
        {/* User Stats - Clean Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="w-5 h-5 text-red-500 mr-2" />
                  <div className="text-2xl font-bold text-red-600">{Array.isArray(savedDeals) ? savedDeals.length : 0}</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Saved Deals</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-green-500 mr-2" />
                  <div className="text-2xl font-bold text-green-600">{Array.isArray(claimedDeals) ? claimedDeals.length : 0}</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Claimed Deals</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Store className="w-5 h-5 text-purple-500 mr-2" />
                  <div className="text-2xl font-bold text-purple-600">
                    {isMerchant ? (Array.isArray(merchants) ? merchants.length : 0) : 0}
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {isMerchant ? "Businesses" : "Business Status"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your account and explore deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="justify-start h-12" 
                onClick={() => window.location.href = '/'}
              >
                <MapPin className="w-4 h-4 mr-3" />
                View Deals on Map
              </Button>
              {!isMerchant && (
                <Button 
                  variant="outline" 
                  className="justify-start h-12" 
                  onClick={() => window.location.href = '/saved-deals'}
                >
                  <Heart className="w-4 h-4 mr-3" />
                  My Saved Deals
                </Button>
              )}
              <Button 
                variant="outline" 
                className="justify-start h-12" 
                onClick={() => window.location.href = '/notifications'}
              >
                <Bell className="w-4 h-4 mr-3" />
                Notifications
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-12" 
                onClick={() => setIsEditProfileOpen(true)}
              >
                <User className="w-4 h-4 mr-3" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Merchant Section */}
        {isMerchant ? (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                <Crown className="w-5 h-5" />
                <span>Business Dashboard</span>
              </CardTitle>
              <CardDescription className="text-purple-600 dark:text-purple-400">
                Manage your business and create deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <Button 
                  onClick={() => window.location.href = '/merchant-dashboard'}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Store className="w-4 h-4 mr-2" />
                  Go to Merchant Dashboard
                </Button>
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
                Join FlashDeals as a business owner and start creating deals for local customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <Store className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium">Business Profile</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <MapPin className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium">Map Deals</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <Star className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="font-medium">Track Performance</div>
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

      </div>

      {/* Edit Profile Modal */}
      {user && (
        <EditProfileModal
          user={user}
          open={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
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