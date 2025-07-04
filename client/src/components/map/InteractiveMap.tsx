import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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
  const [zoom, setZoom] = useState(13);

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setZoom(15);
      onLocationUpdate(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, onLocationUpdate]);

  // Create user location icon
  const userIcon = new Icon({
    iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="3"/>
        <circle cx="12" cy="12" r="3" fill="white"/>
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className="leaflet-container"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* User Location Marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userIcon}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Your Location</p>
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
