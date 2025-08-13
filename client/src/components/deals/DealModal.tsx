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
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div 
          className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4 cursor-pointer hover:bg-gray-400 transition-colors"
          onClick={onClose}
        />
        
        {/* Deal Cover with Emoji and Color */}
        <div className={`relative h-32 ${deal.coverColor || 'bg-gradient-to-br from-blue-500 to-purple-600'} flex items-center justify-center`}>
          <div className="text-5xl">{deal.dealEmoji || '🏪'}</div>
          <div className="absolute top-3 right-3">
            <span className="bg-white bg-opacity-90 text-gray-800 px-3 py-1 rounded-full text-sm font-bold">
              {deal.discountPercentage}% OFF
            </span>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 left-3 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="px-6 pb-6">
          {/* Location Header */}
          <div className="py-4 border-b border-gray-100">
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{deal.merchant.address}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{deal.title}</h2>
            <div className="flex items-center mt-2">
              <div className="text-3xl mr-3">{deal.dealEmoji || '🏪'}</div>
              <div className="text-lg font-semibold text-gray-700">{deal.merchant.name}</div>
            </div>
          </div>

          {/* Deal Details */}
          <div className="py-4 space-y-4">
            {deal.description && (
              <p className="text-gray-600">{deal.description}</p>
            )}
            
            {/* Pricing */}
            <div className="flex items-center justify-between">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-900">${deal.discountedPrice}</span>
                <span className="text-lg text-gray-500 line-through ml-3">${deal.originalPrice}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                  ${(deal.originalPrice - deal.discountedPrice).toFixed(2)} saved
                </div>
              </div>
            </div>
            
            {/* Availability and Time */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                <span>{(deal.maxRedemptions || 0) - (deal.currentRedemptions || 0)} left of {deal.maxRedemptions}</span>
              </div>
              <div className="flex items-center text-orange-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>
                  {hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`}
                </span>
              </div>
            </div>

            {deal.merchant.rating && (
              <div className="flex items-center text-sm text-gray-600">
                <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" />
                <span className="font-medium">{deal.merchant.rating}</span>
                <span className="mx-1">•</span>
                <span>{deal.merchant.reviewCount} reviews</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button 
              onClick={() => {
                if (isAuthenticated) {
                  onClaim();
                  onClose();
                } else {
                  onAuthRequired?.();
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              {isAuthenticated ? 'Claim Deal' : 'Sign In to Claim Deal'}
            </button>
            
            <div className="flex space-x-3">
              {deal.merchant.phone && (
                <button 
                  onClick={() => window.open(`tel:${deal.merchant.phone}`, '_self')}
                  className="flex-1 flex items-center justify-center border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </button>
              )}
              <button 
                onClick={() => {
                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.merchant.address)}`;
                  window.open(mapUrl, '_blank');
                }}
                className="flex-1 flex items-center justify-center border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Directions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
