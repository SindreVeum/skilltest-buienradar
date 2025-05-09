import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom minimalist marker icon using a divIcon
const customMarker = new L.DivIcon({
  className: 'custom-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
  html: '<div></div>'
});

export default function StationMap({ locations }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (locations) setLoading(false);
  }, [locations]);

  // Center the map over the Netherlands
  const center = [52.2, 5.3];

  if (loading) return <div>Loading map...</div>;
  if (error) return <div className="error">Error loading map: {error}</div>;
  if (!locations) return <div>Loading map...</div>;
  if (Array.isArray(locations) && locations.length === 0) return <div>No station data.</div>;

  return (
    <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} zoomControl={false} attributionControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {locations.map((s) =>
        s.lat && s.lon ? (
          <Marker key={s.stationid} position={[s.lat, s.lon]} icon={customMarker}>
            <Tooltip className="custom-popup" direction="top" offset={[0, -10]} opacity={1} permanent={false}>
              <div style={{ minWidth: 120 }}>
                <strong>{s.stationname}</strong>
              </div>
            </Tooltip>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
