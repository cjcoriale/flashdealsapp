import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';

export class VerificationService {
  private googleMapsClient: GoogleMapsClient;

  constructor() {
    this.googleMapsClient = new GoogleMapsClient({});
  }

  /**
   * Verify Google My Business ownership by checking place details
   * This is a simplified version - full GMB verification would require OAuth flow
   */
  async verifyGoogleMyBusiness(placeId: string, businessName: string, phone: string): Promise<{
    isVerified: boolean;
    confidence: number;
    details?: any;
    error?: string;
  }> {
    try {
      if (!process.env.GOOGLE_PLACES_API_KEY) {
        return {
          isVerified: false,
          confidence: 0,
          error: 'Google Places API key not configured'
        };
      }

      // Get place details from Google Places API
      const response = await this.googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          fields: ['name', 'formatted_phone_number', 'international_phone_number', 'website', 'url'],
          key: process.env.GOOGLE_PLACES_API_KEY,
        }
      });

      const placeDetails = response.data.result;
      
      if (!placeDetails) {
        return {
          isVerified: false,
          confidence: 0,
          error: 'Place not found'
        };
      }

      // Calculate confidence score based on matching data
      let confidence = 0;
      const factors = [];

      // Check business name match (case-insensitive, allowing for minor variations)
      const nameSimilarity = this.calculateStringSimilarity(
        businessName.toLowerCase().trim(),
        placeDetails.name?.toLowerCase().trim() || ''
      );
      if (nameSimilarity > 0.8) {
        confidence += 40;
        factors.push(`Business name match: ${(nameSimilarity * 100).toFixed(1)}%`);
      }

      // Check phone number match
      if (phone && placeDetails.formatted_phone_number) {
        const normalizedUserPhone = this.normalizePhoneNumber(phone);
        const normalizedPlacePhone = this.normalizePhoneNumber(placeDetails.formatted_phone_number);
        
        if (normalizedUserPhone === normalizedPlacePhone) {
          confidence += 40;
          factors.push('Phone number exact match');
        } else if (normalizedUserPhone.includes(normalizedPlacePhone.slice(-7)) || 
                   normalizedPlacePhone.includes(normalizedUserPhone.slice(-7))) {
          confidence += 20;
          factors.push('Phone number partial match');
        }
      }

      // Bonus points for having a website (indicates legitimate business)
      if (placeDetails.website) {
        confidence += 10;
        factors.push('Has website');
      }

      // Business is verified if confidence >= 70%
      const isVerified = confidence >= 70;

      return {
        isVerified,
        confidence,
        details: {
          placeName: placeDetails.name,
          placePhone: placeDetails.formatted_phone_number,
          placeWebsite: placeDetails.website,
          factors
        }
      };

    } catch (error) {
      console.error('Google My Business verification error:', error);
      return {
        isVerified: false,
        confidence: 0,
        error: 'Failed to verify with Google My Business'
      };
    }
  }

  /**
   * Generate and send phone verification code
   * In production, this would use Twilio or similar service
   */
  async sendPhoneVerificationCode(phone: string): Promise<{
    success: boolean;
    code?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // In development mode, just log the code
      // In production, you would integrate with Twilio, AWS SNS, or similar
      console.log(`📱 Phone Verification Code for ${phone}: ${code}`);
      console.log(`This code expires at: ${expiresAt.toISOString()}`);

      // TODO: Replace with actual SMS service integration
      // await this.sendSMS(phone, `Your FlashDeals verification code is: ${code}`);

      return {
        success: true,
        code, // In production, don't return the code
        expiresAt
      };

    } catch (error) {
      console.error('Phone verification error:', error);
      return {
        success: false,
        error: 'Failed to send verification code'
      };
    }
  }

  /**
   * Verify phone code
   */
  verifyPhoneCode(submittedCode: string, storedCode: string, expiresAt: Date): boolean {
    if (!submittedCode || !storedCode || !expiresAt) {
      return false;
    }

    // Check if code has expired
    if (new Date() > expiresAt) {
      return false;
    }

    // Check if codes match
    return submittedCode.trim() === storedCode.trim();
  }

  /**
   * Calculate string similarity using simple algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple similarity based on character overlap
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(str1, str2);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, ''); // Remove all non-digit characters
  }
}

export const verificationService = new VerificationService();