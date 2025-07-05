import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Users, MapPin, BarChart3 } from "lucide-react";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoleSelectionModal({ isOpen, onClose }: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<'customer' | 'merchant' | null>(null);

  const handleRoleSelection = (role: 'customer' | 'merchant') => {
    setSelectedRole(role);
  };

  const handleLogin = () => {
    if (!selectedRole) return;
    
    // Redirect to login with role parameter
    window.location.href = `/api/auth/login?role=${selectedRole}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Welcome to FlashDeals</DialogTitle>
          <DialogDescription className="text-center">
            Choose how you'd like to use FlashDeals
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Card 
            className={`cursor-pointer transition-all ${
              selectedRole === 'customer' 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleRoleSelection('customer')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <MapPin className="w-8 h-8 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">I'm a Customer</CardTitle>
                  <CardDescription>Find amazing deals near me</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                • Discover local flash deals on an interactive map
                • Save your favorite deals for later
                • Get notified about new deals in your area
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              selectedRole === 'merchant' 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleRoleSelection('merchant')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Store className="w-8 h-8 text-green-600" />
                <div>
                  <CardTitle className="text-lg">I'm a Merchant</CardTitle>
                  <CardDescription>Promote my business deals</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                • Create and manage flash deals for your business
                • Track deal performance and customer engagement
                • Reach more customers in your local area
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLogin}
            disabled={!selectedRole}
            size="lg"
            className={`px-8 ${
              selectedRole === 'customer' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : selectedRole === 'merchant' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-400'
            }`}
          >
            {selectedRole === 'customer' && 'Continue as Customer'}
            {selectedRole === 'merchant' && 'Continue as Merchant'}
            {!selectedRole && 'Select a Role'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}