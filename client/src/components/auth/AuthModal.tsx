import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Store, MapPin, Star, Clock, Tag, Shield, TrendingUp } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectAfterAuth?: string;
  forceCustomerLogin?: boolean;
}

export default function AuthModal({ isOpen, onClose, redirectAfterAuth, forceCustomerLogin = false }: AuthModalProps) {
  const [selectedUserType, setSelectedUserType] = useState<'customer' | 'vendor' | null>(forceCustomerLogin ? 'customer' : null);

  const handleLogin = (userType: 'customer' | 'vendor') => {
    // Store the user type preference in localStorage
    localStorage.setItem('userType', userType);
    
    // Redirect to login with return URL
    const returnUrl = redirectAfterAuth || window.location.pathname;
    window.location.href = `/api/login?returnTo=${encodeURIComponent(returnUrl)}`;
  };

  const resetSelection = () => {
    setSelectedUserType(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {selectedUserType ? 'Welcome!' : forceCustomerLogin ? 'Login as Customer' : 'Join FlashDeals'}
          </DialogTitle>
        </DialogHeader>

        {!selectedUserType && !forceCustomerLogin ? (
          <div className="space-y-4">
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
              Choose how you'd like to use FlashDeals
            </p>
            
            {/* Customer Option */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-500 group"
              onClick={() => setSelectedUserType('customer')}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">I'm a Customer</CardTitle>
                <CardDescription>
                  Discover and claim amazing local deals
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    Find Deals
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Save Favorites
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    Track Claims
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Browse deals on the map, save your favorites, and claim offers from local businesses
                </p>
              </CardContent>
            </Card>

            {/* Vendor Option */}
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:border-green-500 group"
              onClick={() => setSelectedUserType('vendor')}
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200">
                  <Store className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">I'm a Business Owner</CardTitle>
                <CardDescription>
                  Create deals and attract customers
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex flex-wrap justify-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    Create Deals
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Track Performance
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Manage Business
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Set up your business profile, create flash deals, and reach more customers
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              {selectedUserType === 'customer' ? (
                <User className="w-10 h-10 text-white" />
              ) : (
                <Store className="w-10 h-10 text-white" />
              )}
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {selectedUserType === 'customer' ? 'Customer Account' : 'Business Account'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {selectedUserType === 'customer' 
                  ? 'You\'ll be able to save deals, track your claims, and get personalized recommendations.'
                  : 'You\'ll be able to create a business profile, manage deals, and track your performance.'
                }
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => selectedUserType && handleLogin(selectedUserType)} 
                className="w-full"
                size="lg"
              >
                Continue with Replit
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={resetSelection}
                className="w-full"
              >
                ← Back to options
              </Button>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <Shield className="w-4 h-4 inline mr-1" />
              We use Replit's secure authentication. Your data is safe and encrypted.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}