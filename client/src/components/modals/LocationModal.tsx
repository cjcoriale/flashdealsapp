import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertMerchantSchema } from "@shared/schema";
import { z } from "zod";
import { MapPin, Search, Loader2 } from "lucide-react";

const locationFormSchema = insertMerchantSchema.extend({
  address: z.string().min(5, "Address is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  imageUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLocation?: any;
}

export default function LocationModal({ isOpen, onClose, editingLocation }: LocationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: editingLocation?.name || "",
      description: editingLocation?.description || "",
      category: editingLocation?.category || "",
      address: editingLocation?.address || "",
      latitude: editingLocation?.latitude || 0,
      longitude: editingLocation?.longitude || 0,
      phone: editingLocation?.phone || "",
      imageUrl: editingLocation?.imageUrl || "",
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingLocation) {
        return await apiRequest("PUT", `/api/merchants/${editingLocation.id}`, data);
      }
      return await apiRequest("POST", "/api/merchants", data);
    },
    onSuccess: () => {
      toast({
        title: editingLocation ? "Location Updated" : "Location Created",
        description: `Your business location has been ${editingLocation ? "updated" : "created"} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-merchants"] });
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
        description: `Failed to ${editingLocation ? "update" : "create"} location`,
        variant: "destructive",
      });
    },
  });

  const searchPlaces = async (query: string) => {
    if (query.length < 3) return;
    
    setIsSearching(true);
    try {
      const response = await apiRequest("GET", `/api/places/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.places || []);
    } catch (error) {
      console.error("Error searching places:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (place: any) => {
    form.setValue("name", place.name);
    form.setValue("address", place.address);
    form.setValue("latitude", place.latitude);
    form.setValue("longitude", place.longitude);
    form.setValue("phone", place.phone || "");
    setSearchResults([]);
    setSearchQuery("");
  };

  const onSubmit = (data: any) => {
    createLocationMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {editingLocation ? "Edit Location" : "Add Location"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Google Places Search */}
          <div className="space-y-2">
            <Label>Search for your business</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search for your business name or address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchPlaces(e.target.value);
                }}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
              )}
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map((place: any, index: number) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-sm">{place.name}</div>
                    <div className="text-xs text-gray-500">{place.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual Entry Fields */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Your business name"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select onValueChange={(value) => form.setValue("category", value)} defaultValue={editingLocation?.category}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="health">Health & Beauty</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.category && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.category.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                {...form.register("address")}
                placeholder="Full business address"
              />
              {form.formState.errors.address && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Brief description of your business"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createLocationMutation.isPending}
              className="flex-1"
            >
              {createLocationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingLocation ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingLocation ? "Update Location" : "Create Location"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}