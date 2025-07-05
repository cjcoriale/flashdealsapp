import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  merchantId: z.number().min(1, "Please select a business location"),
});

export default function MerchantDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealFormStep, setDealFormStep] = useState(1);
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

  // Auto-select first merchant when merchants are loaded
  useEffect(() => {
    if (!merchantsLoading && Array.isArray(merchants) && merchants.length > 0 && !selectedMerchant) {
      setSelectedMerchant(merchants[0].id);
    }
  }, [merchantsLoading, merchants, selectedMerchant]);

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
      discountPercentage: 0,
      startTime: "",
      endTime: "",
      maxRedemptions: 100,
      merchantId: 0,
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
      // Force refetch all deal-related queries
      queryClient.refetchQueries({ queryKey: ["/api/deals"] });
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
    if (!selectedMerchant) {
      toast({
        title: "Error",
        description: "Please select a business first",
        variant: "destructive",
      });
      return;
    }

    const discountPercentage = Math.round(((data.originalPrice - data.discountedPrice) / data.originalPrice) * 100);
    
    const dealData = {
      ...data,
      merchantId: selectedMerchant,
      discountPercentage,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    };
    
    createDealMutation.mutate(dealData);
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
    
    // Set the merchant ID in the form to the selected merchant
    if (selectedMerchant) {
      dealForm.setValue("merchantId", selectedMerchant);
    }
    
    setDealFormStep(1);
    setShowDealForm(true);
  };

  const renderStepIndicator = () => {
    const steps = ["Basic Info", "Pricing", "Timing"];
    return (
      <div className="flex items-center justify-center mb-6 overflow-x-auto">
        <div className="flex items-center min-w-max px-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index + 1 <= dealFormStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-xs sm:text-sm whitespace-nowrap ${
                index + 1 <= dealFormStep 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-500'
              }`}>
                {step}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-4 sm:w-8 h-0.5 mx-2 sm:mx-4 ${
                  index + 1 < dealFormStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
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
                  Create Deal
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
            <CardTitle>Create Deal</CardTitle>
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
                {Array.isArray(merchants) && merchants.length > 0 ? (
                  selectedMerchant 
                    ? `${merchants.find((m: any) => m.id === selectedMerchant)?.name || 'Location'} Dashboard`
                    : `${merchants[0]?.name || 'Location'} Dashboard`
                ) : 'Create Deal'}
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
              <CardTitle>Create a Location</CardTitle>
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
                      // Set coordinates based on address context
                      if (address.toLowerCase().includes("arizona") || address.toLowerCase().includes("az") || address.toLowerCase().includes("scottsdale")) {
                        // Arizona coordinates
                        merchantForm.setValue("latitude", 33.4942);
                        merchantForm.setValue("longitude", -112.1236);
                      } else {
                        // Default to NYC coordinates
                        merchantForm.setValue("latitude", 40.7128);
                        merchantForm.setValue("longitude", -74.0060);
                      }
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

        {/* Your Locations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Your Locations
          </h2>
          
          {merchantsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : merchants.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Create your first location to start offering deals
                </p>
                <Button onClick={() => setShowMerchantForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
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
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      {merchant.name}
                    </CardTitle>
                    <CardDescription>
                      {merchant.category}
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





        {/* Selected Merchant Deals */}
        {!showMerchantForm && selectedMerchant && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Deals for Selected Location
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

        {/* Create Deal Modal */}
        <Dialog open={showDealForm} onOpenChange={(open) => {
          setShowDealForm(open);
          if (!open) setDealFormStep(1);
        }}>
          <DialogContent className="sm:max-w-2xl w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
            <DialogHeader className="px-4 pt-6 pb-2">
              <DialogTitle>Create New Deal - Step {dealFormStep} of 3</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-4 pb-6">
              {renderStepIndicator()}
              
              <form onSubmit={dealForm.handleSubmit(onCreateDeal, (errors) => {
                console.log("Form validation errors:", errors);
                toast({
                  title: "Form Error",
                  description: "Please check all required fields",
                  variant: "destructive",
                });
              })} className="space-y-6">
                {/* Step 1: Basic Information */}
                {dealFormStep === 1 && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">Basic Information</h3>
                      <p className="text-gray-600 text-sm">Tell us about your deal</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="deal-title">Deal Title *</Label>
                      <Input
                        id="deal-title"
                        {...dealForm.register("title")}
                        placeholder="e.g., 50% Off Lunch Special"
                        className="mt-1"
                      />
                      {dealForm.formState.errors.title && (
                        <p className="text-sm text-red-600 mt-1">
                          {dealForm.formState.errors.title.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="deal-description">Description</Label>
                      <Textarea
                        id="deal-description"
                        {...dealForm.register("description")}
                        placeholder="Describe your deal in detail..."
                        rows={3}
                        className="mt-1"
                      />
                      {dealForm.formState.errors.description && (
                        <p className="text-sm text-red-600 mt-1">
                          {dealForm.formState.errors.description.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="deal-category">Category *</Label>
                      <Select onValueChange={(value) => dealForm.setValue("category", value)}>
                        <SelectTrigger className="mt-1">
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
                      {dealForm.formState.errors.category && (
                        <p className="text-sm text-red-600 mt-1">
                          {dealForm.formState.errors.category.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="deal-merchant">Business Location *</Label>
                      <Select 
                        onValueChange={(value) => dealForm.setValue("merchantId", parseInt(value))}
                        defaultValue={selectedMerchant ? selectedMerchant.toString() : undefined}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select business location" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(merchants) && merchants.map((merchant: any) => (
                            <SelectItem key={merchant.id} value={merchant.id.toString()}>
                              {merchant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dealForm.formState.errors.merchantId && (
                        <p className="text-sm text-red-600 mt-1">
                          {dealForm.formState.errors.merchantId.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Pricing */}
                {dealFormStep === 2 && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">Pricing Details</h3>
                      <p className="text-gray-600 text-sm">Set your original and discounted prices</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deal-original-price">Original Price *</Label>
                        <Input
                          id="deal-original-price"
                          type="number"
                          step="0.01"
                          {...dealForm.register("originalPrice", { valueAsNumber: true })}
                          placeholder="0.00"
                          className="mt-1"
                        />
                        {dealForm.formState.errors.originalPrice && (
                          <p className="text-sm text-red-600 mt-1">
                            {dealForm.formState.errors.originalPrice.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="deal-discounted-price">Sale Price *</Label>
                        <Input
                          id="deal-discounted-price"
                          type="number"
                          step="0.01"
                          {...dealForm.register("discountedPrice", { valueAsNumber: true })}
                          placeholder="0.00"
                          className="mt-1"
                        />
                        {dealForm.formState.errors.discountedPrice && (
                          <p className="text-sm text-red-600 mt-1">
                            {dealForm.formState.errors.discountedPrice.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Discount Preview */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Discount Preview</h4>
                      <div className="text-sm text-blue-800">
                        <div>Original Price: ${dealForm.watch("originalPrice") || 0}</div>
                        <div>Sale Price: ${dealForm.watch("discountedPrice") || 0}</div>
                        <div className="font-semibold">
                          Savings: ${Math.max(0, (dealForm.watch("originalPrice") || 0) - (dealForm.watch("discountedPrice") || 0))} 
                          ({dealForm.watch("originalPrice") > 0 ? Math.round(((dealForm.watch("originalPrice") - dealForm.watch("discountedPrice")) / dealForm.watch("originalPrice")) * 100) : 0}% off)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Timing */}
                {dealFormStep === 3 && (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold">Deal Timing</h3>
                      <p className="text-gray-600 text-sm">When will this deal be available?</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="deal-start-time">Start Time *</Label>
                        <Input
                          id="deal-start-time"
                          type="datetime-local"
                          {...dealForm.register("startTime")}
                          className="mt-1"
                        />
                        {dealForm.formState.errors.startTime && (
                          <p className="text-sm text-red-600 mt-1">
                            {dealForm.formState.errors.startTime.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="deal-end-time">End Time *</Label>
                        <Input
                          id="deal-end-time"
                          type="datetime-local"
                          {...dealForm.register("endTime")}
                          className="mt-1"
                        />
                        {dealForm.formState.errors.endTime && (
                          <p className="text-sm text-red-600 mt-1">
                            {dealForm.formState.errors.endTime.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Deal Summary */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">Deal Summary</h4>
                      <div className="text-sm text-green-800 space-y-1">
                        <div><strong>Title:</strong> {dealForm.watch("title") || "Not set"}</div>
                        <div><strong>Category:</strong> {dealForm.watch("category") || "Not set"}</div>
                        <div><strong>Price:</strong> ${dealForm.watch("discountedPrice") || 0} (was ${dealForm.watch("originalPrice") || 0})</div>
                        <div><strong>Business:</strong> {
                          Array.isArray(merchants) && merchants.find((m: any) => m.id === dealForm.watch("merchantId"))?.name || "Not selected"
                        }</div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div>
                    {dealFormStep > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setDealFormStep(dealFormStep - 1)}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowDealForm(false)}
                    >
                      Cancel
                    </Button>
                    
                    {dealFormStep < 3 ? (
                      <Button 
                        type="button" 
                        onClick={() => setDealFormStep(dealFormStep + 1)}
                        className="min-w-[120px]"
                      >
                        Next Step
                      </Button>
                    ) : (
                      <Button 
                        type="submit" 
                        disabled={createDealMutation.isPending}
                        className="min-w-[120px]"
                        onClick={(e) => {
                          console.log("Create Deal button clicked");
                          console.log("Form errors:", dealForm.formState.errors);
                          console.log("Form values:", dealForm.getValues());
                          console.log("Form is valid:", dealForm.formState.isValid);
                        }}
                      >
                        {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation 
        currentPage="merchant" 
        onAuditClick={() => {}} 
      />
    </div>
  );
}