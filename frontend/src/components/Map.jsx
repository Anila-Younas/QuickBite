import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
};

const CurrentLocationControl = () => {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const goToCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.setView([position.coords.latitude, position.coords.longitude], 15);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Could not get your current location.");
          setLoading(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control leaflet-bar" style={{ marginTop: '80px', marginRight: '10px' }}>
        <button 
          onClick={goToCurrentLocation}
          title="Current Location"
          style={{ width: '34px', height: '34px', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '...' : '📍'}
        </button>
      </div>
    </div>
  );
};

const getCustomIcon = (type) => {
  let bgColor = '#4f378a'; // default Admin/System
  let emoji = '📍';
  if (type === 'restaurant') { bgColor = '#e11d48'; emoji = '🏪'; }
  else if (type === 'rider') { bgColor = '#0070f3'; emoji = '🛵'; }
  else if (type === 'customer') { bgColor = '#ff6b00'; emoji = '🏠'; }
  else if (type === 'user') { bgColor = '#10b981'; emoji = '👤'; }

  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${bgColor}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 3px solid white; font-size: 18px;">
             ${emoji}
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const Map = ({ center = [32.5837, 71.5241], zoom = 13, markers = [] }) => {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} className="rounded-2xl z-0 relative">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <RecenterMap lat={center[0]} lng={center[1]} />
      <CurrentLocationControl />
      {markers.map((marker, idx) => (
        <Marker 
          key={idx} 
          position={marker.position} 
          icon={marker.type ? getCustomIcon(marker.type) : new L.Icon.Default()}
        >
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
