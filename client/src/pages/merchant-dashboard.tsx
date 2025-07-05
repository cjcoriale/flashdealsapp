import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Store, Plus, Calendar, MapPin, Edit, TrendingUp } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMerchantSchema, insertDealSchema } from "@shared/schema";
import { z } from "zod";
import BottomNavigation from "@/components/layout/BottomNavigation";

const merchantFormSchema = insertMerchantSchema.extend({
  address: z.string().min(5, "Address is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const dealFormSchema = insertDealSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  originalPrice: z.number().min(0.01, "Price must be greater than 0"),
  discountedPrice: z.number().min(0.01, "Price must be greater than 0"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export default function MerchantDashboard() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<number | null>(null);
  
  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/my-merchants"],
    enabled: isAuthenticated,
  });

  const { data: merchantDeals = [] } = useQuery({
    queryKey: ["/api/merchants", selectedMerchant, "deals"],
    enabled: selectedMerchant !== null,
  });

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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Store className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Merchant Dashboard
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage your business and create deals
                </p>
              </div>
            </div>
            <Button onClick={() => setShowMerchantForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Business
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Deal Creation */}
        {merchants.length > 0 && (
          <div className="mb-8">
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Plus className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-blue-900 dark:text-blue-100">
                        Create New Deal
                      </CardTitle>
                      <CardDescription className="text-blue-700 dark:text-blue-300">
                        Add a flash deal for your customers to discover
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowDealForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Deal
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Merchant Profiles */}
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

        {/* Selected Merchant Deals */}
        {selectedMerchant && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Deals for Selected Business
              </h2>
              <Button onClick={() => setShowDealForm(true)}>
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
                  <Button onClick={() => setShowDealForm(true)}>
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

        {/* Create Merchant Form */}
        {showMerchantForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New Business</CardTitle>
              <CardDescription>
                Create a business profile to start offering deals
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
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...merchantForm.register("address")}
                    placeholder="Business address"
                  />
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      {...merchantForm.register("latitude", { valueAsNumber: true })}
                      placeholder="40.7128"
                    />
                  </div>
                  <div>
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      {...merchantForm.register("longitude", { valueAsNumber: true })}
                      placeholder="-74.0060"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...merchantForm.register("phone")}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button type="submit" disabled={createMerchantMutation.isPending}>
                    {createMerchantMutation.isPending ? "Creating..." : "Create Business"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowMerchantForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
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