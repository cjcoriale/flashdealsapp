import { DealWithMerchant } from "@shared/schema";
import { Clock, MapPin } from "lucide-react";

interface DealCardProps {
  deal: DealWithMerchant;
  onClick: () => void;
  userLocation?: { lat: number; lng: number };
}

export default function DealCard({ deal, onClick, userLocation }: DealCardProps) {
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'food': '🍕',
      'Food': '🍕',
      'italian': '🍝',
      'Italian': '🍝',
      'coffee': '☕',
      'Coffee': '☕',
      'clothing': '👕',
      'Clothing': '👕',
      'wellness': '🧘',
      'Wellness': '🧘',
      'entertainment': '🎬',
      'Entertainment': '🎬',
      'shopping': '🛍️',
      'Shopping': '🛍️',
    };
    return iconMap[category] || '🏪';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'food': 'bg-red-500',
      'Food': 'bg-red-500',
      'italian': 'bg-green-500',
      'Italian': 'bg-green-500', 
      'coffee': 'bg-amber-600',
      'Coffee': 'bg-amber-600',
      'clothing': 'bg-blue-500',
      'Clothing': 'bg-blue-500',
      'wellness': 'bg-purple-500',
      'Wellness': 'bg-purple-500',
      'entertainment': 'bg-pink-500',
      'Entertainment': 'bg-pink-500',
      'shopping': 'bg-indigo-500',
      'Shopping': 'bg-indigo-500',
    };
    return colorMap[category] || 'bg-gray-500';
  };

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60)));
  const hours = Math.floor(timeLeft / 60);
  const minutes = timeLeft % 60;
  
  const distance = userLocation 
    ? calculateDistance(userLocation.lat, userLocation.lng, deal.merchant.latitude, deal.merchant.longitude).toFixed(1)
    : "–";

  return (
    <div
      className="deal-card min-w-80 bg-white rounded-2xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200 border border-gray-200"
      onClick={onClick}
      data-deal-id={deal.id}
    >
      {/* Icon with Colored Background */}
      <div className="mb-6">
        <div className={`${getCategoryColor(deal.category)} w-14 h-14 rounded-2xl flex items-center justify-center`}>
          <span className="text-white text-2xl">{deal.dealEmoji || getCategoryIcon(deal.category)}</span>
        </div>
      </div>

      {/* Deal Title and Description */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{deal.title}</h3>
        {deal.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{deal.description}</p>
        )}
      </div>

      {/* Location Section */}
      <div className="mb-6">
        <div className="flex items-start mb-1">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{deal.merchant.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{deal.merchant.address}</div>
            <div className="text-xs text-gray-500 mt-0.5">{distance} miles away</div>
          </div>
        </div>
      </div>

      {/* Price Details */}
      <div className="space-y-3">
        {/* Main Price */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">${deal.discountedPrice}</span>
            <span className="text-lg text-gray-500 line-through ml-3">${deal.originalPrice}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {deal.discountPercentage}%
            </div>
            <div className="text-xs text-green-600">OFF</div>
          </div>
        </div>

        {/* Key Details Row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {(deal.maxRedemptions || 0) - (deal.currentRedemptions || 0)}
            </div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
            </div>
            <div className="text-xs text-gray-500">Remaining</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              ${(deal.originalPrice - deal.discountedPrice).toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">Saved</div>
          </div>
        </div>
      </div>
    </div>
  );
}
