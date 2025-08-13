import { Clock, MapPin, X, Star, Users, Phone, Navigation } from "lucide-react";
import { DealWithMerchant } from "@shared/schema";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

interface DealModalProps {
  deal: DealWithMerchant;
  onClose: () => void;
  onClaim: () => void;
  onAuthRequired?: () => void;
}

export default function DealModal({ deal, onClose, onClaim, onAuthRequired }: DealModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const { isAuthenticated } = useAuth();

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
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-end justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div 
          className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2 cursor-pointer hover:bg-gray-400 transition-colors"
          onClick={onClose}
        />
        
        {/* Deal Cover */}
        <div className={`relative h-24 ${deal.coverColor || 'bg-gradient-to-br from-blue-500 to-purple-600'} flex items-center justify-center mb-4`}>
          <div className="text-4xl">{deal.dealEmoji || '🏪'}</div>
          <div className="absolute top-2 right-3">
            <span className="bg-white/90 text-gray-800 px-2 py-1 rounded-full text-xs font-bold">
              {deal.discountPercentage}% OFF
            </span>
          </div>
        </div>
        
        <div className="px-5 pb-5">
          {/* Location */}
          <div className="flex items-center text-xs text-gray-500 mb-1">
            <MapPin className="w-3 h-3 mr-1" />
            <span className="truncate">{deal.merchant.address}</span>
          </div>

          {/* Deal Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-1">{deal.title}</h2>
          
          {/* Business Name with Icon */}
          <div className="flex items-center mb-4">
            <span className="text-lg mr-2">{deal.dealEmoji || '🏪'}</span>
            <span className="text-sm font-medium text-gray-700">{deal.merchant.name}</span>
          </div>

          {/* Pricing Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900">${deal.discountedPrice}</span>
                <span className="text-sm text-gray-500 line-through ml-2">${deal.originalPrice}</span>
              </div>
              <span className="text-sm font-semibold text-green-600">
                Save ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}
              </span>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1" />
                <span>{(deal.maxRedemptions || 0) - (deal.currentRedemptions || 0)} left</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                <span>
                  {hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {deal.description && (
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{deal.description}</p>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
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
            
            <div className="grid grid-cols-2 gap-3">
              {deal.merchant.phone && (
                <button 
                  onClick={() => window.open(`tel:${deal.merchant.phone}`, '_self')}
                  className="flex items-center justify-center border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  <span className="text-sm">Call</span>
                </button>
              )}
              <button 
                onClick={() => {
                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.merchant.address)}`;
                  window.open(mapUrl, '_blank');
                }}
                className="flex items-center justify-center border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <Navigation className="w-4 h-4 mr-1" />
                <span className="text-sm">Directions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
