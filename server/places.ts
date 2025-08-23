import { Client } from "@googlemaps/google-maps-services-js";

interface PlaceDetails {
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
  businessStatus?: string;
  types?: string[];
}

interface AddressValidationResult {
  isValid: boolean;
  normalizedAddress?: string;
  coordinates?: { lat: number; lng: number };
  placeDetails?: PlaceDetails;
  error?: string;
}

class GooglePlacesService {
  private client: Client;
  private apiKey: string;

  constructor() {
    this.client = new Client({});
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY_UNRESTRICTED || process.env.GOOGLE_PLACES_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Google Places API key not found. Please set GOOGLE_PLACES_API_KEY or GOOGLE_PLACES_API_KEY_UNRESTRICTED');
    }
  }

  async validateAndNormalizeAddress(address: string, businessName?: string): Promise<AddressValidationResult> {
    try {
      // First, try to find the place using text search with business name + address
      const searchQuery = businessName ? `${businessName} ${address}` : address;
      
      const searchResponse = await this.client.textSearch({
        params: {
          query: searchQuery,
          key: this.apiKey,
        },
      });

      if (searchResponse.data.results && searchResponse.data.results.length > 0) {
        const place = searchResponse.data.results[0];
        
        // Get more details about the place
        const detailsResponse = await this.client.placeDetails({
          params: {
            place_id: place.place_id!,
            key: this.apiKey,
            fields: ['name', 'formatted_address', 'geometry', 'business_status', 'types'],
          },
        });

        const details = detailsResponse.data.result;
        
        return {
          isValid: true,
          normalizedAddress: details.formatted_address!,
          coordinates: {
            lat: details.geometry!.location.lat,
            lng: details.geometry!.location.lng,
          },
          placeDetails: {
            name: details.name!,
            formattedAddress: details.formatted_address!,
            latitude: details.geometry!.location.lat,
            longitude: details.geometry!.location.lng,
            placeId: place.place_id!,
            businessStatus: details.business_status,
            types: details.types,
          },
        };
      }

      // If no business found, try just address geocoding
      const geocodeResponse = await this.client.geocode({
        params: {
          address: address,
          key: this.apiKey,
        },
      });

      if (geocodeResponse.data.results && geocodeResponse.data.results.length > 0) {
        const result = geocodeResponse.data.results[0];
        
        return {
          isValid: true,
          normalizedAddress: result.formatted_address,
          coordinates: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          },
        };
      }

      return {
        isValid: false,
        error: 'Address not found or invalid',
      };

    } catch (error) {
      console.error('Google Places API error:', error);
      return {
        isValid: false,
        error: 'Failed to validate address with Google Places API',
      };
    }
  }

  async searchBusinesses(query: string, location?: { lat: number; lng: number }): Promise<PlaceDetails[]> {
    try {
      const params: any = {
        query: query,
        key: this.apiKey,
      };

      if (location) {
        params.location = `${location.lat},${location.lng}`;
        params.radius = 50000; // 50km radius
      }

      const response = await this.client.textSearch({ params });

      return response.data.results?.map(place => ({
        name: place.name!,
        formattedAddress: place.formatted_address!,
        latitude: place.geometry!.location.lat,
        longitude: place.geometry!.location.lng,
        placeId: place.place_id!,
        businessStatus: place.business_status,
        types: place.types,
      })) || [];

    } catch (error) {
      console.error('Google Places search error:', error);
      return [];
    }
  }
}

export const placesService = new GooglePlacesService();
export type { AddressValidationResult, PlaceDetails };