import { useState, useCallback, useEffect } from 'react';

export function useLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('merchant_location');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (parsed.lat && parsed.lng) {
          setLocation(parsed);
        }
      } catch (e) {
        console.error('Failed to parse saved location:', e);
      }
    }
  }, []);

  // Save location to localStorage whenever it changes
  const updateLocation = useCallback((newLocation: { lat: number; lng: number }) => {
    setLocation(newLocation);
    localStorage.setItem('merchant_location', JSON.stringify(newLocation));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [updateLocation]);

  // Method to manually set location (for merchants setting their business location)
  const setManualLocation = useCallback((lat: number, lng: number) => {
    updateLocation({ lat, lng });
  }, [updateLocation]);

  // Method to clear saved location
  const clearSavedLocation = useCallback(() => {
    setLocation(null);
    localStorage.removeItem('merchant_location');
  }, []);

  return {
    location,
    isLoading,
    error,
    requestLocation,
    setManualLocation,
    clearSavedLocation,
  };
}
