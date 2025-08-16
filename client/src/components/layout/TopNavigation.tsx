import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Store, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

interface SearchSuggestion {
  type: 'deal' | 'merchant' | 'city';
  id?: number;
  title: string;
  subtitle?: string;
  coordinates?: { lat: number; lng: number };
}

interface TopNavigationProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  onLocationSelect?: (coordinates: { lat: number; lng: number }, title: string) => void;
}

export default function TopNavigation({ onSearch, searchQuery, onLocationSelect }: TopNavigationProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch search suggestions
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery({
    queryKey: ["/api/search/suggestions", localSearch],
    enabled: localSearch.length >= 2 && showSuggestions,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const suggestions: SearchSuggestion[] = (suggestionsData as any)?.suggestions || [];
  
  // Debug logging
  console.log('Search state:', {
    localSearch,
    showSuggestions,
    suggestionsCount: suggestions.length,
    isLoading: suggestionsLoading,
    rawData: suggestionsData
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    onSearch(value);
    setShowSuggestions(value.length >= 2);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'city' && suggestion.coordinates && onLocationSelect) {
      onLocationSelect(suggestion.coordinates, suggestion.title);
    } else {
      setLocalSearch(suggestion.title);
      onSearch(suggestion.title);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    if (localSearch.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow clicking suggestions
    setTimeout(() => setShowSuggestions(false), 200);
  };

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'deal':
        return <Tag className="w-4 h-4 text-blue-500" />;
      case 'merchant':
        return <Store className="w-4 h-4 text-green-500" />;
      case 'city':
        return <MapPin className="w-4 h-4 text-purple-500" />;
      default:
        return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-6">
      <div className="flex items-center justify-between">
        {/* Search Bar with Suggestions */}
        <div className="flex-1 mr-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search deals, restaurants, cities..."
              value={localSearch}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className="pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-lg"
            />
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-50">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${suggestion.id || suggestion.title}`}
                  ref={el => suggestionRefs.current[index] = el}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors ${
                    selectedIndex === index ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-sm text-gray-500 truncate">
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                    {suggestion.type === 'city' && (
                      <div className="flex-shrink-0 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Go to location
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Debug info */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-red-500 text-white p-2 rounded text-xs z-50">
              Debug: showSuggestions={showSuggestions.toString()}, suggestions.length={suggestions.length}, localSearch="{localSearch}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
