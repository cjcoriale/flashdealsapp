import { DealWithMerchant } from "@shared/schema";
import { Clock, MapPin } from "lucide-react";

interface DealCardProps {
  deal: DealWithMerchant;
  onClick: () => void;
}

export default function DealCard({ deal, onClick }: DealCardProps) {
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

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60 * 60)));
  const distance = "0.2"; // Mock distance - in real app, calculate based on user location

  return (
    <div
      className="deal-card min-w-80 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
      onClick={onClick}
      data-deal-id={deal.id}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`${getCategoryColor(deal.category)} p-2 rounded-xl mr-3`}>
            <span className="text-white text-xl">{getCategoryIcon(deal.category)}</span>
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
        <div className="text-right">
          <div className={`${getCategoryColor(deal.category)} text-white px-3 py-1 rounded-full text-sm font-semibold text-center`}>
            {deal.discountPercentage}% OFF
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-gray-800 dark:text-white">${deal.discountedPrice}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 line-through ml-2">${deal.originalPrice}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
          <Clock className="w-4 h-4 mr-1" />
          <span>{timeLeft}h left</span>
        </div>
      </div>
    </div>
  );
}
