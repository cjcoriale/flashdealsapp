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
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 px-4 py-2 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map(({ id, label, icon: Icon, href }) => (
          <Link key={id} href={href}>
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-3 ${
                location === href ? 'text-primary' : 'text-gray-600 hover:text-primary'
              } transition-colors`}
              onClick={() => handleNavClick(id)}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
