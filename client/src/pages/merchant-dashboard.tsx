import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Store, Plus, Calendar, MapPin, Edit, TrendingUp, ArrowLeft, Clock, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMerchantSchema, insertDealSchema } from "@shared/schema";
import { z } from "zod";
import BottomNavigation from "@/components/layout/BottomNavigation";
import PageHeader from "@/components/layout/PageHeader";

const merchantFormSchema = insertMerchantSchema.extend({
  address: z.string().min(5, "Address is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  imageUrl: z.string().url("Please enter a valid URL").optional(),
});

const dealFormSchema = insertDealSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  originalPrice: z.number().min(0.01, "Price must be greater than 0"),
  discountedPrice: z.number().min(0.01, "Price must be greater than 0"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export default function MerchantDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<number | null>(null);
  
  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/my-merchants"],
    enabled: isAuthenticated,
  });

  // Get deals for selected merchant
  const { data: merchantDeals = [] } = useQuery({
    queryKey: ["/api/merchants", selectedMerchant, "deals"],
    enabled: selectedMerchant !== null,
  });

  // Get all deals for the current user's merchants for recent deals display
  const { data: allUserDeals = [] } = useQuery({
    queryKey: ["/api/deals"],
    enabled: isAuthenticated,
    select: (data: any[]) => {
      // Filter deals to only show those from user's merchants
      const userMerchantIds = Array.isArray(merchants) ? merchants.map((m: any) => m.id) : [];
      return data.filter((deal: any) => userMerchantIds.includes(deal.merchantId));
    }
  });

  // Auto-show business creation form if no businesses exist
  useEffect(() => {
    if (!merchantsLoading && Array.isArray(merchants) && merchants.length === 0) {
      setShowMerchantForm(true);
    }
  }, [merchants, merchantsLoading]);

  const merchantForm = useForm({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      address: "",
      latitude: 0,
      longitude: 0,
      phone: "",
      imageUrl: "",
    },
  });

  const dealForm = useForm({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      originalPrice: 0,
      discountedPrice: 0,
      startTime: "",
      endTime: "",
      maxRedemptions: 100,
    },
  });

  const createMerchantMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/merchants", data);
    },
    onSuccess: () => {
      toast({
        title: "Merchant Created",
        description: "Your business profile has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      setShowMerchantForm(false);
      merchantForm.reset();
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
        description: "Failed to create merchant profile",
        variant: "destructive",
      });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/merchants/${selectedMerchant}/deals`, data);
    },
    onSuccess: () => {
      toast({
        title: "Deal Created",
        description: "Your deal has been created and is now live",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", selectedMerchant, "deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setShowDealForm(false);
      dealForm.reset();
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
        description: "Failed to create deal",
        variant: "destructive",
      });
    },
  });

  const onCreateMerchant = (data: any) => {
    const discountPercentage = Math.round(((data.originalPrice - data.discountedPrice) / data.originalPrice) * 100);
    createMerchantMutation.mutate(data);
  };

  const onCreateDeal = (data: any) => {
    const discountPercentage = Math.round(((data.originalPrice - data.discountedPrice) / data.originalPrice) * 100);
    createDealMutation.mutate({
      ...data,
      discountPercentage,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    });
  };

  const handleCreateDealClick = () => {
    // Check if user has any businesses
    if (!Array.isArray(merchants) || merchants.length === 0) {
      // Force business creation first
      toast({
        title: "Business Required",
        description: "You need to create a business profile before creating deals",
        variant: "destructive",
      });
      setShowMerchantForm(true);
      return;
    }
    setShowDealForm(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Merchant Dashboard
                </h1>
              </div>
              <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <CardTitle>Merchant Dashboard</CardTitle>
            <CardDescription>
              Please sign in to access the merchant dashboard
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
                Merchant Dashboard
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/api/auth/logout'}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Create Merchant Form */}
        {showMerchantForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create a Business to Get Started</CardTitle>
              <CardDescription>
                Set up your business profile to start offering flash deals to local customers. Add your business name, image, and address below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={merchantForm.handleSubmit(onCreateMerchant)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Business Name</Label>
                    <Input
                      id="name"
                      {...merchantForm.register("name")}
                      placeholder="Your business name"
                    />
                    {merchantForm.formState.errors.name && (
                      <p className="text-sm text-red-600 mt-1">
                        {merchantForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select onValueChange={(value) => merchantForm.setValue("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="health">Health & Beauty</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {merchantForm.formState.errors.category && (
                      <p className="text-sm text-red-600 mt-1">
                        {merchantForm.formState.errors.category.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...merchantForm.register("description")}
                    placeholder="Describe your business"
                  />
                </div>
                
                <div>
                  <Label htmlFor="imageUrl">Business Image URL</Label>
                  <Input
                    id="imageUrl"
                    {...merchantForm.register("imageUrl")}
                    placeholder="https://example.com/business-photo.jpg"
                  />
                </div>
                
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...merchantForm.register("address")}
                    placeholder="123 Main St, City, State"
                    onChange={(e) => {
                      const address = e.target.value;
                      merchantForm.setValue("address", address);
                      // Simple geocoding simulation - in real app, use Google Maps API
                      // For demo purposes, setting NYC coordinates
                      merchantForm.setValue("latitude", 40.7128);
                      merchantForm.setValue("longitude", -74.0060);
                    }}
                  />
                  {merchantForm.formState.errors.address && (
                    <p className="text-sm text-red-600 mt-1">
                      {merchantForm.formState.errors.address.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    {...merchantForm.register("phone")}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowMerchantForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMerchantMutation.isPending}>
                    {createMerchantMutation.isPending ? "Creating..." : "Create Business"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Array.isArray(allUserDeals) ? allUserDeals.reduce((total: number, deal: any) => total + (deal.currentRedemptions || 0), 0) : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Total Redemptions</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{Array.isArray(allUserDeals) ? allUserDeals.length : 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Active Deals</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Deals */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Your Recent Deals
            </CardTitle>
            <CardDescription>
              Manage your active flash deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Array.isArray(allUserDeals) && allUserDeals.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No deals yet
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Create your first flash deal to start attracting customers
                </p>
                <Button
                  onClick={handleCreateDealClick}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Deal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(allUserDeals) && allUserDeals.slice(0, 5).map((deal: any) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{deal.title}</h4>
                        <Badge variant="secondary">
                          {deal.discountPercentage}% OFF
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        ${deal.discountedPrice} (was ${deal.originalPrice})
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{deal.currentRedemptions || 0}/{deal.maxRedemptions} claimed</span>
                        <Badge variant={new Date(deal.endTime) > new Date() ? "default" : "destructive"}>
                          {new Date(deal.endTime) > new Date() ? "Active" : "Expired"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Merchant Profiles - Only show if businesses exist */}
        {!showMerchantForm && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Your Businesses
            </h2>
            
            {merchantsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : merchants.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No businesses yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Create your first business profile to start offering deals
                  </p>
                  <Button onClick={() => setShowMerchantForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Business
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.map((merchant: any) => (
                <Card 
                  key={merchant.id} 
                  className={`cursor-pointer transition-all ${
                    selectedMerchant === merchant.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedMerchant(merchant.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {merchant.name}
                      <Badge variant={merchant.isActive ? "default" : "secondary"}>
                        {merchant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{merchant.category}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {merchant.description}
                    </p>
                    <p className="text-xs text-gray-500">{merchant.address}</p>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Merchant Deals */}
        {!showMerchantForm && selectedMerchant && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Deals for Selected Business
              </h2>
              <Button onClick={handleCreateDealClick}>
                <Plus className="w-4 h-4 mr-2" />
                Create Deal
              </Button>
            </div>
            
            {merchantDeals.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No deals created</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Start attracting customers by creating your first deal
                  </p>
                  <Button onClick={handleCreateDealClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Deal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {merchantDeals.map((deal: any) => (
                  <Card key={deal.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {deal.title}
                        <Badge variant="secondary">
                          {deal.discountPercentage}% OFF
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        ${deal.discountedPrice} (was ${deal.originalPrice})
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        {deal.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          {deal.currentRedemptions || 0}/{deal.maxRedemptions} claimed
                        </span>
                        <Badge variant={new Date(deal.endTime) > new Date() ? "default" : "destructive"}>
                          {new Date(deal.endTime) > new Date() ? "Active" : "Expired"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}



        {/* Create Deal Form */}
        {showDealForm && selectedMerchant && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Deal</CardTitle>
              <CardDescription>
                Add a new deal for your selected business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={dealForm.handleSubmit(onCreateDeal)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deal-title">Deal Title</Label>
                    <Input
                      id="deal-title"
                      {...dealForm.register("title")}
                      placeholder="e.g., 50% Off Lunch Special"
                    />
                    {dealForm.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">
                        {dealForm.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="deal-category">Category</Label>
                    <Select onValueChange={(value) => dealForm.setValue("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food & Dining</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="health">Health & Beauty</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="deal-description">Description</Label>
                  <Textarea
                    id="deal-description"
                    {...dealForm.register("description")}
                    placeholder="Describe your deal offer"
                  />
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="originalPrice">Original Price</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      {...dealForm.register("originalPrice", { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="discountedPrice">Sale Price</Label>
                    <Input
                      id="discountedPrice"
                      type="number"
                      step="0.01"
                      {...dealForm.register("discountedPrice", { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxRedemptions">Max Claims</Label>
                    <Input
                      id="maxRedemptions"
                      type="number"
                      {...dealForm.register("maxRedemptions", { valueAsNumber: true })}
                      placeholder="100"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Date & Time</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      {...dealForm.register("startTime")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Date & Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      {...dealForm.register("endTime")}
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createDealMutation.isPending}>
                    {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowDealForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="merchant" 
        onAuditClick={() => {}} 
      />
    </div>
  );
}