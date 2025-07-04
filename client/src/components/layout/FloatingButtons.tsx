import { Navigation, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingButtonsProps {
  onLocationClick: () => void;
  onNotificationClick: () => void;
  notificationCount?: number;
}

export default function FloatingButtons({ 
  onLocationClick, 
  onNotificationClick, 
  notificationCount = 0 
}: FloatingButtonsProps) {
  return (
    <div className="absolute bottom-48 right-4 z-20 flex flex-col space-y-3">
      <Button
        size="icon"
        onClick={onLocationClick}
        className="floating-button bg-white hover:bg-gray-50 text-primary shadow-lg w-12 h-12 rounded-full"
      >
        <Navigation className="w-6 h-6" />
      </Button>
      
      <Button
        size="icon"
        onClick={onNotificationClick}
        className="floating-button bg-white hover:bg-gray-50 text-gray-600 shadow-lg w-12 h-12 rounded-full relative"
      >
        <Bell className="w-6 h-6" />
        {notificationCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">
            {notificationCount}
          </span>
        )}
      </Button>
    </div>
  );
}
