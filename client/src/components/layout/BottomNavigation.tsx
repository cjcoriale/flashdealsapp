import { Map, List, Heart, BarChart3, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

interface BottomNavigationProps {
  currentPage: string;
  onAuditClick: () => void;
}

export default function BottomNavigation({ currentPage, onAuditClick }: BottomNavigationProps) {
  const [location] = useLocation();
  
  const navItems = [
    { id: 'map', label: 'Map', icon: Map, href: '/' },
    { id: 'deals', label: 'Deals', icon: List, href: '/deals' },
    { id: 'saved', label: 'Saved', icon: Heart, href: '/saved-deals' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { id: 'profile', label: 'Profile', icon: User, href: '/home' },
  ];

  const handleNavClick = (id: string) => {
    if (id === 'analytics') {
      onAuditClick();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-sm border-t border-gray-200/50 px-4 py-2 shadow-lg">
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
