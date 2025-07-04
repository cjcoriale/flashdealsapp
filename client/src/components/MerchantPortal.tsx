import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Store, Plus, Calendar, MapPin, TrendingUp, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMerchantSchema, insertDealSchema } from "@shared/schema";
import { z } from "zod";

interface MerchantPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

const dealFormSchema = insertDealSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  originalPrice: z.number().min(0.01, "Price must be greater than 0"),
  discountedPrice: z.number().min(0.01, "Price must be greater than 0"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export default function MerchantPortal({ isOpen, onClose }: MerchantPortalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<'overview' | 'createDeal' | 'createMerchant'>('overview');
  const [selectedMerchant, setSelectedMerchant] = useState<number | null>(null);

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ["/api/my-merchants"],
    enabled: isOpen,
  });

  const { data: merchantDeals = [] } = useQuery({
    queryKey: ["/api/merchants", selectedMerchant, "deals"],
    enabled: selectedMerchant !== null,
  });

  const dealForm = useForm({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: "",
      description: "",
      originalPrice: 0,
      discountedPrice: 0,
      category: "",
      startTime: "",
      endTime: "",
      merchantId: selectedMerchant || 0,
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = `/api/merchants/${data.merchantId}/deals`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Object.keys(localStorage).find(key => key.startsWith('session-')) ? localStorage.getItem(Object.keys(localStorage).find(key => key.startsWith('session-')) || '') : ''}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your flash deal has been created and is now live!",
      });
      dealForm.reset();
      setCurrentView('overview');
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", selectedMerchant, "deals"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create deal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onCreateDeal = (data: any) => {
    if (!selectedMerchant) {
      toast({
        title: "Error",
        description: "Please select a business first.",
        variant: "destructive",
      });
      return;
    }

    const discountPercentage = Math.round(((data.originalPrice - data.discountedPrice) / data.originalPrice) * 100);
    createDealMutation.mutate({
      ...data,
      merchantId: selectedMerchant,
      discountPercentage,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick Action Header */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Plus className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-blue-900 dark:text-blue-100">
                  Create New Deal
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Add a flash deal for your customers to discover
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={() => setCurrentView('createDeal')}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={merchants.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Deal
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Your Businesses */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Businesses</h3>
        
        {merchantsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : merchants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No businesses yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Add your first business to start creating deals
              </p>
              <Button onClick={() => setCurrentView('createMerchant')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Business
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {merchants.map((merchant: any) => (
              <Card 
                key={merchant.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedMerchant === merchant.id ? 'border-blue-500' : ''
                }`}
                onClick={() => setSelectedMerchant(merchant.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {merchant.name}
                    <Badge variant={merchant.isActive ? "default" : "secondary"}>
                      {merchant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{merchant.category}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {merchant.description}
                  </p>
                  <p className="text-xs text-gray-500">{merchant.address}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Deals */}
      {selectedMerchant && merchantDeals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recent Deals</h3>
          <div className="space-y-2">
            {merchantDeals.slice(0, 3).map((deal: any) => (
              <Card key={deal.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-sm text-gray-600">
                      ${deal.discountedPrice} (was ${deal.originalPrice})
                    </p>
                  </div>
                  <Badge variant="outline">
                    {deal.redemptionCount} claimed
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCreateDeal = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentView('overview')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h3 className="text-lg font-semibold">Create New Deal</h3>
      </div>

      <form onSubmit={dealForm.handleSubmit(onCreateDeal)} className="space-y-4">
        <div>
          <Label htmlFor="title">Deal Title</Label>
          <Input
            id="title"
            {...dealForm.register("title")}
            placeholder="e.g., 50% Off Lunch Special"
          />
          {dealForm.formState.errors.title && (
            <p className="text-red-500 text-sm mt-1">
              {dealForm.formState.errors.title.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...dealForm.register("description")}
            placeholder="Describe your deal..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="originalPrice">Original Price</Label>
            <Input
              id="originalPrice"
              type="number"
              step="0.01"
              {...dealForm.register("originalPrice", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="discountedPrice">Sale Price</Label>
            <Input
              id="discountedPrice"
              type="number"
              step="0.01"
              {...dealForm.register("discountedPrice", { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(value) => dealForm.setValue("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="health">Health & Beauty</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              {...dealForm.register("startTime")}
            />
          </div>
          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              {...dealForm.register("endTime")}
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={createDealMutation.isPending}
        >
          {createDealMutation.isPending ? "Creating..." : "Create Deal"}
        </Button>
      </form>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Store className="w-5 h-5" />
            <span>Merchant Portal</span>
          </DialogTitle>
        </DialogHeader>

        {currentView === 'overview' && renderOverview()}
        {currentView === 'createDeal' && renderCreateDeal()}
      </DialogContent>
    </Dialog>
  );
}