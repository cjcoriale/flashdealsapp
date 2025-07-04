import { Map, List, Heart, BarChart3, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BottomNavigationProps {
  currentPage: string;
  onAuditClick: () => void;
}

export default function BottomNavigation({ currentPage, onAuditClick }: BottomNavigationProps) {
  const navItems = [
    { id: 'map', label: 'Map', icon: Map },
    { id: 'deals', label: 'Deals', icon: List },
    { id: 'saved', label: 'Saved', icon: Heart },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'analytics') {
      onAuditClick();
    }
    // Add navigation logic for other pages
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            className={`flex flex-col items-center py-2 px-3 ${
              currentPage === id ? 'text-primary' : 'text-gray-600 hover:text-primary'
            } transition-colors`}
            onClick={() => handleNavClick(id)}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
