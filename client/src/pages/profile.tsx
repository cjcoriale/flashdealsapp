import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAudit } from "@/hooks/useAudit";
import PageHeader from "@/components/layout/PageHeader";
import MerchantPortal from "@/components/MerchantPortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Settings, Store, Crown, MapPin, Calendar, Mail, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ProfilePage() {
  const [showMerchantPortal, setShowMerchantPortal] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const { logAction } = useAudit();

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="My Profile"
        showBackButton={true}
        backTo="/"
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xl">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-2xl font-bold">
                    {user.firstName} {user.lastName}
                  </h1>
                  {isMerchant && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                      <Crown className="w-3 h-3 mr-1" />
                      Merchant
                    </Badge>
                  )}
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300 space-x-4">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
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
                <Button 
                  onClick={() => {
                    setShowMerchantPortal(true);
                    logAction("Merchant Portal Accessed", "User opened merchant portal from profile");
                  }}
                  className="bg-purple-600 hover:bg-purple-700 shadow-lg"
                  size="lg"
                >
                  <Store className="w-4 h-4 mr-2" />
                  Manage Business
                </Button>
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
      </div>

      {/* Merchant Portal Modal */}
      {showMerchantPortal && (
        <MerchantPortal
          isOpen={showMerchantPortal}
          onClose={() => setShowMerchantPortal(false)}
        />
      )}
    </div>
  );
}