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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Store, Plus, Calendar, MapPin, Edit, TrendingUp, ArrowLeft, Clock, LogOut, Settings, User, Bell, Shield, Mail, MoreVertical, Trash2, Search, X, ChevronDown, ChevronRight, Tag } from "lucide-react";
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
import LocationModal from "@/components/modals/LocationModal";
import DealModal from "@/components/modals/DealModal";
import VerificationModal from "@/components/modals/VerificationModal";
import VerificationStatus from "@/components/VerificationStatus";

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
  maxRedemptions: z.number().min(1, "Quantity must be at least 1").default(25),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
}).refine((data) => {
  return data.discountedPrice < data.originalPrice;
}, {
  message: "Sale price must be less than original price",
  path: ["discountedPrice"],
});

export default function MerchantDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedMerchant, setSelectedMerchant] = useState<any>(null);
  const [currentlyManaging, setCurrentlyManaging] = useState<any>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showBulkBusinessForm, setShowBulkBusinessForm] = useState(false);
  const [superMerchantPassword, setSuperMerchantPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dealsSearchQuery, setDealsSearchQuery] = useState("");
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifyingMerchant, setVerifyingMerchant] = useState<any>(null);

  // Fetch user's merchants
  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/my-merchants"],
    enabled: isAuthenticated,
  });

  // Fetch deals for selected merchant
  const { data: recentDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["/api/deals", selectedMerchant?.id],
    queryFn: selectedMerchant?.id ? () => 
      fetch(`/api/deals?merchantId=${selectedMerchant.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        }
      }).then(res => res.json()) : undefined,
    enabled: !!selectedMerchant?.id,
  });

  // Create merchant mutation
  const createMerchantMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/merchants", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      setShowLocationModal(false);
      setEditingLocation(null);
      toast({
        title: "Success",
        description: "Business location created successfully!",
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
          window.location.href = "/api/auth/login?role=merchant";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create business location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update merchant mutation
  const updateMerchantMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/merchants/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      setShowLocationModal(false);
      setEditingLocation(null);
      toast({
        title: "Success",
        description: "Business location updated successfully!",
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
          window.location.href = "/api/auth/login?role=merchant";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update business location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete merchant mutation
  const deleteMerchantMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/merchants/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      setSelectedMerchant(null);
      setCurrentlyManaging(null);
      toast({
        title: "Success",
        description: "Business location deleted successfully!",
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
          window.location.href = "/api/auth/login?role=merchant";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete business location. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Search places mutation
  const searchPlacesMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest(`/api/places/search?query=${encodeURIComponent(query)}`);
      return response;
    },
    onSuccess: (data) => {
      setSearchResults(data || []);
      setIsSearching(false);
    },
    onError: (error) => {
      console.error("Error searching places:", error);
      setIsSearching(false);
      toast({
        title: "Error",
        description: "Failed to search places. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create business from search mutation
  const createFromSearchMutation = useMutation({
    mutationFn: async (placeData: any) => {
      return apiRequest("/api/merchants", {
        method: "POST",
        body: JSON.stringify({
          name: placeData.name,
          address: placeData.address,
          latitude: placeData.latitude,
          longitude: placeData.longitude,
          category: placeData.category || "restaurant",
          phone: placeData.phone || "",
          description: `${placeData.category || "Restaurant"} located at ${placeData.address}`,
          imageUrl: placeData.photo || "",
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      toast({
        title: "Success",
        description: "Business added from search results!",
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
          window.location.href = "/api/auth/login?role=merchant";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to add business. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Effect to set default merchant
  useEffect(() => {
    if (merchants.length > 0 && !selectedMerchant) {
      setSelectedMerchant(merchants[0]);
      setCurrentlyManaging(merchants[0]);
    }
  }, [merchants, selectedMerchant]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    searchPlacesMutation.mutate(searchQuery);
  };

  // Handle password verification
  const verifyPassword = () => {
    if (superMerchantPassword === "SuperFlash2024") {
      setShowPasswordPrompt(false);
      setShowBulkBusinessForm(true);
      setSuperMerchantPassword("");
      toast({
        title: "Access Granted",
        description: "Welcome to Super Merchant tools!",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid password. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper functions
  const handleDeleteMerchant = (id: number) => {
    if (window.confirm("Are you sure you want to delete this business location? This action cannot be undone.")) {
      deleteMerchantMutation.mutate(id);
    }
  };

  const createBusinessFromResult = (result: any) => {
    createFromSearchMutation.mutate(result);
  };

  const isBusinessAdded = (result: any) => {
    return merchants.some((merchant: any) => 
      merchant.name.toLowerCase() === result.name.toLowerCase() ||
      merchant.address.toLowerCase() === result.address.toLowerCase()
    );
  };

  const handleCreateDealClick = () => {
    setShowDealModal(true);
  };

  // Auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Business Dashboard"
        showBackButton={false}
      />
      
      {/* User Menu Header */}
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white shadow-lg">
              <User className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
              <User className="w-4 h-4 mr-2" />
              Profile & Settings
            </DropdownMenuItem>
            {selectedMerchant && (
              <DropdownMenuItem 
                onClick={() => {
                  setEditingLocation(selectedMerchant);
                  setShowLocationModal(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Current Location
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => window.location.href = '/api/auth/logout'}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {currentlyManaging && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Currently managing: <span className="font-semibold">{currentlyManaging.name}</span>
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-24">
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Add Business Location</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Create a new business location
                  </p>
                </div>
                <Button
                  onClick={() => setShowLocationModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Super Merchant Tools</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Advanced business management
                  </p>
                </div>
                <Button
                  onClick={() => setShowPasswordPrompt(true)}
                  variant="outline"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Access Tools
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Locations */}
        {merchantsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading businesses...</p>
          </div>
        ) : merchants.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">🏪</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Business Locations Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Create your first business location to start managing deals and attracting customers
              </p>
              <Button
                onClick={() => setShowLocationModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Your Business Locations
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {merchants.map((merchant: any) => (
                <Card key={merchant.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{merchant.name}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMerchant(merchant);
                              setCurrentlyManaging(merchant);
                            }}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Manage Location
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLocation(merchant);
                              setShowLocationModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Location
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              if (merchant.verificationStatus === 'verified') {
                                setSelectedMerchant(merchant);
                                setCurrentlyManaging(merchant);
                                setShowDealModal(true);
                              } else {
                                toast({
                                  title: "Verification Required",
                                  description: "Please verify your business first to create deals",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={merchant.verificationStatus !== 'verified'}
                            className={merchant.verificationStatus !== 'verified' ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Deal
                            {merchant.verificationStatus !== 'verified' && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Verification Required
                              </Badge>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setVerifyingMerchant(merchant);
                              setShowVerificationModal(true);
                            }}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Verify Business
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
                    <p className="text-xs text-gray-500 mb-3">{merchant.address}</p>
                    
                    <div className="mb-4">
                      <VerificationStatus merchant={merchant} />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (merchant.verificationStatus === 'verified') {
                            setSelectedMerchant(merchant);
                            setCurrentlyManaging(merchant);
                            setShowDealModal(true);
                          } else {
                            toast({
                              title: "Verification Required",
                              description: "Please verify your business first to create deals",
                              variant: "destructive",
                            });
                          }
                        }}
                        className={`flex-1 ${merchant.verificationStatus !== 'verified' ? 'opacity-50' : ''}`}
                        size="sm"
                        disabled={merchant.verificationStatus !== 'verified'}
                        data-testid={`button-create-deal-${merchant.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {merchant.verificationStatus === 'verified' ? 'Create Deal' : 'Verify to Create Deals'}
                      </Button>
                      {merchant.verificationStatus !== 'verified' && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVerifyingMerchant(merchant);
                            setShowVerificationModal(true);
                          }}
                          variant="outline"
                          size="sm"
                          data-testid={`button-verify-${merchant.id}`}
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Deals for Selected Location */}
        {selectedMerchant && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Deals for {currentlyManaging?.name}
                </div>
                <button
                  onClick={() => setShowSearchBox(!showSearchBox)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Toggle search"
                >
                  <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Collapsible Search bar for deals */}
              {showSearchBox && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by deal name..."
                      value={dealsSearchQuery}
                      onChange={(e) => setDealsSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                </div>
              )}
              {Array.isArray(recentDeals) && recentDeals.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No deals yet for this location
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Create your first flash deal for {currentlyManaging?.name}
                  </p>
                  <Button
                    onClick={handleCreateDealClick}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Deal
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(recentDeals) && recentDeals
                    .filter((deal: any) => {
                      if (!dealsSearchQuery) return true;
                      const searchLower = dealsSearchQuery.toLowerCase();
                      return deal.title.toLowerCase().includes(searchLower);
                    })
                    .slice(0, 5)
                    .map((deal: any) => (
                      <div key={deal.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{deal.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{deal.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>${deal.discountedPrice} (was ${deal.originalPrice})</span>
                            <span>{deal.claimed || 0}/{deal.maxRedemptions} claimed</span>
                            <Badge variant={deal.status === 'active' ? 'default' : 'secondary'}>
                              {deal.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <LocationModal
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setEditingLocation(null);
          }}
          editingLocation={editingLocation}
        />

        <DealModal
          isOpen={showDealModal}
          onClose={() => setShowDealModal(false)}
          merchants={merchants}
          selectedMerchant={selectedMerchant}
        />

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

        {/* Super Merchant Interface */}
        <Dialog open={showBulkBusinessForm} onOpenChange={setShowBulkBusinessForm}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Super Merchant Tools</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Business Search Interface */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Business Search</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search for businesses (e.g., 'pizza Phoenix', 'coffee shops Scottsdale')"
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
                                onClick={() => !isBusinessAdded(result) && createBusinessFromResult(result)}
                                disabled={createFromSearchMutation.isPending || isBusinessAdded(result)}
                                variant={isBusinessAdded(result) ? "secondary" : "default"}
                              >
                                {createFromSearchMutation.isPending 
                                  ? "Adding..." 
                                  : isBusinessAdded(result) 
                                    ? "Added" 
                                    : "Add Business"
                                }
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNavigation />

      {/* Verification Modal */}
      {verifyingMerchant && (
        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => {
            setShowVerificationModal(false);
            setVerifyingMerchant(null);
          }}
          merchant={verifyingMerchant}
        />
      )}
    </div>
  );
}