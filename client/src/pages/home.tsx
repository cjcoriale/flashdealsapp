import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Star, User, LogOut } from "lucide-react";
import { DealWithMerchant } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  
  const { data: savedDeals = [] } = useQuery({
    queryKey: ["/api/saved-deals"],
  });

  const { data: claimedDeals = [] } = useQuery({
    queryKey: ["/api/claimed-deals"],
  });

  const { data: recentDeals = [] } = useQuery({
    queryKey: ["/api/deals"],
  });

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatDiscount = (percentage: number) => `${percentage}% OFF`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Discover amazing deals near you
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/api/logout'}
            className="flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Deals</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savedDeals.length}</div>
              <p className="text-xs text-muted-foreground">
                Deals you've bookmarked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claimed Deals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claimedDeals.length}</div>
              <p className="text-xs text-muted-foreground">
                Deals you've claimed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <Badge variant="secondary">$</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${claimedDeals.reduce((total: number, deal: any) => 
                  total + (deal.deal?.originalPrice - deal.deal?.discountedPrice || 0), 0
                ).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Money saved with deals
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => window.location.href = '/map'} 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <MapPin className="w-6 h-6" />
            <span>Browse Map</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/saved-deals'} 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Star className="w-6 h-6" />
            <span>Saved Deals</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/deals'} 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Clock className="w-6 h-6" />
            <span>All Deals</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/analytics'} 
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Badge className="w-6 h-6" />
            <span>Analytics</span>
          </Button>
        </div>

        {/* Recent Deals */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Deals
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentDeals.slice(0, 6).map((deal: DealWithMerchant) => (
              <Card key={deal.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{deal.title}</CardTitle>
                    <Badge variant="secondary">
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
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline">
                      <Star className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {claimedDeals.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Recently Claimed
            </h2>
            <div className="space-y-4">
              {claimedDeals.slice(0, 3).map((claim: any) => (
                <Card key={claim.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{claim.deal?.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {claim.deal?.merchant?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Saved {formatPrice(claim.deal?.originalPrice - claim.deal?.discountedPrice || 0)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(claim.claimedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}