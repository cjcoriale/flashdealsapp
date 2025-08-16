import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DealWithMerchant } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import InteractiveMap from "@/components/map/InteractiveMap";
import TopNavigation from "@/components/layout/TopNavigation";
import BottomNavigation from "@/components/layout/BottomNavigation";
import FloatingButtons from "@/components/layout/FloatingButtons";
import SideMenu from "@/components/layout/SideMenu";
import DealModal from "@/components/deals/DealModal";
import AuditModal from "@/components/audit/AuditModal";
import AuthModal from "@/components/auth/AuthModal";

import DealCard from "@/components/deals/DealCard";
import NotificationToast from "@/components/ui/NotificationToast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useLocation } from "@/hooks/useLocation";
import { useAudit } from "@/hooks/useAudit";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/hooks/useAuthModal";

export default function MapPage() {
  const [selectedDeal, setSelectedDeal] = useState<DealWithMerchant | null>(null);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exploreMode, setExploreMode] = useState(false);

  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false
  });

  const { location, requestLocation, isLoading: locationLoading, permissionState } = useLocation();
  const { logAction } = useAudit();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const authModal = useAuthModal();

  const {
    data: deals = [],
    isLoading: dealsLoading,
    refetch: refetchDeals
  } = useQuery<DealWithMerchant[]>({
    queryKey: ["/api/deals"],
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const {
    data: searchResults = [],
    isLoading: searchLoading
  } = useQuery<DealWithMerchant[]>({
    queryKey: ["/api/search", { q: searchQuery }], // Use object for query params
    enabled: !!searchQuery && searchQuery.trim().length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Get enabled states
  const { data: enabledStates = {} } = useQuery({
    queryKey: ["/api/enabled-states"],
    staleTime: 60000, // Cache for 1 minute
  });

  // Function to determine user's state based on coordinates
  const getUserState = (lat: number, lng: number): string => {
    // Arizona coordinates roughly: 31.3-37.0 N, 109.0-114.8 W
    if (lat >= 31.3 && lat <= 37.0 && lng >= -114.8 && lng <= -109.0) {
      return 'Arizona';
    }
    // California coordinates roughly: 32.5-42.0 N, 114.1-124.4 W  
    if (lat >= 32.5 && lat <= 42.0 && lng >= -124.4 && lng <= -114.1) {
      return 'California';
    }
    // Texas coordinates roughly: 25.8-36.5 N, 93.5-106.6 W
    if (lat >= 25.8 && lat <= 36.5 && lng >= -106.6 && lng <= -93.5) {
      return 'Texas';
    }
    // New York coordinates roughly: 40.5-45.0 N, 71.8-79.8 W
    if (lat >= 40.5 && lat <= 45.0 && lng >= -79.8 && lng <= -71.8) {
      return 'NewYork';
    }
    // Florida coordinates roughly: 24.4-31.0 N, 80.0-87.6 W
    if (lat >= 24.4 && lat <= 31.0 && lng >= -87.6 && lng <= -80.0) {
      return 'Florida';
    }
    // Washington coordinates roughly: 45.5-49.0 N, 116.9-124.8 W
    if (lat >= 45.5 && lat <= 49.0 && lng >= -124.8 && lng <= -116.9) {
      return 'Washington';
    }
    // Illinois coordinates roughly: 36.9-42.5 N, 87.0-91.5 W
    if (lat >= 36.9 && lat <= 42.5 && lng >= -91.5 && lng <= -87.0) {
      return 'Illinois';
    }
    // Colorado coordinates roughly: 36.9-41.0 N, 102.0-109.1 W
    if (lat >= 36.9 && lat <= 41.0 && lng >= -109.1 && lng <= -102.0) {
      return 'Colorado';
    }
    return 'Unknown';
  };

  // Check if user is in an enabled state
  const userState = location ? getUserState(location.lat, location.lng) : null;
  const isInEnabledState = userState && (enabledStates as Record<string, boolean>)[userState];

  // Filter deals by location if user location is available
  const getNearbyDeals = (allDeals: DealWithMerchant[], userLat?: number, userLng?: number, radiusKm = 50) => {
    if (!userLat || !userLng) return allDeals;
    
    return allDeals.filter(deal => {
      const dealLat = deal.merchant.latitude;
      const dealLng = deal.merchant.longitude;
      
      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (dealLat - userLat) * Math.PI / 180;
      const dLng = (dealLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(dealLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= radiusKm;
    });
  };

  // Handle deal filtering logic based on explore mode and location
  const getFilteredDeals = () => {
    if (searchQuery) {
      return searchResults;
    }
    
    // If in explore mode, show all deals regardless of location
    if (exploreMode) {
      return deals;
    }
    
    // If user is in an enabled state, show nearby deals
    if (location && isInEnabledState) {
      return getNearbyDeals(deals, location.lat, location.lng);
    }
    
    // If user is not in an enabled state and not in explore mode, show empty array
    if (location && !isInEnabledState && !exploreMode) {
      return [];
    }
    
    // Default: show all deals if no location
    return deals;
  };

  const displayedDeals = getFilteredDeals();

  // Debug logging to track search state
  useEffect(() => {
    console.log('Search state:', {
      searchQuery,
      searchResultsLength: searchResults.length,
      searchResultsData: searchResults,
      dealsLength: deals.length,
      displayedDealsLength: displayedDeals.length,
      isSearching: !!searchQuery,
      searchLoading,
      searchEnabled: !!searchQuery && searchQuery.length > 0,
      exploreMode,
      isInEnabledState,
      userState
    });
  }, [searchQuery, searchResults, deals, displayedDeals, searchLoading, exploreMode, isInEnabledState, userState]);

  useEffect(() => {
    logAction("App Initialized", "FlashDeals app started");
    
    // Auto-refresh deals every 30 seconds
    const interval = setInterval(() => {
      refetchDeals();
    }, 30000);

    return () => clearInterval(interval);
  }, [logAction, refetchDeals]);

  // Only request location if permission is explicitly denied or prompt state
  // Don't auto-request on mount to avoid unnecessary permission prompts

  const handleDealClick = (deal: DealWithMerchant) => {
    setSelectedDeal(deal);
    logAction("Deal Viewed", `Deal ID: ${deal.id}, Title: ${deal.title}`);
    
    // Scroll to the corresponding deal card
    const dealCard = document.querySelector(`[data-deal-id="${deal.id}"]`);
    if (dealCard) {
      dealCard.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  };

  const handleCloseModal = useCallback(() => {
    setSelectedDeal(null);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      logAction("Search Query", `Query: "${query}"`);
    }
  };

  const handleLocationRequest = () => {
    requestLocation();
    logAction("Location Request", "User requested current location");
  };

  const handleNotification = (message: string) => {
    setNotification({ message, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleEditDeal = (deal: DealWithMerchant) => {
    // Navigate to merchant dashboard for editing
    window.location.href = `/merchant-dashboard?edit=${deal.id}`;
    logAction("Deal Edit Initiated", `Deal ID: ${deal.id}, Title: ${deal.title}`);
  };

  const handleMenuToggle = () => {
    setShowSideMenu(!showSideMenu);
    logAction("Menu Toggled", showSideMenu ? "Menu closed" : "Menu opened");
  };

  const handleAuditModalToggle = () => {
    setShowAuditModal(!showAuditModal);
    logAction("Audit Dashboard Accessed", "User viewed audit logs");
  };



  if (dealsLoading && deals.length === 0) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Map Container */}
      <div className="h-full w-full">
        <InteractiveMap
          deals={displayedDeals}
          userLocation={location}
          onDealClick={handleDealClick}
          onLocationUpdate={(lat, lng) => {
            logAction("Location Updated", `Lat: ${lat}, Lng: ${lng}`);
            handleNotification(`Location found! Showing deals near ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }}
        />
      </div>

      {/* Top Navigation */}
      <TopNavigation
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      {/* Explore Mode Banner */}
      {exploreMode && (
        <div className="absolute top-16 left-0 right-0 z-30 bg-blue-600 text-white text-center py-2 px-4">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm font-medium">Exploring all deals</span>
            <button
              onClick={() => {
                setExploreMode(false);
                logAction("Explore Mode", "User exited explore mode");
              }}
              className="text-blue-200 hover:text-white text-sm underline ml-2"
            >
              Exit explore mode
            </button>
          </div>
        </div>
      )}

      {/* Deal Cards */}
      <div className="absolute bottom-16 left-0 right-0 z-30 px-4">
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {searchLoading ? (
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Thinking...</h3>
              <p className="text-gray-600 text-sm">
                Searching for deals matching your query
              </p>
            </div>
          ) : displayedDeals.length > 0 ? (
            displayedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => handleDealClick(deal)}
                userLocation={location || undefined}
              />
            ))
          ) : searchQuery && !searchLoading ? (
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Results Found</h3>
              <p className="text-gray-600 text-sm mb-4">
                No deals match your search for "{searchQuery}"
              </p>
              <p className="text-gray-500 text-xs">
                Try different keywords or browse all available deals
              </p>
            </div>
          ) : location ? (
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Deals Nearby</h3>
              <p className="text-gray-600 text-sm mb-4">
                We don't have any flash deals within 50km of your location right now.
              </p>
              <p className="text-gray-500 text-xs">
                Check back later or explore the map for deals in other areas!
              </p>
            </div>
          ) : !location && permissionState === 'denied' ? (
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Access Denied</h3>
              <p className="text-gray-600 text-sm mb-4">
                Please enable location access in your browser settings to see nearby deals
              </p>
              <button 
                onClick={handleLocationRequest}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : !location && (permissionState === 'prompt' || (permissionState === 'unknown' && !locationLoading)) ? (
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-80 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Enable Location</h3>
              <p className="text-gray-600 text-sm mb-4">
                Allow location access to see deals near you
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Looking to create deals? <a href="/merchant-dashboard" className="text-blue-500 hover:underline">Go to Merchant Dashboard</a>
              </p>
              <button 
                onClick={handleLocationRequest}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                disabled={locationLoading}
              >
                {locationLoading ? "Getting Location..." : "Enable Location"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className={`${displayedDeals.length === 0 ? 'bottom-60' : 'bottom-52'} right-4 fixed z-40 transition-all duration-300`}>
        <FloatingButtons
          onLocationClick={handleLocationRequest}
        />
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="map"
        onAuditClick={handleAuditModalToggle}
      />

      {/* Side Menu */}
      <SideMenu
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        onAuditClick={handleAuditModalToggle}
        onMerchantClick={() => {}}
      />

      {/* Deal Details Modal */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={handleCloseModal}
          onClaim={async () => {
            try {
              // Make the claim request using apiRequest
              await queryClient.getQueryData(["/api/deals"]) // This will force the cache to be fresh
              const response = await fetch(`/api/deals/${selectedDeal.id}/claim`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                  'Content-Type': 'application/json'
                },
                credentials: 'include'
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to claim deal');
              }
              
              logAction("Deal Claimed", `Deal ID: ${selectedDeal.id}`);
              handleNotification("Deal claimed successfully!");
              
              // Refresh deals after claiming
              queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
              
            } catch (error) {
              console.error('Claim error:', error);
              if (error instanceof Error) {
                handleNotification(error.message);
              } else {
                handleNotification("Failed to claim deal. Please try again.");
              }
            }
          }}
          onEdit={() => handleEditDeal(selectedDeal)}
          onAuthRequired={(forceCustomerLogin = false) => authModal.openModal(`/deals/${selectedDeal.id}`, forceCustomerLogin)}
        />
      )}

      {/* Audit Modal */}
      <AuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />



      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={authModal.closeModal}
        redirectAfterAuth={authModal.redirectAfterAuth}
        forceCustomerLogin={authModal.forceCustomerLogin}
      />

      {/* Notification Toast */}
      <NotificationToast
        message={notification.message}
        visible={notification.visible}
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
      />

      {/* Loading Overlay */}
      {locationLoading && (
        <div className="absolute inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 text-center">
            <LoadingSpinner />
            <p className="mt-2 text-gray-600">Getting your location...</p>
          </div>
        </div>
      )}

      {/* State Disabled Overlay */}
      {location && userState && !isInEnabledState && !exploreMode && (
        <div className="absolute inset-0 z-40 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-xl">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              We're not yet in your area
            </h3>
            <p className="text-gray-600 mb-4">
              FlashDeals is currently available in select locations. We detected you're in {userState === 'NewYork' ? 'New York' : userState}.
            </p>
            <button
              onClick={() => {
                handleNotification("Thanks for your interest! We'll notify you when FlashDeals comes to your area.");
                logAction("Notification Request", `User in ${userState} requested notification`);
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Notify me when available
            </button>
            <button
              onClick={() => {
                // Enable exploration mode by clearing location restrictions
                setExploreMode(true);
                logAction("Explore Mode", `User in ${userState} started exploring all deals`);
              }}
              className="block w-full mt-3 text-blue-600 hover:text-blue-800 transition-colors underline"
            >
              Take a look around
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Currently serving: Arizona
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
