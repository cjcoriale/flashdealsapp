import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Store, Mail, Lock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const merchantLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(10, "Please provide a brief description of your business"),
});

interface MerchantLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MerchantLoginModal({ isOpen, onClose, onSuccess }: MerchantLoginModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<'login' | 'signup'>('login');

  const form = useForm({
    resolver: zodResolver(merchantLoginSchema),
    defaultValues: {
      email: "",
      businessName: "",
      description: "",
    },
  });

  const createMerchantMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = '/api/merchants';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Object.keys(localStorage).find(key => key.startsWith('session-')) ? localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('session-')) || '') : ''}`,
        },
        body: JSON.stringify({
          name: data.businessName,
          description: data.description,
          contactEmail: data.email,
          // Default location coordinates (NYC)
          latitude: 40.7128,
          longitude: -74.0060,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your merchant account has been created. You can now add deals!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      form.reset();
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create merchant account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createMerchantMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Merchant Portal Access</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {currentView === 'login' ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Welcome Back!</h3>
                <p className="text-gray-600 mb-4">
                  Sign in to manage your deals and reach more customers
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Demo Mode:</strong> Currently in development mode. 
                  Create a merchant account to start adding deals to the map!
                </p>
              </div>

              <Button 
                onClick={() => setCurrentView('signup')} 
                className="w-full"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Merchant Account
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Already have an account? Contact support for access.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Create Merchant Account</h3>
                <p className="text-gray-600 mb-4">
                  Join FlashDeals and start promoting your business with location-based offers
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Business Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="business@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief description of your business and services"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCurrentView('login')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMerchantMutation.isPending}
                      className="flex-1"
                    >
                      {createMerchantMutation.isPending ? "Creating..." : "Create Account"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}