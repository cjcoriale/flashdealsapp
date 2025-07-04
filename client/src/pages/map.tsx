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
import MerchantPortal from "@/components/MerchantPortal";
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
  const [showMerchantPortal, setShowMerchantPortal] = useState(false);
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
    staleTime: 30000, // 30 seconds
  });

  const {
    data: searchResults = [],
    isLoading: searchLoading
  } = useQuery<DealWithMerchant[]>({
    queryKey: ["/api/search", searchQuery],
    enabled: !!searchQuery,
    staleTime: 10000,
  });

  const displayedDeals = searchQuery ? searchResults : deals;

  useEffect(() => {
    logAction("App Initialized", "FlashDeals app started");
    
    // Auto-refresh deals every 30 seconds
    const interval = setInterval(() => {
      refetchDeals();
    }, 30000);

    return () => clearInterval(interval);
  }, [logAction, refetchDeals]);

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

  const handleMerchantPortalToggle = () => {
    setShowMerchantPortal(!showMerchantPortal);
    logAction("Merchant Portal Accessed", "User opened merchant portal");
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
          }}
        />
      </div>

      {/* Top Navigation */}
      <TopNavigation
        onSearch={handleSearch}
        onMenuClick={handleMenuToggle}
        searchQuery={searchQuery}
      />

      {/* Deal Cards */}
      <div className="absolute bottom-32 left-0 right-0 z-30 px-4">
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {displayedDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => handleDealClick(deal)}
            />
          ))}
        </div>
      </div>

      {/* Floating Action Buttons */}
      <FloatingButtons
        onLocationClick={handleLocationRequest}
        onNotificationClick={() => handleNotification("New deals found in your area!")}
        notificationCount={0}
      />

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
        onMerchantClick={handleMerchantPortalToggle}
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

      {/* Merchant Portal */}
      <MerchantPortal
        isOpen={showMerchantPortal}
        onClose={() => setShowMerchantPortal(false)}
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
