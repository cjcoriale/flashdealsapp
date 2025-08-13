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
import { Store, Plus, Calendar, MapPin, Edit, TrendingUp, ArrowLeft, Clock, LogOut, Settings, User, Bell, Shield, Mail, MoreVertical, Trash2, Search, X, ChevronDown, ChevronRight } from "lucide-react";
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
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [dealsSearchQuery, setDealsSearchQuery] = useState("");
  const [currentlyManaging, setCurrentlyManaging] = useState<any>(null);
  const [selectedDealForEdit, setSelectedDealForEdit] = useState<any>(null);
  const [showDealDetails, setShowDealDetails] = useState(false);
  const [dealDetailsCollapsed, setDealDetailsCollapsed] = useState({
    pricing: true,
    status: true,
    timing: true
  });
  const [isEditingInModal, setIsEditingInModal] = useState(false);
  const [addedBusinessIds, setAddedBusinessIds] = useState<Set<string>>(new Set());
  
  // Deal creation UI states
  const [selectedDealColor, setSelectedDealColor] = useState("bg-gradient-to-br from-green-400 to-green-600");
  const [selectedDealEmoji, setSelectedDealEmoji] = useState("🏷️");
  
  // Deal creation form collapsible states
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  const [pricingCollapsed, setPricingCollapsed] = useState(true);
  const [statusCollapsed, setStatusCollapsed] = useState(true);
  const [timingCollapsed, setTimingCollapsed] = useState(true);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Validation helpers for form sections
  const getSectionValidationState = () => {
    const values = dealForm.getValues();
    const errors = dealForm.formState.errors;
    
    return {
      details: {
        hasError: (!values.title || !!errors.title) && hasAttemptedSubmit,
        isRequired: true
      },
      pricing: {
        hasError: (values.originalPrice <= 0 || values.discountedPrice <= 0 || !!errors.originalPrice || !!errors.discountedPrice) && hasAttemptedSubmit,
        isRequired: true
      },
      status: {
        hasError: (values.merchantId <= 0 || !!errors.merchantId) && hasAttemptedSubmit,
        isRequired: true
      },
      timing: {
        hasError: (!values.startTime || !values.endTime || !!errors.startTime || !!errors.endTime) && hasAttemptedSubmit,
        isRequired: true
      }
    };
  };

  const isFormValid = () => {
    const values = dealForm.getValues();
    console.log("Form values:", values);
    console.log("Form errors:", dealForm.formState.errors);
    
    const isValid = values.title && 
           values.originalPrice > 0 && 
           values.discountedPrice > 0 && 
           values.merchantId > 0 && 
           values.startTime && 
           values.endTime;
           
    console.log("Is form valid:", isValid);
    return isValid;
  };

  // Gradient color options for deal covers
  const colorOptions = [
    { name: "Ocean", value: "bg-gradient-to-br from-blue-400 to-blue-600" },
    { name: "Sunset", value: "bg-gradient-to-br from-orange-400 to-red-500" },
    { name: "Forest", value: "bg-gradient-to-br from-green-400 to-green-600" },
    { name: "Purple", value: "bg-gradient-to-br from-purple-400 to-purple-600" },
    { name: "Gold", value: "bg-gradient-to-br from-yellow-400 to-orange-500" },
    { name: "Rose", value: "bg-gradient-to-br from-pink-400 to-rose-500" },
    { name: "Indigo", value: "bg-gradient-to-br from-indigo-400 to-indigo-600" },
    { name: "Teal", value: "bg-gradient-to-br from-teal-400 to-cyan-500" },
  ];

  // Emoji options for deals
  const emojiOptions = [
    "🏷️", "🎯", "⚡", "🔥", "🎁", "💎", "🌟", "🎉",
    "🍕", "☕", "🍔", "🍰", "🥗", "🍜", "🍦", "🥤",
    "👕", "👗", "👟", "💄", "💍", "🎒", "👓", "⌚",
    "🎬", "🎮", "🎸", "📚", "🏋️", "🧘", "🎨", "🔧"
  ];

  // Auto-assign emoji based on category
  const getDefaultEmoji = (category: string) => {
    const categoryEmojis: { [key: string]: string } = {
      'food': '🍕',
      'restaurant': '🍕',
      'coffee': '☕',
      'clothing': '👕',
      'retail': '🛍️',
      'wellness': '🧘',
      'entertainment': '🎬',
      'fitness': '🏋️',
      'automotive': '🔧',
      'services': '🔧'
    };
    return categoryEmojis[category?.toLowerCase()] || '🏷️';
  };

  // Auto-assign gradient color based on category (default forest gradient)
  const getDefaultColor = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      'food': 'bg-gradient-to-br from-green-400 to-green-600',
      'restaurant': 'bg-gradient-to-br from-green-400 to-green-600',
      'coffee': 'bg-gradient-to-br from-green-400 to-green-600',
      'clothing': 'bg-gradient-to-br from-green-400 to-green-600',
      'retail': 'bg-gradient-to-br from-green-400 to-green-600',
      'wellness': 'bg-gradient-to-br from-green-400 to-green-600',
      'entertainment': 'bg-gradient-to-br from-green-400 to-green-600',
      'fitness': 'bg-gradient-to-br from-green-400 to-green-600',
      'automotive': 'bg-gradient-to-br from-green-400 to-green-600',
      'services': 'bg-gradient-to-br from-green-400 to-green-600'
    };
    return categoryColors[category?.toLowerCase()] || 'bg-gradient-to-br from-green-400 to-green-600';
  };
  
  // States data
  const STATES = {
    Arizona: { displayName: "Arizona" },
    California: { displayName: "California" },
    Texas: { displayName: "Texas" },
    Florida: { displayName: "Florida" },
    NewYork: { displayName: "New York" },
    Washington: { displayName: "Washington" },
    Illinois: { displayName: "Illinois" },
    Colorado: { displayName: "Colorado" }
  };

  type EnabledStatesType = {
    Arizona: boolean;
    California: boolean;
    Texas: boolean;
    Florida: boolean;
    NewYork: boolean;
    Washington: boolean;
    Illinois: boolean;
    Colorado: boolean;
    [key: string]: boolean;
  };

  // Fetch enabled states from backend
  const { data: backendEnabledStates = {} as EnabledStatesType } = useQuery<EnabledStatesType>({
    queryKey: ['/api/enabled-states'],
    enabled: isAuthenticated && showSuperMerchantTools,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Local state for enabled states (synced with backend)
  const [enabledStates, setEnabledStates] = useState<EnabledStatesType>({
    Arizona: true,
    California: false,
    Texas: false,
    Florida: false,
    NewYork: false,
    Washington: false,
    Illinois: false,
    Colorado: false
  });

  // Sync local state with backend when data changes
  useEffect(() => {
    if (backendEnabledStates && Object.keys(backendEnabledStates).length > 0) {
      setEnabledStates(backendEnabledStates);
    }
  }, [backendEnabledStates]);
  
  // Mutation to update enabled states on the server
  const updateEnabledStatesMutation = useMutation({
    mutationFn: async (newEnabledStates: EnabledStatesType) => {
      try {
        const response = await apiRequest('POST', '/api/enabled-states', { enabledStates: newEnabledStates });
        return response;
      } catch (error) {
        console.error('Failed to update enabled states:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enabled-states'] });
      toast({
        title: "Service Areas Updated",
        description: "State availability has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      console.error('Mutation error type:', typeof error);
      console.error('Mutation error message:', error?.message);
      console.error('Mutation error stack:', error?.stack);
      
      if (isUnauthorizedError(error as Error)) {
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
        title: "Update Failed",
        description: `Failed to update service areas: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // State toggle function
  const toggleState = (stateName: string) => {
    try {
      const newEnabledStates = { ...enabledStates, [stateName]: !enabledStates[stateName] };
      setEnabledStates(newEnabledStates);
      updateEnabledStatesMutation.mutate(newEnabledStates);
    } catch (error) {
      console.error('Error toggling state:', error);
      toast({
        title: "Toggle Failed",
        description: "Failed to toggle state. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  // Populate addedBusinessIds when merchants are loaded
  useEffect(() => {
    if (Array.isArray(merchants) && merchants.length > 0) {
      const existingIdentifiers = new Set<string>();
      merchants.forEach((merchant: any) => {
        if (merchant.address) {
          existingIdentifiers.add(merchant.address.toLowerCase().trim());
        }
        // If we stored place_id in the future, we could add it here too
      });
      setAddedBusinessIds(existingIdentifiers);
    }
  }, [merchants]);

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
    mode: "onChange", // Enable real-time validation for red border indicators
    defaultValues: {
      title: "",
      description: "",
      category: "",
      originalPrice: 0,
      discountedPrice: 0,
      discountPercentage: 0,
      startTime: "",
      endTime: "",
      maxRedemptions: 25,
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

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      return await apiRequest("DELETE", `/api/deals/${dealId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${selectedMerchant}/deals`] });
      queryClient.invalidateQueries({ queryKey: [`/api/merchants/${selectedMerchant}/deals/expired`] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      toast({
        title: "Success",
        description: "Deal deleted successfully!",
      });
      setShowDealDetails(false);
      setSelectedDealForEdit(null);
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
        description: "Failed to delete deal",
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
      // Check for duplicate addresses in existing merchants
      const existingMerchants = Array.isArray(merchants) ? merchants : [];
      const isDuplicate = existingMerchants.some((merchant: any) => 
        merchant.address?.toLowerCase().trim() === businessData.address?.toLowerCase().trim()
      );
      
      if (isDuplicate) {
        throw new Error("A business with this address already exists");
      }
      
      return await apiRequest("POST", "/api/merchants", businessData);
    },
    onSuccess: (newMerchant, businessData) => {
      // Track the added business using both place_id and address as identifiers
      setAddedBusinessIds(prev => {
        const newSet = new Set(prev);
        if (businessData.place_id) {
          newSet.add(businessData.place_id);
        }
        if (businessData.address) {
          newSet.add(businessData.address.toLowerCase().trim());
        }
        return newSet;
      });
      
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
        description: error.message || "Failed to create business",
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
    setHasAttemptedSubmit(true);
    
    // Check form validity
    if (!isFormValid()) {
      toast({
        title: "Incomplete Form",
        description: "Please complete all required sections before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    const discountPercentage = Math.round(((data.originalPrice - data.discountedPrice) / data.originalPrice) * 100);
    
    const dealData = {
      ...data,
      discountPercentage,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
      // Add the selected color and emoji to the deal data
      coverColor: selectedDealColor,
      dealEmoji: selectedDealEmoji,
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

    // Get the current business being managed
    const currentMerchant = selectedMerchant 
      ? (merchants as any[]).find(m => m.id === selectedMerchant)
      : (merchants as any[])[0];
    
    const businessCategory = currentMerchant?.category || "restaurant";
    
    // Set default gradient color and emoji based on business category
    setSelectedDealColor("bg-gradient-to-br from-green-400 to-green-600"); // Always default to forest gradient
    setSelectedDealEmoji(getDefaultEmoji(businessCategory));
    
    // Clear any previous deal data and reset form
    dealForm.reset({
      title: "",
      description: "",
      originalPrice: 0,
      discountedPrice: 0,
      category: businessCategory,
      merchantId: selectedMerchant || (Array.isArray(merchants) && merchants.length > 0 ? merchants[0].id : 0),
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      maxRedemptions: 25,
      isRecurring: false,
      recurringInterval: ""
    });
    
    // Set modal state for creating new deal
    setSelectedDealForEdit(null);
    setIsEditingInModal(true);
    setShowDealDetails(true);
    setDealDetailsCollapsed({ pricing: false, status: false, timing: false });
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
      place_id: result.place_id, // Include place_id for tracking
    };
    createFromSearchMutation.mutate(businessData);
  };

  // Check if a business is already added or exists
  const isBusinessAdded = (result: any) => {
    const resultAddress = result.address?.toLowerCase().trim();
    
    // Check if this address was recently added via the interface
    const isRecentlyAdded = addedBusinessIds.has(result.place_id) || addedBusinessIds.has(resultAddress);
    
    // Also check if it exists in current merchants
    const existingMerchants = Array.isArray(merchants) ? merchants : [];
    const existsInMerchants = existingMerchants.some((merchant: any) => 
      merchant.address?.toLowerCase().trim() === resultAddress
    );
    
    return isRecentlyAdded || existsInMerchants;
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
                <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                  <Avatar className="w-10 h-10 cursor-pointer hover:ring-2 hover:ring-gray-300 transition-all">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
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
                      Super Merchant
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
          <Card className="mb-6 bg-white dark:bg-white/5 hover:shadow-md transition-shadow border-l-4 border-l-blue-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => handleEditMerchant(currentlyManaging)}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden">
                    {currentlyManaging.imageUrl ? (
                      <img 
                        src={currentlyManaging.imageUrl} 
                        alt={currentlyManaging.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Store className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Currently Managing</p>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{currentlyManaging.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentlyManaging.address}</p>
                  </div>
                </div>
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Active
                </Badge>
              </div>
              
              {/* Create Deal Button */}
              <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    dealForm.setValue("merchantId", currentlyManaging.id);
                    dealForm.setValue("category", currentlyManaging.category);
                    // Auto-assign color and emoji based on business category
                    const defaultColor = getDefaultColor(currentlyManaging.category);
                    const defaultEmoji = getDefaultEmoji(currentlyManaging.category);
                    setSelectedDealColor(defaultColor);
                    setSelectedDealEmoji(defaultEmoji);
                    setShowDealForm(true);
                  }}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Deal
                </Button>
              </div>
            </CardContent>
          </Card>
        )}



        {/* Business Edit Modal */}
        {showMerchantForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Cover Image */}
              <div className="relative h-40 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg">
                <button
                  onClick={() => {
                    setShowMerchantForm(false);
                    setEditingMerchant(null);
                    merchantForm.reset();
                  }}
                  className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-2xl font-bold text-white">
                    {editingMerchant ? 'Edit Business' : 'Create Business'}
                  </h2>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={merchantForm.handleSubmit(onCreateMerchant)} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2">
                      Basic Information
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Business Name *</Label>
                        <Input
                          id="name"
                          {...merchantForm.register("name")}
                          placeholder="Your business name"
                          className="mt-1"
                        />
                        {merchantForm.formState.errors.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {merchantForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Select onValueChange={(value) => merchantForm.setValue("category", value)}>
                          <SelectTrigger className="mt-1">
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
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="imageUrl">Business Image URL</Label>
                      <Input
                        id="imageUrl"
                        {...merchantForm.register("imageUrl")}
                        placeholder="https://example.com/business-photo.jpg"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Location & Contact */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2">
                      Location & Contact
                    </h3>
                    
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        {...merchantForm.register("address")}
                        placeholder="123 Main St, City, State"
                        className="mt-1"
                        onChange={(e) => {
                          const address = e.target.value;
                          merchantForm.setValue("address", address);
                          if (address.toLowerCase().includes("arizona") || address.toLowerCase().includes("az") || address.toLowerCase().includes("scottsdale")) {
                            merchantForm.setValue("latitude", 33.4942);
                            merchantForm.setValue("longitude", -112.1236);
                          } else {
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
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowMerchantForm(false);
                        setEditingMerchant(null);
                        merchantForm.reset();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createMerchantMutation.isPending || updateMerchantMutation.isPending}
                      className="flex-1"
                    >
                      {editingMerchant 
                        ? (updateMerchantMutation.isPending ? "Updating..." : "Update Business")
                        : (createMerchantMutation.isPending ? "Creating..." : "Create Business")
                      }
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
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
                        className="relative p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedDealForEdit(deal);
                          setIsEditingInModal(false);
                          setShowDealDetails(true);
                          setDealDetailsCollapsed({ pricing: true, status: true, timing: true });
                        }}
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
                          <div className="flex items-center justify-between flex-wrap gap-2">
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
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {deal.currentRedemptions || 0}/{deal.maxRedemptions} claimed
                              </span>
                            </div>
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
          if (!open) {
            setDealFormStep(1);
            dealForm.reset();
            setHasAttemptedSubmit(false); // Reset validation state
            // Reset collapsible sections to collapsed state
            setDetailsCollapsed(true);
            setPricingCollapsed(true);
            setStatusCollapsed(true);
            setTimingCollapsed(true);
          }
        }}>
          <DialogContent className="max-w-sm w-[90vw] max-h-[90vh] overflow-y-auto p-0">
            {/* Deal Cover Preview */}
            <div className={`relative h-32 ${selectedDealColor} flex items-center justify-center`}>
              <div className="text-4xl">{selectedDealEmoji}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDealForm(false)}
                className="absolute top-2 right-2 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3">
              <DialogHeader>
                <DialogTitle>Create New Deal</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={dealForm.handleSubmit(onCreateDeal)} className="space-y-3">
                {/* Details Section - Collapsible */}
                <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${
                  getSectionValidationState().details.hasError ? 'border-l-4 border-l-red-500' : ''
                }`}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setDetailsCollapsed(!detailsCollapsed)}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">📝 Details</h4>
                    {detailsCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {!detailsCollapsed && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {/* Deal Title */}
                      <div>
                        <Label htmlFor="deal-title" className="text-sm">Deal Title *</Label>
                        <Input
                          id="deal-title"
                          {...dealForm.register("title")}
                          placeholder="Enter your deal title"
                          className="mt-1 text-sm"
                        />
                        {dealForm.formState.errors.title && (
                          <p className="text-xs text-red-600 mt-1">
                            {dealForm.formState.errors.title.message}
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      <div>
                        <Label htmlFor="deal-description" className="text-sm">Description</Label>
                        <Textarea
                          id="deal-description"
                          {...dealForm.register("description")}
                          placeholder="Describe your deal"
                          rows={2}
                          className="mt-1 text-sm"
                        />
                      </div>

                      {/* Color and Emoji Row */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Color Selection */}
                        <div>
                          <Label className="text-sm">Cover Color</Label>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {colorOptions.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setSelectedDealColor(color.value)}
                                className={`w-6 h-6 rounded-full ${color.value} border-2 ${
                                  selectedDealColor === color.value ? 'border-gray-800' : 'border-gray-300'
                                }`}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Emoji Input */}
                        <div>
                          <Label htmlFor="deal-emoji" className="text-sm">Deal Emoji</Label>
                          <Input
                            id="deal-emoji"
                            value={selectedDealEmoji}
                            onChange={(e) => setSelectedDealEmoji(e.target.value)}
                            placeholder="🏷️"
                            className="mt-1 text-sm text-center text-lg w-full"
                            maxLength={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Section - Collapsible */}
                <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${
                  getSectionValidationState().pricing.hasError ? 'border-l-4 border-l-red-500' : ''
                }`}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setPricingCollapsed(!pricingCollapsed)}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">💰 Pricing</h4>
                    {pricingCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {!pricingCollapsed && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {/* Deal Value */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="original-price" className="text-sm">Original Price *</Label>
                          <Input
                            id="original-price"
                            type="number"
                            step="0.01"
                            {...dealForm.register("originalPrice", { valueAsNumber: true })}
                            placeholder="0.00"
                            className="mt-1 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor="discounted-price" className="text-sm">Sale Price *</Label>
                          <Input
                            id="discounted-price"
                            type="number"
                            step="0.01"
                            {...dealForm.register("discountedPrice", { valueAsNumber: true })}
                            placeholder="0.00"
                            className="mt-1 text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Availability */}
                      <div>
                        <Label htmlFor="max-redemptions" className="text-sm">Available Quantity</Label>
                        <Input
                          id="max-redemptions"
                          type="number"
                          {...dealForm.register("maxRedemptions", { valueAsNumber: true })}
                          placeholder="100"
                          className="mt-1 text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">How many customers can claim this deal</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status and Activity Section - Collapsible */}
                <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${
                  getSectionValidationState().status.hasError ? 'border-l-4 border-l-red-500' : ''
                }`}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setStatusCollapsed(!statusCollapsed)}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">📍 Status & Activity</h4>
                    {statusCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {!statusCollapsed && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {/* Business Location (hidden, pre-filled) */}
                      <input type="hidden" {...dealForm.register("merchantId")} />
                      <input type="hidden" {...dealForm.register("category")} />

                      {/* Deal Type Selection */}
                      <div>
                        <Label className="text-sm font-medium">Deal Type</Label>
                        <Select onValueChange={(value) => dealForm.setValue("category", value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select deal type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flash-sale">⚡ Flash Sale</SelectItem>
                            <SelectItem value="discount">🏷️ Discount</SelectItem>
                            <SelectItem value="bogo">🎁 Buy One Get One</SelectItem>
                            <SelectItem value="happy-hour">🍻 Happy Hour</SelectItem>
                            <SelectItem value="student-discount">🎓 Student Discount</SelectItem>
                            <SelectItem value="early-bird">🌅 Early Bird Special</SelectItem>
                            <SelectItem value="bundle">📦 Bundle Deal</SelectItem>
                            <SelectItem value="seasonal">🍂 Seasonal Special</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Deal Status */}
                      <div>
                        <Label className="text-sm font-medium">Deal Status</Label>
                        <Select>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Active" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">✅ Active</SelectItem>
                            <SelectItem value="draft">📝 Draft</SelectItem>
                            <SelectItem value="scheduled">⏰ Scheduled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Recurring Deal Options */}
                      <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
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
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600">
                            This deal will automatically repost when it expires
                          </p>
                          <div>
                            <Label htmlFor="recurring-interval" className="text-xs">Repeat every:</Label>
                            <Select onValueChange={(value) => dealForm.setValue("recurringInterval", value)}>
                              <SelectTrigger className="mt-1 text-xs h-8">
                                <SelectValue placeholder="Select interval" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timing Section - Collapsible */}
                <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${
                  getSectionValidationState().timing.hasError ? 'border-l-4 border-l-red-500' : ''
                }`}>
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setTimingCollapsed(!timingCollapsed)}
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white">⏰ Timing</h4>
                    {timingCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                  {!timingCollapsed && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                      {/* Deal Duration - Stacked for Better Mobile Layout */}
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="start-date" className="text-xs font-medium text-gray-700 dark:text-gray-300">Start Date & Time *</Label>
                          <Input
                            id="start-date"
                            type="datetime-local"
                            {...dealForm.register("startTime")}
                            className="mt-1 text-xs h-9 w-full"
                            placeholder="Select start date and time"
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-date" className="text-xs font-medium text-gray-700 dark:text-gray-300">End Date & Time *</Label>
                          <Input
                            id="end-date"
                            type="datetime-local"
                            {...dealForm.register("endTime")}
                            className="mt-1 text-xs h-9 w-full"
                            placeholder="Select end date and time"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className={`w-full text-sm ${!isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={createDealMutation.isPending || !isFormValid()}
                >
                  {createDealMutation.isPending ? "Creating..." : !isFormValid() ? "Complete Required Fields" : "Create Deal"}
                </Button>
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

        {/* Super Merchant Interface */}
        <Dialog open={showBulkBusinessForm} onOpenChange={setShowBulkBusinessForm}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Super Merchant</DialogTitle>
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

                {/* Service Areas */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Service Areas</h4>
                  <div className="space-y-4">
                    <Input
                      placeholder="Search states..."
                      value={stateSearchQuery}
                      onChange={(e) => setStateSearchQuery(e.target.value)}
                      className="max-w-sm"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {Object.entries(STATES)
                        .filter(([stateName, stateData]) => 
                          stateData.displayName.toLowerCase().includes(stateSearchQuery.toLowerCase())
                        )
                        .map(([stateName, stateData]) => {
                          const isEnabled = enabledStates[stateName];
                          return (
                            <div
                              key={stateName}
                              className={`p-4 rounded-lg border transition-all ${
                                updateEnabledStatesMutation.isPending 
                                  ? 'cursor-not-allowed opacity-60' 
                                  : 'cursor-pointer'
                              } ${
                                isEnabled 
                                  ? 'border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 bg-white shadow-sm' 
                                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                              }`}
                              onClick={() => !updateEnabledStatesMutation.isPending && toggleState(stateName)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className={`font-medium ${
                                    isEnabled ? 'text-gray-900' : 'text-gray-500'
                                  }`}>
                                    {stateData.displayName}
                                  </h5>
                                  <p className={`text-sm ${
                                    isEnabled ? 'text-blue-600' : 'text-gray-400'
                                  }`}>
                                    {isEnabled ? 'Active' : 'Inactive'}
                                  </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isEnabled 
                                    ? 'border-blue-500 bg-blue-500' 
                                    : 'border-gray-400 bg-white'
                                }`}>
                                  {isEnabled && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
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

        {/* Deal Details Modal */}
        {showDealDetails && selectedDealForEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Cover Image */}
              <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg overflow-hidden">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <div className="absolute top-4 right-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDealDetails(false);
                      setSelectedDealForEdit(null);
                      setDealDetailsCollapsed({ pricing: true, status: true, timing: true });
                    }}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedDealForEdit ? 'Deal Details' : 'Create New Deal'}
                    </h2>
                    {selectedDealForEdit && (
                      <Badge variant={selectedDealForEdit.discountPercentage >= 50 ? "default" : "secondary"} className="text-lg px-3 py-1">
                        {selectedDealForEdit.discountPercentage}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Deal Header */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    {selectedDealForEdit && !isEditingInModal ? (
                      <>
                        <h3 className="text-xl font-semibold mb-2">{selectedDealForEdit.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-3">
                          {selectedDealForEdit.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Store className="w-4 h-4" />
                            {Array.isArray(merchants) 
                              ? merchants.find((m: any) => m.id === selectedDealForEdit.merchantId)?.name || "Unknown Restaurant"
                              : "Unknown Restaurant"
                            }
                          </span>
                          <Badge variant={selectedDealForEdit.category === 'restaurant' ? 'default' : 'secondary'}>
                            {selectedDealForEdit.category}
                          </Badge>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="modal-deal-title">Deal Title *</Label>
                          <Input
                            id="modal-deal-title"
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
                          <Label htmlFor="modal-deal-description">Description</Label>
                          <Textarea
                            id="modal-deal-description"
                            {...dealForm.register("description")}
                            placeholder="Describe your deal"
                            className="mt-1"
                            rows={3}
                          />
                          {dealForm.formState.errors.description && (
                            <p className="text-sm text-red-600 mt-1">
                              {dealForm.formState.errors.description.message}
                            </p>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="modal-category">Category *</Label>
                            <Select onValueChange={(value) => dealForm.setValue("category", value)}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="restaurant">Restaurant</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="entertainment">Entertainment</SelectItem>
                                <SelectItem value="fitness">Fitness</SelectItem>
                                <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                                <SelectItem value="automotive">Automotive</SelectItem>
                                <SelectItem value="education">Education</SelectItem>
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
                            <Label htmlFor="modal-business-select">Business Location *</Label>
                            <Select onValueChange={(value) => dealForm.setValue("merchantId", parseInt(value))}>
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select business" />
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
                      </div>
                    )}
                  </div>

                  {/* Pricing Section */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setDealDetailsCollapsed(prev => ({ ...prev, pricing: !prev.pricing }))}
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white">Pricing</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-green-600 font-bold">
                          ${(selectedDealForEdit?.discountedPrice || dealForm.watch("discountedPrice") || 0)}
                        </span>
                        {dealDetailsCollapsed.pricing ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {!dealDetailsCollapsed.pricing && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {selectedDealForEdit && !isEditingInModal ? (
                          <>
                            <div className="flex justify-between pt-2">
                              <span className="text-gray-600 dark:text-gray-300">Original Price:</span>
                              <span className="font-medium">${selectedDealForEdit.originalPrice}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Discounted Price:</span>
                              <span className="font-medium text-green-600">${selectedDealForEdit.discountedPrice}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-gray-600 dark:text-gray-300">You Save:</span>
                              <span className="font-bold text-green-600">
                                ${selectedDealForEdit.originalPrice - selectedDealForEdit.discountedPrice}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="pt-2 space-y-4">
                            <div className="space-y-4">
                              {/* Price Row */}
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="modal-original-price">Original Price *</Label>
                                  <Input
                                    id="modal-original-price"
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
                                  <Label htmlFor="modal-discounted-price">Discounted Price *</Label>
                                  <Input
                                    id="modal-discounted-price"
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

                              {/* Availability Row */}
                              <div>
                                <Label htmlFor="modal-max-redemptions">Available Quantity</Label>
                                <Input
                                  id="modal-max-redemptions"
                                  type="number"
                                  {...dealForm.register("maxRedemptions", { valueAsNumber: true })}
                                  placeholder="100"
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">How many customers can claim this deal (leave empty for unlimited)</p>
                                {dealForm.formState.errors.maxRedemptions && (
                                  <p className="text-sm text-red-600 mt-1">
                                    {dealForm.formState.errors.maxRedemptions.message}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="modal-max-redemptions">Max Redemptions *</Label>
                              <Input
                                id="modal-max-redemptions"
                                type="number"
                                {...dealForm.register("maxRedemptions", { valueAsNumber: true })}
                                placeholder="100"
                                className="mt-1"
                              />
                              {dealForm.formState.errors.maxRedemptions && (
                                <p className="text-sm text-red-600 mt-1">
                                  {dealForm.formState.errors.maxRedemptions.message}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status & Activity Section */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setDealDetailsCollapsed(prev => ({ ...prev, status: !prev.status }))}
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white">Status & Activity</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                          {selectedDealForEdit ? 
                            `${selectedDealForEdit.currentRedemptions || 0}/${selectedDealForEdit.maxRedemptions}` :
                            `0/${dealForm.watch("maxRedemptions") || 100}`
                          }
                        </span>
                        {dealDetailsCollapsed.status ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {!dealDetailsCollapsed.status && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {selectedDealForEdit && !isEditingInModal ? (
                          <>
                            <div className="flex justify-between pt-2">
                              <span className="text-gray-600 dark:text-gray-300">Status:</span>
                              <Badge variant={new Date(selectedDealForEdit.endTime) > new Date() ? "default" : "destructive"}>
                                {new Date(selectedDealForEdit.endTime) > new Date() ? "Active" : "Expired"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-300">Redemptions:</span>
                              <span className="font-medium">
                                {selectedDealForEdit.currentRedemptions || 0} / {selectedDealForEdit.maxRedemptions}
                              </span>
                            </div>
                            {selectedDealForEdit.isRecurring && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-300">Recurring:</span>
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {selectedDealForEdit.recurringInterval}
                                </Badge>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="pt-2 space-y-4">
                            <div className="border rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-3">
                                <input
                                  type="checkbox"
                                  id="modal-recurring-checkbox"
                                  checked={dealForm.watch("isRecurring") || false}
                                  onChange={(e) => {
                                    dealForm.setValue("isRecurring", e.target.checked);
                                    if (!e.target.checked) {
                                      dealForm.setValue("recurringInterval", "");
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="modal-recurring-checkbox" className="text-sm font-medium">
                                  Make this a recurring deal
                                </Label>
                              </div>
                              
                              {dealForm.watch("isRecurring") && (
                                <div className="ml-6 space-y-2">
                                  <p className="text-sm text-gray-600">
                                    This deal will automatically repost when it expires
                                  </p>
                                  <div>
                                    <Label htmlFor="modal-recurring-interval" className="text-sm">Repeat every:</Label>
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Timing Section */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setDealDetailsCollapsed(prev => ({ ...prev, timing: !prev.timing }))}
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white">Timing</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                          {selectedDealForEdit ? 
                            (new Date(selectedDealForEdit.endTime) > new Date() ? "Active" : "Expired") :
                            "New Deal"
                          }
                        </span>
                        {dealDetailsCollapsed.timing ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {!dealDetailsCollapsed.timing && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
                        {selectedDealForEdit && !isEditingInModal ? (
                          <>
                            <div className="pt-2">
                              <span className="text-gray-600 dark:text-gray-300 text-sm">Start Time:</span>
                              <p className="font-medium">
                                {new Date(selectedDealForEdit.startTime).toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-300 text-sm">End Time:</span>
                              <p className="font-medium">
                                {new Date(selectedDealForEdit.endTime).toLocaleString()}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="pt-2 space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="modal-start-time">Start Time *</Label>
                                <Input
                                  id="modal-start-time"
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
                                <Label htmlFor="modal-end-time">End Time *</Label>
                                <Input
                                  id="modal-end-time"
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {selectedDealForEdit && !isEditingInModal ? (
                      <>
                        <Button
                          onClick={() => {
                            // Pre-populate deal form with current deal data
                            dealForm.reset({
                              title: selectedDealForEdit.title,
                              description: selectedDealForEdit.description,
                              originalPrice: selectedDealForEdit.originalPrice,
                              discountedPrice: selectedDealForEdit.discountedPrice,
                              category: selectedDealForEdit.category,
                              startTime: new Date(selectedDealForEdit.startTime).toISOString().slice(0, 16),
                              endTime: new Date(selectedDealForEdit.endTime).toISOString().slice(0, 16),
                              maxRedemptions: selectedDealForEdit.maxRedemptions,
                              merchantId: selectedDealForEdit.merchantId,
                              isRecurring: selectedDealForEdit.isRecurring,
                              recurringInterval: selectedDealForEdit.recurringInterval,
                            });
                            setIsEditingInModal(true);
                            setDealDetailsCollapsed({ pricing: false, status: false, timing: false });
                          }}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Deal
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${selectedDealForEdit.title}"? This action cannot be undone.`)) {
                              deleteDealMutation.mutate(selectedDealForEdit.id);
                            }
                          }}
                          disabled={deleteDealMutation.isPending}
                          className="flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deleteDealMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDealDetails(false);
                            setSelectedDealForEdit(null);
                            setIsEditingInModal(false);
                          }}
                          className="flex-1"
                        >
                          Close
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowDealDetails(false);
                            setSelectedDealForEdit(null);
                            setIsEditingInModal(false);
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={dealForm.handleSubmit(onCreateDeal, (errors) => {
                            console.log("Form validation errors:", errors);
                            toast({
                              title: "Form Error",
                              description: "Please check all required fields",
                              variant: "destructive",
                            });
                          })}
                          disabled={createDealMutation.isPending}
                          className="flex-1"
                        >
                          {createDealMutation.isPending ? 
                            "Saving..." : 
                            (selectedDealForEdit ? "Update Deal" : "Create Deal")
                          }
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
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