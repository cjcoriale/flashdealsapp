import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, MapPin, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const [step, setStep] = useState<'role' | 'signup' | 'signin'>('role');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'merchant' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: ''
  });

  const handleRoleSelection = (role: 'customer' | 'merchant') => {
    setSelectedRole(role);
    setStep('signup');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          role: selectedRole
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Signup failed');
      }

      // Redirect to app with token
      window.location.href = `/map?auth=success&token=${encodeURIComponent(data.token)}`;
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed');
      }

      // Redirect to app with token
      window.location.href = `/map?auth=success&token=${encodeURIComponent(data.token)}`;
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep('role');
    setSelectedRole(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      confirmPassword: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetModal();
      onClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'role' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Welcome to FlashDeals</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Card 
                className="cursor-pointer transition-all hover:border-blue-300"
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
                className="cursor-pointer transition-all hover:border-green-300"
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
                    • Track deal performance and analytics
                    • Reach more local customers
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('signin')}
                className="w-full"
              >
                Already have an account? Sign In
              </Button>
            </div>
          </>
        )}

        {step === 'signup' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">
                Create {selectedRole === 'customer' ? 'Customer' : 'Merchant'} Account
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('signin')}
                className="w-full"
              >
                Already have an account? Sign In
              </Button>
            </form>
          </>
        )}

        {step === 'signin' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Sign In</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSignin} className="space-y-4">
              <div>
                <Label htmlFor="signinEmail">Email</Label>
                <Input
                  id="signinEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div>
                <Label htmlFor="signinPassword">Password</Label>
                <div className="relative">
                  <Input
                    id="signinPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('role')}
                className="w-full"
              >
                Don't have an account? Sign Up
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}