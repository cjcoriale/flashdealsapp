import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Loader2, DollarSign, Percent, Calendar, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDealSchema } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

const dealFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  originalPrice: z.number().min(0.01, "Original price must be greater than 0"),
  discountedPrice: z.number().min(0.01, "Discounted price must be greater than 0"),
  maxRedemptions: z.number().min(1, "Must allow at least 1 redemption"),
  merchantId: z.number().min(1, "Please select a business location"),
}).refine((data) => data.discountedPrice < data.originalPrice, {
  message: "Discounted price must be less than original price",
  path: ["discountedPrice"],
});

type DealFormData = z.infer<typeof dealFormSchema>;

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
      originalPrice: 0,
      discountedPrice: 0,
      maxRedemptions: 10,
      merchantId: selectedMerchant?.id || (merchants.length > 0 ? merchants[0].id : 0),
    },
  });

  // Watch price changes for discount calculation
  const originalPrice = form.watch("originalPrice");
  const discountedPrice = form.watch("discountedPrice");

  useEffect(() => {
    if (originalPrice > 0 && discountedPrice > 0) {
      const discount = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
      setDiscountPercentage(discount);
    }
  }, [originalPrice, discountedPrice]);

  useEffect(() => {
    if (selectedMerchant) {
      setSelectedMerchantData(selectedMerchant);
      form.setValue("merchantId", selectedMerchant.id);
    }
  }, [selectedMerchant, form]);

  useEffect(() => {
    const merchantId = form.watch("merchantId");
    if (merchantId && merchants.length > 0) {
      const merchant = merchants.find((m: any) => m.id === merchantId);
      setSelectedMerchantData(merchant);
    }
  }, [form.watch("merchantId"), merchants]);

  const createDealMutation = useMutation({
    mutationFn: async (dealData: DealFormData) => {
      return apiRequest("POST", `/api/merchants/${dealData.merchantId}/deals`, dealData);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Flash deal created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Deal creation error:", error);
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
    
    // Set default values for required fields
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const dealData = {
      ...data,
      discountPercentage,
      category: selectedMerchantData?.category || "food",
      startTime: now.toISOString(),
      endTime: tomorrow.toISOString(),
    };
    
    createDealMutation.mutate(dealData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: 10000 }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Create Flash Deal</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
            Create a limited-time discount for your customers to discover
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="merchantId">Business Location *</Label>
              <Select 
                onValueChange={(value) => form.setValue("merchantId", parseInt(value))}
                defaultValue={selectedMerchant?.id?.toString() || (merchants.length > 0 ? merchants[0].id.toString() : "")}
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
                className="mt-1"
              />
              {form.formState.errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {String(form.formState.errors.title.message)}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Describe your deal in detail..."
                className="mt-1 min-h-[80px]"
              />
              {form.formState.errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {String(form.formState.errors.description.message)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="originalPrice">Original Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    {...form.register("originalPrice", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
                {form.formState.errors.originalPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {String(form.formState.errors.originalPrice.message)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="discountedPrice">Sale Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="discountedPrice"
                    type="number"
                    step="0.01"
                    {...form.register("discountedPrice", { valueAsNumber: true })}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
                {form.formState.errors.discountedPrice && (
                  <p className="text-red-500 text-sm mt-1">
                    {String(form.formState.errors.discountedPrice.message)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="maxRedemptions">Maximum Claims</Label>
              <Input
                id="maxRedemptions"
                type="number"
                {...form.register("maxRedemptions", { valueAsNumber: true })}
                placeholder="10"
                className="mt-1"
              />
              {form.formState.errors.maxRedemptions && (
                <p className="text-red-500 text-sm mt-1">
                  {String(form.formState.errors.maxRedemptions.message)}
                </p>
              )}
            </div>

            {discountPercentage > 0 && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Percent className="w-4 h-4" />
                    <span className="font-semibold">{discountPercentage}% Off!</span>
                  </div>
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>{selectedMerchantData?.name || 'Business location'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createDealMutation.isPending}
                className="flex-1"
                onClick={() => {}}
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
        </div>
      </div>
    </div>
  );
}