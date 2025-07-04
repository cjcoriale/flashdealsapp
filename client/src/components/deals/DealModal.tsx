import { Clock, MapPin, X, Star, Users } from "lucide-react";
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
      className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl transform transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar */}
        <div 
          className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-6 cursor-pointer hover:bg-gray-400 transition-colors"
          onClick={onClose}
        />
        
        <div className="px-6 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="bg-primary p-2 rounded-xl mr-3">
                  <span className="text-white text-xl">
                    {deal.category === 'Food' ? '🍕' : 
                     deal.category === 'Clothing' ? '👕' : 
                     deal.category === 'Wellness' ? '🧘' : '🏪'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{deal.merchant.name}</h2>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>{deal.merchant.address}</span>
                  </div>
                </div>
              </div>
              
              {deal.merchant.rating && (
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Star className="w-4 h-4 text-yellow-500 mr-1 fill-current" />
                  <span className="font-medium">{deal.merchant.rating}</span>
                  <span className="mx-1">•</span>
                  <span>{deal.merchant.reviewCount} reviews</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Deal Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{deal.title}</h3>
            <p className="text-gray-600 mb-4">{deal.description}</p>
            
            {/* Pricing */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-gray-800">${deal.discountedPrice}</span>
                <span className="text-lg text-gray-500 line-through ml-3">${deal.originalPrice}</span>
                <div className="ml-3">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                    {deal.discountPercentage}% OFF
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center text-orange-600 mb-1">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} left
                  </span>
                </div>
                <div className="text-lg font-semibold text-green-600">${(deal.originalPrice - deal.discountedPrice).toFixed(2)} saved</div>
              </div>
            </div>
            
            {/* Availability */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{deal.maxRedemptions! - deal.currentRedemptions!} left of {deal.maxRedemptions}</span>
              </div>
              <span className="text-xs text-gray-500">
                Deal ends {new Date(deal.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

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
              className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors"
            >
              {isAuthenticated ? 'Claim Deal' : 'Sign In to Claim Deal'}
            </button>
            
            <div className="flex space-x-3">
              {deal.merchant.phone && (
                <button 
                  onClick={() => window.open(`tel:${deal.merchant.phone}`, '_self')}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Call
                </button>
              )}
              <button 
                onClick={() => {
                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.merchant.address)}`;
                  window.open(mapUrl, '_blank');
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Directions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}