import { Map, List, Heart, BarChart3, User, Store, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface BottomNavigationProps {
  currentPage: string;
  onAuditClick: () => void;
}

export default function BottomNavigation({ currentPage, onAuditClick }: BottomNavigationProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Role-based navigation items
  const getNavItems = () => {
    if (user?.role === 'merchant') {
      return [
        { id: 'merchant', label: 'Create Deal', icon: Store, href: '/merchant-dashboard' },
        { id: 'map', label: 'Map', icon: Map, href: '/map' },
      ];
    } else {
      return [
        { id: 'map', label: 'Map', icon: Map, href: '/map' },
        { id: 'deals', label: 'Deals', icon: List, href: '/' },
        { id: 'saved', label: 'Saved', icon: Heart, href: '/saved-deals' },
        { id: 'profile', label: 'Profile', icon: User, href: '/profile' },
      ];
    }
  };
  
  const navItems = getNavItems();

  const handleNavClick = (id: string) => {
    if (id === 'analytics') {
      onAuditClick();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[99999] bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ id, label, icon: Icon, href }) => (
          <Link key={id} href={href}>
            <Button
              variant="ghost"
              className={`flex flex-col items-center justify-center py-3 px-3 rounded-lg transition-all duration-200 ${
                location === href 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-500 hover:text-primary hover:bg-primary/5'
              }`}
              onClick={() => handleNavClick(id)}
            >
              <Icon className="w-5 h-5 mb-0" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
