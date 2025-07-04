import { useState } from "react";
import { DealWithMerchant } from "@shared/schema";
import { X, Clock, Star, Phone, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DealModalProps {
  deal: DealWithMerchant;
  onClose: () => void;
  onClaim: () => void;
}

export default function DealModal({ deal, onClose, onClaim }: DealModalProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const claimMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/deals/${deal.id}/claim`);
    },
    onSuccess: () => {
      toast({
        title: "Deal Claimed!",
        description: "Your deal has been successfully claimed.",
      });
      onClaim();
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim deal",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleClaim = () => {
    claimMutation.mutate();
  };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${deal.merchant.latitude},${deal.merchant.longitude}`;
    window.open(url, '_blank');
  };

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

  const timeLeft = Math.max(0, Math.floor((new Date(deal.endTime).getTime() - Date.now()) / (1000 * 60)));
  const hours = Math.floor(timeLeft / 60);
  const minutes = timeLeft % 60;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end justify-center"
      onClick={handleClose}
    >
      <div 
        className={`slide-up ${isVisible ? 'active' : ''} w-full max-w-lg bg-white rounded-t-3xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Handle Bar */}
          <div 
            className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6 cursor-pointer hover:bg-gray-400 transition-colors"
            onClick={handleClose}
          ></div>
          
          {/* Deal Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <div className={`w-16 h-16 ${getCategoryColor(deal.category)} rounded-xl mr-4 flex items-center justify-center`}>
                <span className="text-white text-2xl">{getCategoryIcon(deal.category)}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{deal.merchant.name}</h2>
                <p className="text-gray-600">{deal.merchant.category} • 0.2 miles away</p>
                <div className="flex items-center mt-1">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(deal.merchant.rating || 0) ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600 ml-2">
                    {deal.merchant.rating} ({deal.merchant.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Deal Details */}
          <div className="bg-accent bg-opacity-10 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-800">{deal.title}</h3>
              <div className={`${getCategoryColor(deal.category)} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                {deal.discountPercentage}% OFF
              </div>
            </div>
            <p className="text-gray-600 mb-3">{deal.description}</p>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-gray-800">${deal.discountedPrice}</span>
                <span className="text-lg text-gray-500 line-through ml-2">${deal.originalPrice}</span>
              </div>
              <div className="flex items-center text-red-600">
                <Clock className="w-4 h-4 mr-1" />
                <span className="font-semibold">
                  {hours}h {minutes}m left
                </span>
              </div>
            </div>
          </div>

          {/* Merchant Info */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">About the Merchant</h4>
            <p className="text-gray-600 text-sm mb-3">{deal.merchant.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{deal.merchant.address}</span>
              </div>
              {deal.merchant.phone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>{deal.merchant.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              onClick={handleClaim}
              disabled={claimMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              {claimMutation.isPending ? "Claiming..." : "Claim Deal"}
            </Button>
            <Button 
              onClick={handleGetDirections}
              variant="outline"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Get Directions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
