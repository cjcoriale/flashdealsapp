import { DealWithMerchant } from "@shared/schema";
import { Clock, MapPin } from "lucide-react";
import { getDealColorClass } from "@/lib/dealColors";

interface DealCardProps {
  deal: DealWithMerchant;
  onClick: () => void;
  userLocation?: { lat: number; lng: number };
}

export default function DealCard({ deal, onClick, userLocation }: DealCardProps) {
  const getDealIcon = () => {
    return deal.dealEmoji || '🏪';
  };

  const getDealColor = () => {
    return getDealColorClass(deal.coverColor);
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

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60 * 60)));
  
  const distance = userLocation 
    ? calculateDistance(userLocation.lat, userLocation.lng, deal.merchant.latitude, deal.merchant.longitude).toFixed(1)
    : "–";

  return (
    <div
      className="deal-card min-w-80 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
      onClick={onClick}
      data-deal-id={deal.id}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`${getDealColor()} p-2 rounded-xl mr-3`}>
            <span className="text-white text-xl">{getDealIcon()}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white">{deal.merchant.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
              <span>{deal.merchant.category}</span>
              <span className="mx-1">•</span>
              <MapPin className="w-3 h-3 mr-1" />
              <span>{distance} miles</span>
            </p>
          </div>
        </div>

      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-gray-800 dark:text-white">${deal.discountedPrice}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 line-through ml-2">${deal.originalPrice}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${getDealColor()} text-white px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap`}>
            {deal.discountPercentage}%
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <Clock className="w-4 h-4 mr-1" />
            <span>{timeLeft}h left</span>
          </div>
        </div>
      </div>
    </div>
  );
}
