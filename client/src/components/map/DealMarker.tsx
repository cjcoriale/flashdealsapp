import { Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { DealWithMerchant } from "@shared/schema";

interface DealMarkerProps {
  deal: DealWithMerchant;
  onClick: () => void;
}

export default function DealMarker({ deal, onClick }: DealMarkerProps) {
  const getCategoryIcon = (category: string) => {
    const iconMap: { [key: string]: string } = {
      'Food': '🍕',
      'Italian': '🍝',
      'Coffee': '☕',
      'Clothing': '👕',
      'Wellness': '🧘',
    };
    return iconMap[category] || '🏪';
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Food': '#F59E0B',
      'Italian': '#F59E0B',
      'Coffee': '#10B981',
      'Clothing': '#EF4444',
      'Wellness': '#8B5CF6',
    };
    return colorMap[category] || '#6B7280';
  };

  const icon = getCategoryIcon(deal.category);
  const color = getCategoryColor(deal.category);

  const customIcon = new Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" fill="${color}" stroke="white" stroke-width="4"/>
        <text x="24" y="30" text-anchor="middle" font-size="16" fill="white">${icon}</text>
      </svg>
    `),
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60 * 60)));

  return (
    <Marker
      position={[deal.merchant.latitude, deal.merchant.longitude]}
      icon={customIcon}
      eventHandlers={{
        click: () => {
          console.log('Marker clicked for deal:', deal.id);
          onClick();
        },
      }}
    >
      <Popup>
        <div className="p-2 min-w-64">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">{deal.merchant.name}</h3>
            <span className="bg-primary text-white px-2 py-1 rounded-full text-sm font-semibold">
              {deal.discountPercentage}% OFF
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-2">{deal.title}</p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-gray-800">${deal.discountedPrice}</span>
              <span className="text-sm text-gray-500 line-through ml-2">${deal.originalPrice}</span>
            </div>
            <div className="text-sm text-gray-600">
              {timeLeft}h left
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="mt-2 w-full bg-primary text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
}
