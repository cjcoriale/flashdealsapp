import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingButtonsProps {
  onLocationClick: () => void;
}

export default function FloatingButtons({ 
  onLocationClick
}: FloatingButtonsProps) {
  return (
    <div className="flex flex-col space-y-3">
      <Button
        size="icon"
        onClick={onLocationClick}
        className="floating-button bg-white hover:bg-gray-50 text-primary shadow-lg w-12 h-12 rounded-full"
      >
        <Navigation className="w-6 h-6" />
      </Button>
    </div>
  );
}
