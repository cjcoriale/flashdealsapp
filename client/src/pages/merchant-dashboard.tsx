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
import { Store, Plus, Calendar, MapPin, Edit, TrendingUp, ArrowLeft, Clock, LogOut, Settings, User, Bell, Shield, Mail, MoreVertical, Trash2, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  isRecurring: z.boolean().optional(),
  recurringInterval: z.string().optional(),
}).refine((data) => {
  if (data.isRecurring && !data.recurringInterval) {
    return false;
  }
  return true;
}, {
  message: "Recurring interval is required when deal is set to recurring",
  path: ["recurringInterval"],
});

export default function MerchantDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealFormStep, setDealFormStep] = useState(1);
  const [selectedMerchant, setSelectedMerchant] = useState<number | null>(null);
  const [showSuperMerchantTools, setShowSuperMerchantTools] = useState(false);
  const [showBulkBusinessForm, setShowBulkBusinessForm] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [superMerchantPassword, setSuperMerchantPassword] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [dealsSearchQuery, setDealsSearchQuery] = useState("");
  const [currentlyManaging, setCurrentlyManaging] = useState<any>(null);
  
  // Debug logging for search state (can be removed in production)
  // console.log("Current search state:", { searchQuery, searchResults: searchResults.length, isSearching, showBulkBusinessForm });
  
  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/my-merchants"],
    enabled: isAuthenticated,
  });

  // Get all deals for selected merchant (both active and expired)
  const { data: allMerchantDeals = [] } = useQuery({
    queryKey: [`/api/merchants/${selectedMerchant}/deals`],
    enabled: selectedMerchant !== null,
  });

  // Get expired deals for selected merchant  
  const { data: expiredDeals = [] } = useQuery({
    queryKey: [`/api/merchants/${selectedMerchant}/deals/expired`],
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
      setCurrentlyManaging(merchants[0]);
    }
  }, [merchantsLoading, merchants, selectedMerchant]);

  // Update currently managing when selected merchant changes
  useEffect(() => {
    if (selectedMerchant && Array.isArray(merchants)) {
      const merchant = merchants.find((m: any) => m.id === selectedMerchant);
      setCurrentlyManaging(merchant);
    }
  }, [selectedMerchant, merchants]);

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
      isRecurring: false,
      recurringInterval: "",
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
      setEditingMerchant(null);
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

  const updateMerchantMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/merchants/${data.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Business Updated",
        description: "Your business has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      setEditingMerchant(null);
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
        description: "Failed to update business",
        variant: "destructive",
      });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (merchantId: number) => {
      return await apiRequest("DELETE", `/api/merchants/${merchantId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Business Deleted",
        description: "Business has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      setShowDeleteConfirm(null);
      if (selectedMerchant === showDeleteConfirm) {
        setSelectedMerchant(null);
      }
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
        description: "Failed to delete business",
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

  const repostDealMutation = useMutation({
    mutationFn: async ({ dealId, startTime, endTime }: { dealId: number, startTime: string, endTime: string }) => {
      return await apiRequest("POST", `/api/deals/${dealId}/repost`, { startTime, endTime });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Deal reposted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${selectedMerchant}/deals/expired`] });
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${selectedMerchant}/deals`] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
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
        description: "Failed to repost deal",
        variant: "destructive",
      });
    },
  });

  // Super merchant promotion mutation
  const promoteSuperMerchantMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/users/${user?.id}/promote-super-merchant`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "You are now a Super Merchant! You can create multiple businesses and manage them all.",
      });
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
        description: "Failed to promote to super merchant",
        variant: "destructive",
      });
    },
  });

  // Bulk business creation mutation
  const createBulkBusinessesMutation = useMutation({
    mutationFn: async (businesses: any[]) => {
      return await apiRequest("POST", '/api/super-merchant/bulk-businesses', { businesses });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      toast({
        title: "Success",
        description: `Created ${data.businesses?.length || 0} businesses successfully!`,
      });
      setShowBulkBusinessForm(false);
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
        description: "Failed to create businesses in bulk",
        variant: "destructive",
      });
    },
  });

  // Search businesses mutation
  const searchBusinessesMutation = useMutation({
    mutationFn: async (query: string) => {
      setIsSearching(true);
      const response = await apiRequest("POST", '/api/super-merchant/search-businesses', { query });
      console.log("Search API response:", response);
      return response;
    },
    onSuccess: (data: any) => {
      console.log("Search mutation success data:", data);
      const results = data?.results || [];
      setSearchResults(results);
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${results.length} businesses`,
      });
    },
    onError: (error) => {
      setIsSearching(false);
      toast({
        title: "Search Failed",
        description: "Could not search businesses. Try again.",
        variant: "destructive",
      });
    },
  });

  // Create business from search result mutation
  const createFromSearchMutation = useMutation({
    mutationFn: async (businessData: any) => {
      return await apiRequest("POST", "/api/merchants", businessData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      toast({
        title: "Business Created",
        description: "Business created successfully from search result",
      });
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
        description: "Failed to create business",
        variant: "destructive",
      });
    },
  });

  const handleRepostDeal = (deal: any) => {
    // Set new times - start now, end in 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const startTime = now.toISOString();
    const endTime = tomorrow.toISOString();
    
    repostDealMutation.mutate({ 
      dealId: deal.id, 
      startTime, 
      endTime 
    });
  };

  const onCreateMerchant = (data: any) => {
    if (editingMerchant) {
      updateMerchantMutation.mutate({ ...data, id: editingMerchant.id });
    } else {
      createMerchantMutation.mutate(data);
    }
  };

  const handleEditMerchant = (merchant: any) => {
    setEditingMerchant(merchant);
    merchantForm.reset({
      name: merchant.name,
      description: merchant.description,
      category: merchant.category,
      address: merchant.address,
      latitude: merchant.latitude,
      longitude: merchant.longitude,
      phone: merchant.phone,
      imageUrl: merchant.imageUrl,
    });
    setShowMerchantForm(true);
  };

  const handleDeleteMerchant = (merchantId: number) => {
    setShowDeleteConfirm(merchantId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      deleteMerchantMutation.mutate(showDeleteConfirm);
    }
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

  const verifyPassword = () => {
    // Simple password verification (in production, use more secure method)
    if (superMerchantPassword === "flashdeals2025") {
      setIsPasswordVerified(true);
      setShowPasswordPrompt(false);
      setShowBulkBusinessForm(true);
      setSuperMerchantPassword("");
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchResults([]); // Clear previous results
      searchBusinessesMutation.mutate(searchQuery);
    }
  };

  const createBusinessFromResult = (result: any) => {
    const businessData = {
      name: result.name,
      category: result.category || "restaurant",
      description: result.description || `${result.name} - ${result.address}`,
      address: result.address,
      latitude: result.latitude || 40.7128,
      longitude: result.longitude || -74.0060,
      phone: result.phone || "",
      imageUrl: result.imageUrl || result.photo || "",
    };
    createFromSearchMutation.mutate(businessData);
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
              <Button variant="outline" size="sm" disabled>
                <Settings className="w-4 h-4" />
              </Button>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user?.role !== 'super_merchant' && (
                  <DropdownMenuItem onClick={() => promoteSuperMerchantMutation.mutate()}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Become Super Merchant
                  </DropdownMenuItem>
                )}
                {user?.role === 'super_merchant' && (
                  <>
                    <DropdownMenuItem onClick={() => setShowPasswordPrompt(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Super Merchant Tools
                    </DropdownMenuItem>
                    <Badge variant="secondary" className="mx-2 mb-2 text-xs">
                      Super Merchant
                    </Badge>
                  </>
                )}
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

      <div className="container mx-auto px-4 py-8">
        {/* Currently Managing Box */}
        {currentlyManaging && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    {currentlyManaging.imageUrl ? (
                      <img 
                        src={currentlyManaging.imageUrl} 
                        alt={currentlyManaging.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                        <Store className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Currently Managing</p>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">{currentlyManaging.name}</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{currentlyManaging.address}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}



        {/* Create Merchant Form */}
        {showMerchantForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingMerchant ? 'Edit Business' : 'Create a Location'}</CardTitle>
              <CardDescription>
                {editingMerchant 
                  ? 'Update your business information' 
                  : 'Set up your business profile to start offering flash deals to local customers. Add your business name, image, and address below.'
                }
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
                    onClick={() => {
                      setShowMerchantForm(false);
                      setEditingMerchant(null);
                      merchantForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMerchantMutation.isPending || updateMerchantMutation.isPending}>
                    {editingMerchant 
                      ? (updateMerchantMutation.isPending ? "Updating..." : "Update Business")
                      : (createMerchantMutation.isPending ? "Creating..." : "Create Business")
                    }
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

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
            {/* Search bar for deals */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by restaurant or deal name..."
                  value={dealsSearchQuery}
                  onChange={(e) => setDealsSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

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
              <div className="space-y-3">
                {Array.isArray(allUserDeals) && allUserDeals
                  .filter((deal: any) => {
                    if (!dealsSearchQuery) return true;
                    const searchLower = dealsSearchQuery.toLowerCase();
                    const merchantName = Array.isArray(merchants) 
                      ? merchants.find((m: any) => m.id === deal.merchantId)?.name || ""
                      : "";
                    return (
                      deal.title.toLowerCase().includes(searchLower) ||
                      merchantName.toLowerCase().includes(searchLower)
                    );
                  })
                  .slice(0, 2)
                  .map((deal: any) => {
                    const merchantName = Array.isArray(merchants) 
                      ? merchants.find((m: any) => m.id === deal.merchantId)?.name || "Unknown Restaurant"
                      : "Unknown Restaurant";
                    
                    return (
                      <div
                        key={deal.id}
                        className="relative p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {/* Percentage off in top right corner */}
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs font-bold">
                            {deal.discountPercentage}% OFF
                          </Badge>
                        </div>
                        
                        <div className="pr-16">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-sm">{deal.title}</h4>
                            <span className="text-xs text-gray-500">• {merchantName}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {deal.isRecurring && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Recurring
                                </Badge>
                              )}
                              <Badge variant={new Date(deal.endTime) > new Date() ? "default" : "destructive"} className="text-xs">
                                {new Date(deal.endTime) > new Date() ? "Active" : "Expired"}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {deal.currentRedemptions || 0}/{deal.maxRedemptions} claimed
                          </div>
                        </div>
                      </div>
                    );
                  })}
                
                {/* See more link */}
                {Array.isArray(allUserDeals) && allUserDeals.length > 2 && (
                  <div className="text-center pt-2">
                    <Button variant="link" className="text-blue-600 hover:text-blue-800 text-sm">
                      See more deals ({allUserDeals.length - 2} remaining)
                    </Button>
                  </div>
                )}
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





        {/* Change Locations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Change Locations
          </h2>
          
          {/* Location Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search locations..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {merchantsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (merchants as any[]).length === 0 ? (
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
              {(merchants as any[])
                .filter((merchant: any) => {
                  if (!locationSearchQuery) return true;
                  const searchLower = locationSearchQuery.toLowerCase();
                  return (
                    merchant.name.toLowerCase().includes(searchLower) ||
                    merchant.address.toLowerCase().includes(searchLower) ||
                    merchant.category.toLowerCase().includes(searchLower) ||
                    (merchant.description && merchant.description.toLowerCase().includes(searchLower))
                  );
                })
                .map((merchant: any) => (
                <Card 
                  key={merchant.id} 
                  className={`cursor-pointer transition-all ${
                    selectedMerchant === merchant.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedMerchant(merchant.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-5 h-5" />
                        {merchant.name}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditMerchant(merchant);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Business
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMerchant(merchant.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Business
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                        placeholder="Enter your deal title"
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
                        placeholder="Provide details about your deal"
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
                          {/* Categories will be populated based on business types */}
                          {Array.isArray(merchants) && merchants.length > 0 && 
                            Array.from(new Set(merchants.map((m: any) => m.category))).map((category: string) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))
                          }
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
                    
                    {/* Recurring Options */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="recurring-checkbox"
                          checked={dealForm.watch("isRecurring") || false}
                          onChange={(e) => {
                            dealForm.setValue("isRecurring", e.target.checked);
                            if (!e.target.checked) {
                              dealForm.setValue("recurringInterval", "");
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="recurring-checkbox" className="text-sm font-medium">
                          Make this a recurring deal
                        </Label>
                      </div>
                      
                      {dealForm.watch("isRecurring") && (
                        <div className="ml-6 space-y-2">
                          <p className="text-sm text-gray-600">
                            This deal will automatically repost when it expires
                          </p>
                          <div>
                            <Label htmlFor="recurring-interval" className="text-sm">Repeat every:</Label>
                            <Select onValueChange={(value) => dealForm.setValue("recurringInterval", value)}>
                              <SelectTrigger className="mt-1 w-48">
                                <SelectValue placeholder="Select interval" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                            {dealForm.formState.errors.recurringInterval && (
                              <p className="text-sm text-red-600 mt-1">
                                {dealForm.formState.errors.recurringInterval.message}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
                        {dealForm.watch("isRecurring") && (
                          <div><strong>Recurring:</strong> {dealForm.watch("recurringInterval") || "Not set"}</div>
                        )}
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

        {/* Password Prompt Dialog */}
        <Dialog open={showPasswordPrompt} onOpenChange={setShowPasswordPrompt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Super Merchant Access</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the super merchant password to access advanced business creation tools.
              </p>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={superMerchantPassword}
                  onChange={(e) => setSuperMerchantPassword(e.target.value)}
                  placeholder="Enter password"
                  onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPasswordPrompt(false)}>
                  Cancel
                </Button>
                <Button onClick={verifyPassword}>
                  Access Tools
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Business Search and Creation Interface */}
        <Dialog open={showBulkBusinessForm} onOpenChange={setShowBulkBusinessForm}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Business Search & Creation Tools</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Super Merchant Search Tools</h3>
                <p className="text-sm text-blue-700">
                  Search for real businesses online and quickly add them to your app with pre-populated information.
                </p>
              </div>

              {/* Search Interface */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for businesses (e.g., 'pizza New York', 'coffee shops Portland')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Search Results ({searchResults.length} found)</h4>
                    <div className="grid gap-4 max-h-96 overflow-y-auto">
                      {searchResults.map((result: any, index: number) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-semibold">{result.name}</h5>
                                {result.rating && (
                                  <Badge variant="secondary" className="text-xs">
                                    ⭐ {result.rating}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{result.address}</p>
                              <p className="text-sm text-gray-500 mb-2">{result.category || "Restaurant"}</p>
                              {result.phone && (
                                <p className="text-xs text-gray-500">{result.phone}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              {result.photo && (
                                <img 
                                  src={result.photo} 
                                  alt={result.name}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <Button
                                size="sm"
                                onClick={() => createBusinessFromResult(result)}
                                disabled={createFromSearchMutation.isPending}
                              >
                                {createFromSearchMutation.isPending ? "Adding..." : "Add Business"}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Quick Actions</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("restaurants New York")}
                    >
                      NYC Restaurants
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("coffee shops Seattle")}
                    >
                      Seattle Coffee
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("pizza Los Angeles")}
                    >
                      LA Pizza
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("sushi San Francisco")}
                    >
                      SF Sushi
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("barbecue Austin")}
                    >
                      Austin BBQ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("tacos Miami")}
                    >
                      Miami Tacos
                    </Button>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Manual Business Creation</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Need to create a specific business manually? Use the regular business creation form.
                  </p>
                  <Button variant="outline" onClick={() => {
                    setShowBulkBusinessForm(false);
                    setShowMerchantForm(true);
                  }}>
                    Create Custom Business
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Business</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Are you sure you want to delete this business? This action cannot be undone and will also delete all associated deals.
              </p>
            </div>
            <div className="flex gap-4 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete}
                disabled={deleteMerchantMutation.isPending}
              >
                {deleteMerchantMutation.isPending ? "Deleting..." : "Delete Business"}
              </Button>
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