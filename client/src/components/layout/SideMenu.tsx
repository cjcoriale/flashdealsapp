import { useState } from "react";
import { X, UserCircle, Heart, Bell, Settings, ClipboardList, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAuditClick: () => void;
  onMerchantClick: () => void;
}

export default function SideMenu({ isOpen, onClose, onAuditClick, onMerchantClick }: SideMenuProps) {
  const handleAuditClick = () => {
    onClose();
    onAuditClick();
  };

  const handleMerchantClick = () => {
    onClose();
    onMerchantClick();
  };

  const menuItems = [
    { icon: UserCircle, label: "Profile", href: "/home", onClick: () => onClose() },
    { icon: Heart, label: "Saved Deals", href: "/saved-deals", onClick: () => onClose() },
    { icon: Store, label: "Merchant Portal", onClick: handleMerchantClick },
    { icon: Bell, label: "Notifications", onClick: () => onClose() },
    { icon: Settings, label: "Settings", onClick: () => onClose() },
    { icon: ClipboardList, label: "Audit Logs", onClick: handleAuditClick },
  ];

  return (
    <div className={`slide-right ${isOpen ? 'active' : ''} fixed top-0 right-0 bottom-0 z-40 bg-white shadow-2xl w-80 max-w-full`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-800">Menu</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6 text-gray-600" />
          </Button>
        </div>
        
        <nav className="space-y-4">
          {menuItems.map(({ icon: Icon, label, href, onClick }) => {
            const buttonContent = (
              <>
                <Icon className="w-6 h-6 text-gray-600 mr-4" />
                <span className="font-medium text-gray-800">{label}</span>
              </>
            );

            if (href) {
              return (
                <Link key={label} href={href}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                    onClick={onClick}
                  >
                    {buttonContent}
                  </Button>
                </Link>
              );
            }

            return (
              <Button
                key={label}
                variant="ghost"
                className="w-full justify-start py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={onClick}
              >
                {buttonContent}
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
