import { ArrowLeft, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ 
  title, 
  showBackButton = true, 
  backTo = "/",
  actions 
}: PageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation(backTo);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}