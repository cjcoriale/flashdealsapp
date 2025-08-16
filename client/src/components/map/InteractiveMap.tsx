import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { useEffect, useState } from "react";
import { DealWithMerchant } from "@shared/schema";
import DealMarker from "./DealMarker";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React-Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  deals: DealWithMerchant[];
  userLocation: { lat: number; lng: number } | null;
  onDealClick: (deal: DealWithMerchant) => void;
  onLocationUpdate: (lat: number, lng: number) => void;
}

export default function InteractiveMap({ 
  deals, 
  userLocation, 
  onDealClick,
  onLocationUpdate 
}: InteractiveMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [zoom, setZoom] = useState(10); // Start more zoomed out

  // Calculate center of deals
  const calculateDealsCenter = (dealsList: DealWithMerchant[]) => {
    if (dealsList.length === 0) return null;
    
    const totalLat = dealsList.reduce((sum, deal) => sum + deal.merchant.latitude, 0);
    const totalLng = dealsList.reduce((sum, deal) => sum + deal.merchant.longitude, 0);
    
    return {
      lat: totalLat / dealsList.length,
      lng: totalLng / dealsList.length
    };
  };

  useEffect(() => {
    if (userLocation) {
      // If we have user location, center on user but zoomed out to see deals
      setMapCenter([userLocation.lat, userLocation.lng]);
      setZoom(12); // Closer zoom to show user location clearly
      onLocationUpdate(userLocation.lat, userLocation.lng);
    } else if (deals.length > 0) {
      // If no user location yet, center on deals
      const center = calculateDealsCenter(deals);
      if (center) {
        setMapCenter([center.lat, center.lng]);
        setZoom(6); // Very zoomed out to see all deals
      }
    }
  }, [userLocation?.lat, userLocation?.lng, deals.length, onLocationUpdate]);

  // Create user location icon
  const userIcon = new Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" fill="#3B82F6" stroke="white" stroke-width="4"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
        <circle cx="16" cy="16" r="2" fill="#3B82F6"/>
      </svg>
    `),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // Component to handle map updates
  function MapUpdater({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
    const map = useMap();
    
    useEffect(() => {
      if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 12);
      }
    }, [userLocation, map]);
    
    return null;
  }

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className="leaflet-container"
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapUpdater userLocation={userLocation} />
      
      {/* User Location Marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userIcon}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Your Location</p>
              <p className="text-sm text-gray-600">
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Deal Markers */}
      {deals.map((deal) => (
        <DealMarker
          key={deal.id}
          deal={deal}
          onClick={() => onDealClick(deal)}
        />
      ))}
    </MapContainer>
  );
}
