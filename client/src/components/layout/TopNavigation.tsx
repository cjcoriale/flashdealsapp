import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ProfileMenu from "@/components/ui/ProfileMenu";

interface TopNavigationProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function TopNavigation({ onSearch, searchQuery }: TopNavigationProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 p-4 pt-6">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 mr-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search deals, restaurants..."
              value={localSearch}
              onChange={handleSearchChange}
              className="pl-10 pr-3 py-3 border border-gray-300 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-lg"
            />
          </div>
        </div>

        {/* Profile Menu */}
        <ProfileMenu />
      </div>
    </div>
  );
}
