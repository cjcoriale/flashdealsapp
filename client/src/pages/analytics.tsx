import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Activity, AlertTriangle, TrendingUp, Clock, Star, Target } from "lucide-react";
import BottomNavigation from "@/components/layout/BottomNavigation";
import AuthModal from "@/components/auth/AuthModal";

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuth();
  const authModal = useAuthModal();
  
  const { data: auditStats } = useQuery({
    queryKey: ["/api/audit/stats"],
    enabled: isAuthenticated,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["/api/audit/logs"],
    enabled: isAuthenticated,
  });

  const { data: savedDeals = [] } = useQuery({
    queryKey: ["/api/saved-deals"],
    enabled: isAuthenticated,
  });

  const { data: claimedDeals = [] } = useQuery({
    queryKey: ["/api/claimed-deals"],
    enabled: isAuthenticated,
  });

  const { data: allDeals = [] } = useQuery({
    queryKey: ["/api/deals"],
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view analytics and usage statistics
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

  // Calculate personal analytics
  const totalSavings = claimedDeals.reduce((total: number, deal: any) => 
    total + ((deal.deal?.originalPrice - deal.deal?.discountedPrice) || 0), 0
  );

  const categoriesUsed = new Set(claimedDeals.map((deal: any) => deal.deal?.category)).size;
  
  const recentActivity = auditLogs.slice(0, 10);
  
  const dealsByCategory = allDeals.reduce((acc: any, deal: any) => {
    acc[deal.category] = (acc[deal.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Your usage statistics and platform insights
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Personal Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Your Statistics
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${totalSavings.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {claimedDeals.length} claimed deals
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saved Deals</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{savedDeals.length}</div>
                <p className="text-xs text-muted-foreground">
                  Deals bookmarked for later
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories Explored</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categoriesUsed}</div>
                <p className="text-xs text-muted-foreground">
                  Different deal categories
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Claimed This Month</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {claimedDeals.filter((deal: any) => {
                    const claimDate = new Date(deal.claimedAt);
                    const now = new Date();
                    return claimDate.getMonth() === now.getMonth() && 
                           claimDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Deals claimed recently
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Platform Statistics */}
        {auditStats && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Platform Statistics
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered platform users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditStats.actionsToday}</div>
                  <p className="text-xs text-muted-foreground">
                    Platform activities logged
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Errors</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{auditStats.errors}</div>
                  <p className="text-xs text-muted-foreground">
                    Errors tracked in logs
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Deal Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Deal Categories
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(dealsByCategory).map(([category, count]) => (
              <Card key={category}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-semibold capitalize">{category}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {count} deals available
                    </p>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Your recent actions on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                  No recent activity to display
                </p>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((log: any, index: number) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                      <div>
                        <h4 className="font-medium">{log.action}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {log.details}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.status === 'error' ? 'destructive' : 'secondary'}>
                          {log.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="analytics" 
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