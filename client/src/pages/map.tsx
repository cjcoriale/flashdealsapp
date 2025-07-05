import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DealWithMerchant } from "@shared/schema";
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

  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false
  });

  const { location, requestLocation, isLoading: locationLoading } = useLocation();
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
    queryKey: ["/api/search", searchQuery],
    enabled: !!searchQuery,
    staleTime: 10000,
  });

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

  const nearbyDeals = location ? getNearbyDeals(deals, location.lat, location.lng) : deals;
  const displayedDeals = searchQuery ? searchResults : nearbyDeals;

  useEffect(() => {
    logAction("App Initialized", "FlashDeals app started");
    
    // Auto-refresh deals every 30 seconds
    const interval = setInterval(() => {
      refetchDeals();
    }, 30000);

    return () => clearInterval(interval);
  }, [logAction, refetchDeals]);

  // Separate effect for location request on initial load only
  useEffect(() => {
    // Request location once on mount, but only if we don't have it yet
    const timeoutId = setTimeout(() => {
      if (!location && !locationLoading) {
        requestLocation();
      }
    }, 1000); // Small delay to let the page load

    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array - only run once on mount

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
            handleNotification("Location updated! Map centered on your area.");
          }}
        />
      </div>

      {/* Top Navigation */}
      <TopNavigation
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      {/* Deal Cards */}
      <div className="absolute bottom-16 left-0 right-0 z-30 px-4">
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {displayedDeals.length > 0 ? (
            displayedDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => handleDealClick(deal)}
                userLocation={location}
              />
            ))
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
          ) : (
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
              <button 
                onClick={handleLocationRequest}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                Enable Location
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className={`${displayedDeals.length === 0 ? 'bottom-60' : 'bottom-32'} right-4 fixed z-40 transition-all duration-300`}>
        <FloatingButtons
          onLocationClick={handleLocationRequest}
          onNotificationClick={() => {
            refetchDeals();
            handleNotification("Refreshing deals...");
          }}
          notificationCount={0}
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
          onClaim={() => {
            logAction("Deal Claimed", `Deal ID: ${selectedDeal.id}`);
            handleNotification("Deal claimed successfully!");
          }}
          onAuthRequired={() => authModal.openModal(`/deals/${selectedDeal.id}`)}
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
    </div>
  );
}
