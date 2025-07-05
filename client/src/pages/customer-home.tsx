import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, Clock, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DealModal from "@/components/deals/DealModal";
import DealCard from "@/components/deals/DealCard";
import { useLocation } from "@/hooks/useLocation";
import { DealWithMerchant } from "@shared/schema";

export default function CustomerHome() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedDeal, setSelectedDeal] = useState<DealWithMerchant | null>(null);
  const { location } = useLocation();

  // Fetch deals
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["/api/deals"],
  });

  // Filter deals based on search and category
  const filteredDeals = deals.filter((deal: DealWithMerchant) => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || deal.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(deals.map((deal: DealWithMerchant) => deal.category)));

  const handleDealClick = (deal: DealWithMerchant) => {
    setSelectedDeal(deal);
  };

  const handleDealClaim = async () => {
    if (selectedDeal) {
      // Deal claim logic would go here
      setSelectedDeal(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Discover Local Deals
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {location ? `Near ${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}` : "Loading location..."}
              </p>
            </div>
            <Button
              onClick={() => window.location.href = "/map"}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              View Map
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <div className="px-4 py-6">
        {filteredDeals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No deals found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Try adjusting your search or category filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDeals.map((deal: DealWithMerchant) => (
              <DealCard
                key={deal.id}
                deal={deal}
                onClick={() => handleDealClick(deal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deal Modal */}
      {selectedDeal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onClaim={handleDealClaim}
        />
      )}
    </div>
  );
}