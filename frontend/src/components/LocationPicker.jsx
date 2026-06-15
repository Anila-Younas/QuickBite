import React, { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    }
  });
  return null;
}

const NominatimURL = 'https://nominatim.openstreetmap.org/reverse';

async function reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: lat,
      lon: lng,
      zoom: 18
    });
    const res = await fetch(`${NominatimURL}?${params}`);
    const data = await res.json();
    return data.display_name;
  } catch (err) {
    console.error(err);
    return '';
  }
}

export default function LocationPicker({
  value, // { lat, lng }
  onChange, // (newLocation) => void
  address, // string
  onAddressChange, // (newAddress) => void
  placeholder = 'Search or select on map...',
  height = '400px'
}) {
  const [localAddress, setLocalAddress] = useState(address);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const initialPosition = useMemo(() => {
    if (value?.lat && value?.lng) return [value.lat, value.lng];
    return [32.5837, 71.5241]; // Namal as default
  }, [value]);

  const handleLocationSelect = useCallback(async (loc) => {
    onChange(loc);
    const addr = await reverseGeocode(loc.lat, loc.lng);
    setLocalAddress(addr);
    onAddressChange(addr);
  }, [onChange, onAddressChange]);

  const handleGetMyLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };
          onChange(loc);
          const addr = await reverseGeocode(loc.lat, loc.lng);
          setLocalAddress(addr);
          onAddressChange(addr);
          setIsGettingLocation(false);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setIsGettingLocation(false);
        }
      );
    }
  };

  const markers = useMemo(() => {
    if (!value?.lat || !value?.lng) return [];
    return [{
      position: [value.lat, value.lng],
      label: 'Selected Location'
    }];
  }, [value]);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input
          type="text"
          value={localAddress}
          onChange={(e) => {
            setLocalAddress(e.target.value);
            onAddressChange(e.target.value);
          }}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#f97316]"
        />
        <button
          type="button"
          onClick={handleGetMyLocation}
          disabled={isGettingLocation}
          className="px-4 py-3 bg-[#f97316] text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {isGettingLocation ? 'Getting...' : '📍 My Location'}
        </button>
      </div>

      <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-gray-200">
        <MapContainer
          center={initialPosition}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m, i) => (
            <Marker key={i} position={m.position}>
              <Popup>{m.label}</Popup>
            </Marker>
          ))}
          <ClickHandler onLocationSelect={handleLocationSelect} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-500 text-center">Click anywhere on the map to select a location</p>
    </div>
  );
}
