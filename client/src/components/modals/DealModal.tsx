import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertDealSchema } from "@shared/schema";
import { z } from "zod";
import { Tag, Loader2, Clock, DollarSign, Percent, Calendar, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

const dealFormSchema = insertDealSchema.extend({
  title: z.string().min(3, "Title must be at least 3 characters"),
  originalPrice: z.number().min(0.01, "Price must be greater than 0"),
  discountedPrice: z.number().min(0.01, "Price must be greater than 0"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  merchantId: z.number().min(1, "Please select a business location"),
  maxRedemptions: z.number().min(1, "Quantity must be at least 1").default(25),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
}).refine((data) => {
  return data.discountedPrice < data.originalPrice;
}, {
  message: "Sale price must be less than original price",
  path: ["discountedPrice"],
});

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchants: any[];
  selectedMerchant?: any;
}

export default function DealModal({ isOpen, onClose, merchants, selectedMerchant }: DealModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [selectedMerchantData, setSelectedMerchantData] = useState<any>(selectedMerchant);

  const form = useForm({
    resolver: zodResolver(dealFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      category: "restaurant",
      originalPrice: 0,
      discountedPrice: 0,
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      maxRedemptions: 25,
      merchantId: selectedMerchant?.id || (merchants.length > 0 ? merchants[0].id : 0),
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const merchantId = selectedMerchant?.id || (merchants.length > 0 ? merchants[0].id : 0);
      const merchant = selectedMerchant || merchants.find(m => m.id === merchantId);
      setSelectedMerchantData(merchant);
      
      form.reset({
        title: "",
        description: "",
        category: merchant?.category || "restaurant",
        originalPrice: 0,
        discountedPrice: 0,
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxRedemptions: 25,
        merchantId: merchantId,
      });
      setDiscountPercentage(0);
    }
  }, [isOpen, selectedMerchant, merchants, form]);

  // Calculate discount percentage when prices change
  const watchedOriginalPrice = form.watch("originalPrice");
  const watchedDiscountedPrice = form.watch("discountedPrice");

  useEffect(() => {
    if (watchedOriginalPrice > 0 && watchedDiscountedPrice > 0) {
      const percentage = Math.round(((watchedOriginalPrice - watchedDiscountedPrice) / watchedOriginalPrice) * 100);
      setDiscountPercentage(percentage);
    } else {
      setDiscountPercentage(0);
    }
  }, [watchedOriginalPrice, watchedDiscountedPrice]);

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/deals", data);
    },
    onSuccess: () => {
      toast({
        title: "Deal Created",
        description: "Your flash deal has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants"] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create deal",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Calculate discount percentage
    const discountPercentage = Math.round(((data.originalPrice - data.discountedPrice) / data.originalPrice) * 100);
    
    createDealMutation.mutate({
      ...data,
      discountPercentage,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Create Flash Deal
          </DialogTitle>
          <DialogDescription>
            Create a limited-time discount for your customers to discover
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="merchantId">Business Location *</Label>
            <Select 
              onValueChange={(value) => form.setValue("merchantId", parseInt(value))}
              defaultValue={selectedMerchant?.toString() || (merchants.length > 0 ? merchants[0].id.toString() : "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a business location" />
              </SelectTrigger>
              <SelectContent>
                {merchants.map((merchant: any) => (
                  <SelectItem key={merchant.id} value={merchant.id.toString()}>
                    {merchant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.merchantId && (
              <p className="text-red-500 text-sm mt-1">
                {String(form.formState.errors.merchantId.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="title">Deal Title *</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="e.g., 50% Off Lunch Special"
            />
            {form.formState.errors.title && (
              <p className="text-red-500 text-sm mt-1">
                {String(form.formState.errors.title.message)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select onValueChange={(value) => form.setValue("category", value)} defaultValue="restaurant">
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="health">Health & Beauty</SelectItem>
                <SelectItem value="automotive">Automotive</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Section with Visual Feedback */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="originalPrice" className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Original Price *
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  {...form.register("originalPrice", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="text-lg font-medium"
                />
                {form.formState.errors.originalPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {String(form.formState.errors.originalPrice.message)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="discountedPrice" className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  Sale Price *
                </Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  step="0.01"
                  {...form.register("discountedPrice", { valueAsNumber: true })}
                  placeholder="0.00"
                  className="text-lg font-medium"
                />
                {form.formState.errors.discountedPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {String(form.formState.errors.discountedPrice.message)}
                  </p>
                )}
              </div>
            </div>
            
            {/* Discount Percentage Display */}
            {watchedOriginalPrice > 0 && watchedDiscountedPrice > 0 && discountPercentage > 0 && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Discount: {discountPercentage}% off
                      </span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-300">
                      Save ${(watchedOriginalPrice - watchedDiscountedPrice).toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timing Section */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime" className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Start Time *
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  {...form.register("startTime")}
                />
              </div>
              <div>
                <Label htmlFor="endTime" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  End Time *
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  {...form.register("endTime")}
                />
              </div>
            </div>
            
            {/* Duration Indicator */}
            {form.watch("startTime") && form.watch("endTime") && (
              <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Duration: {(() => {
                  const start = new Date(form.watch("startTime"));
                  const end = new Date(form.watch("endTime"));
                  const diffHours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                  return diffHours > 0 ? `${diffHours} hours` : 'Invalid timeframe';
                })()}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="maxRedemptions">Available Quantity *</Label>
            <Input
              id="maxRedemptions"
              type="number"
              {...form.register("maxRedemptions", { valueAsNumber: true })}
              placeholder="25"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe your deal..."
              rows={3}
            />
          </div>

          {/* Deal Summary */}
          {form.watch("title") && watchedOriginalPrice > 0 && watchedDiscountedPrice > 0 && (
            <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-medium text-orange-800 dark:text-orange-200">
                      {form.watch("title")}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="line-through text-gray-500">${watchedOriginalPrice.toFixed(2)}</span>
                      <span className="font-semibold text-orange-600">${watchedDiscountedPrice.toFixed(2)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {discountPercentage}% OFF
                      </Badge>
                    </div>
                    <div className="text-xs text-orange-500 dark:text-orange-400">
                      {selectedMerchantData?.name || 'Business location'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createDealMutation.isPending}
              className="flex-1"
            >
              {createDealMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Deal"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}