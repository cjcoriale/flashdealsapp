import { Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { DealWithMerchant } from "@shared/schema";

interface DealMarkerProps {
  deal: DealWithMerchant;
  onClick: () => void;
}

export default function DealMarker({ deal, onClick }: DealMarkerProps) {
  // Use custom deal icon and color from deal creation
  const getDealIcon = () => {
    return deal.dealEmoji || '🏪';
  };

  const getDealColor = () => {
    // Convert Tailwind class to hex color
    const colorMap: { [key: string]: string } = {
      'bg-red-500': '#EF4444',
      'bg-green-500': '#10B981',
      'bg-blue-500': '#3B82F6',
      'bg-yellow-500': '#EAB308',
      'bg-purple-500': '#8B5CF6',
      'bg-pink-500': '#EC4899',
      'bg-indigo-500': '#6366F1',
      'bg-orange-500': '#F97316',
      'bg-teal-500': '#14B8A6',
      'bg-cyan-500': '#06B6D4',
      'bg-gray-500': '#6B7280',
      'bg-gradient-to-br from-blue-500 to-purple-600': '#3B82F6',
    };
    return colorMap[deal.coverColor || 'bg-blue-500'] || '#3B82F6';
  };

  const icon = getDealIcon();
  const color = getDealColor();

  const customIcon = new Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="20" y="26" text-anchor="middle" font-size="14" fill="white">${icon}</text>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <Marker
      position={[deal.merchant.latitude, deal.merchant.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: onClick,
        mousedown: onClick,
      }}
    >
      <Popup>
        <div className="p-3 min-w-64">
          {/* Header with emoji and discount badge */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-xl mr-2">{icon}</span>
              <h3 className="font-bold text-gray-900">{deal.merchant.name}</h3>
            </div>
            <span className="text-white px-2 py-1 rounded-full text-xs font-bold" style={{backgroundColor: color}}>
              {deal.discountPercentage}% OFF
            </span>
          </div>
          
          {/* Deal title */}
          <p className="text-sm font-semibold text-gray-800 mb-2">{deal.title}</p>
          
          {/* Address */}
          <p className="text-xs text-gray-500 mb-3">{deal.merchant.address}</p>
          
          {/* Price section */}
          <div className="bg-gray-50 rounded-lg p-2 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-gray-900">${deal.discountedPrice}</span>
                <span className="text-sm text-gray-500 line-through ml-2">${deal.originalPrice}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-green-600">
                  ${(deal.originalPrice - deal.discountedPrice).toFixed(2)}
                </div>
                <div className="text-xs text-green-600">SAVED</div>
              </div>
            </div>
          </div>
          
          {/* Time remaining */}
          <div className="text-center mb-3">
            <span className="text-xs text-orange-600 font-medium">{timeLeft}h remaining</span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full text-white px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{backgroundColor: color}}
          >
            View Deal Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
