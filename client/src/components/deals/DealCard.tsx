import { DealWithMerchant } from "@shared/schema";
import { Clock, MapPin } from "lucide-react";

interface DealCardProps {
  deal: DealWithMerchant;
  onClick: () => void;
}

export default function DealCard({ deal, onClick }: DealCardProps) {
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
      'Food': 'bg-accent',
      'Italian': 'bg-accent',
      'Coffee': 'bg-secondary',
      'Clothing': 'bg-red-500',
      'Wellness': 'bg-purple-500',
    };
    return colorMap[category] || 'bg-gray-500';
  };

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60 * 60)));
  const distance = "0.2"; // Mock distance - in real app, calculate based on user location

  return (
    <div
      className="deal-card min-w-80 rounded-2xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200"
      onClick={onClick}
      data-deal-id={deal.id}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`${getCategoryColor(deal.category)} p-2 rounded-xl mr-3`}>
            <span className="text-white text-xl">{getCategoryIcon(deal.category)}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{deal.merchant.name}</h3>
            <p className="text-sm text-gray-600 flex items-center">
              <span>{deal.merchant.category}</span>
              <span className="mx-1">•</span>
              <MapPin className="w-3 h-3 mr-1" />
              <span>{distance} miles</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`${getCategoryColor(deal.category)} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
            {deal.discountPercentage}% OFF
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-gray-800">${deal.discountedPrice}</span>
          <span className="text-sm text-gray-500 line-through ml-2">${deal.originalPrice}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span>{timeLeft}h left</span>
        </div>
      </div>
    </div>
  );
}
