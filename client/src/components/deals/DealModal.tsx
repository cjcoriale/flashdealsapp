import { Clock, MapPin, X, Star, Users, Phone, Navigation, Edit } from "lucide-react";
import { DealWithMerchant, Merchant } from "@shared/schema";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getDealColorClass } from "@/lib/dealColors";

interface DealModalProps {
  deal: DealWithMerchant;
  onClose: () => void;
  onClaim: () => void;
  onEdit?: () => void;
  onAuthRequired?: (forceCustomerLogin?: boolean) => void;
}

export default function DealModal({ deal, onClose, onClaim, onEdit, onAuthRequired }: DealModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const { user, isAuthenticated } = useAuth();
  
  // Get user's merchants to check ownership
  const { data: userMerchants = [] } = useQuery<Merchant[]>({
    queryKey: ["/api/my-merchants"],
    enabled: !!user && (user.role === 'merchant' || user.role === 'super_merchant'),
  });
  
  // Check if current user owns this deal's merchant
  const userOwnsMerchant = userMerchants.some(merchant => merchant.id === deal.merchantId);
  const isMerchant = user?.role === 'merchant' || user?.role === 'super_merchant';
  const canEditDeal = isMerchant && userOwnsMerchant;

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(deal.endTime).getTime();
      const difference = Math.max(0, Math.floor((endTime - now) / (1000 * 60)));
      setTimeLeft(difference);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deal.endTime]);

  const hours = Math.floor(timeLeft / 60);
  const minutes = timeLeft % 60;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl transform transition-transform duration-300 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div 
          className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-3 cursor-pointer hover:bg-gray-400 transition-colors"
          onClick={onClose}
        />
        
        {/* Business Name - Above Cover */}
        <div className="text-center mb-3 px-5">
          <h1 className="text-xl font-bold text-gray-900">{deal.merchant.name}</h1>
          <div className="flex items-center justify-center text-sm text-gray-500 mt-1">
            <MapPin className="w-3 h-3 mr-1" />
            <span>{deal.merchant.address.replace(', United States', '').replace(', USA', '')}</span>
          </div>
        </div>
        
        {/* Deal Cover */}
        <div className={`relative h-24 ${getDealColorClass(deal.coverColor)} flex items-center justify-center mb-4`}>
          <div className="text-4xl">{deal.dealEmoji || '🏪'}</div>
          <div className="absolute top-2 right-3">
            <span className="bg-white/90 text-gray-800 px-2 py-1 rounded-full text-xs font-bold">
              {deal.discountPercentage}% OFF
            </span>
          </div>
        </div>
        
        <div className="px-5 pb-5">

          {/* Deal Title & Description */}
          <div className="text-center mb-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">{deal.title}</h2>
            {deal.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{deal.description}</p>
            )}
          </div>

          {/* Compact Pricing Info */}
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">${deal.discountedPrice}</span>
                <span className="text-lg text-gray-500 line-through ml-2">${deal.originalPrice}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-600">{deal.discountPercentage}% OFF</div>
                <div className="text-xs text-green-600">Save ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}</div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                <span>{(deal.maxRedemptions || 0) - (deal.currentRedemptions || 0)} left</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span>{hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`}</span>
              </div>
              <div className="text-gray-500">
                {deal.category}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {canEditDeal ? (
              <button 
                onClick={() => {
                  onEdit?.();
                  onClose();
                }}
                className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Deal
              </button>
            ) : isMerchant ? (
              <div className="text-center">
                <button 
                  disabled
                  className="w-full bg-gray-400 text-white py-3.5 rounded-xl font-semibold text-base cursor-not-allowed shadow-lg mb-2"
                >
                  Unavailable as merchant
                </button>
                <button
                  onClick={() => {
                    // Force customer login for merchants wanting to claim deals
                    onAuthRequired?.(true);
                    onClose();
                  }}
                  className="text-blue-600 hover:text-blue-800 text-xs underline transition-colors"
                >
                  Login as customer to claim deals
                </button>
              </div>
            ) : (
              <button 
                onClick={() => {
                  if (isAuthenticated) {
                    onClaim();
                    onClose();
                  } else {
                    onAuthRequired?.();
                  }
                }}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors shadow-lg"
              >
                {isAuthenticated ? 'Claim Deal' : 'Sign In to Claim'}
              </button>
            )}
            
            <button 
              onClick={() => {
                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.merchant.address)}`;
                window.open(mapUrl, '_blank');
              }}
              className="w-full flex items-center justify-center border border-gray-300 text-gray-700 py-3.5 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors"
            >
              <Navigation className="w-4 h-4 mr-2" />
              <span>Get Directions</span>
            </button>
            
            {deal.merchant.phone && (
              <button 
                onClick={() => window.open(`tel:${deal.merchant.phone}`, '_self')}
                className="w-full flex items-center justify-center border border-gray-300 text-gray-700 py-3.5 rounded-xl font-semibold text-base hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                <span>Call Business</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
