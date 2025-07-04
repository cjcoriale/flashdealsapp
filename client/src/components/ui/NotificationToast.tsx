import { useEffect } from "react";
import { X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
}

export default function NotificationToast({ message, visible, onClose }: NotificationToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className={`notification-toast ${visible ? 'show' : ''} fixed top-20 left-4 right-4 z-50`}>
      <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-secondary">
        <div className="flex items-center">
          <div className="bg-secondary p-2 rounded-xl mr-3">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800">New Notification</h4>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 rounded-full ml-2"
          >
            <X className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}
