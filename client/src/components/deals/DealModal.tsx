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
          {/* Business Name - Main Header */}
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">{deal.dealEmoji || '🏪'}</span>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{deal.merchant.name}</h1>
              <div className="flex items-center text-sm text-gray-500 mt-0.5">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate">{deal.merchant.address}</span>
              </div>
            </div>
          </div>

          {/* Deal Information Section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="mb-3">
              <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Deal Title</label>
              <div className="text-lg font-semibold text-gray-900 mt-1">{deal.title}</div>
            </div>
            
            {deal.description && (
              <div className="mb-3">
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Description</label>
                <div className="text-sm text-gray-700 mt-1 leading-relaxed">{deal.description}</div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Category</label>
                <div className="text-sm text-gray-900 mt-1 font-medium">{deal.category}</div>
              </div>
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Deal Status</label>
                <div className="text-sm mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-4 border border-green-100">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Original Price</label>
                <div className="text-lg font-bold text-gray-500 line-through mt-1">${deal.originalPrice}</div>
              </div>
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Deal Price</label>
                <div className="text-lg font-bold text-gray-900 mt-1">${deal.discountedPrice}</div>
              </div>
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">You Save</label>
                <div className="text-lg font-bold text-green-600 mt-1">
                  ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="text-center py-2 bg-white/60 rounded-lg">
              <span className="text-2xl font-bold text-green-600">{deal.discountPercentage}% OFF</span>
            </div>
          </div>

          {/* Analytics Section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Deal Analytics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-bold text-gray-900">{deal.currentRedemptions || 0}</div>
                <div className="text-xs text-gray-600">Claimed</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-bold text-gray-900">
                  {(deal.maxRedemptions || 0) - (deal.currentRedemptions || 0)}
                </div>
                <div className="text-xs text-gray-600">Available</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-lg font-bold text-orange-600">
                  {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                </div>
                <div className="text-xs text-gray-600">Remaining</div>
              </div>
            </div>
          </div>

          {/* Time Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Start Time</label>
                <div className="text-sm text-gray-900 mt-1">
                  {new Date(deal.startTime).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 uppercase tracking-wide font-semibold">End Time</label>
                <div className="text-sm text-gray-900 mt-1">
                  {new Date(deal.endTime).toLocaleString()}
                </div>
              </div>
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
