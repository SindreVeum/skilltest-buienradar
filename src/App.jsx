import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Navbar from './components/Navbar';
import DetailedView from './DetailedView';

// Fix for default marker icons in Leaflet with React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Custom marker icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [0, -32]
});

L.Marker.prototype.options.icon = DefaultIcon;

function Overview() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:3004/data');
        const data = await res.json();
        setData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch weather data');
        setLoading(false);
      }
    };

    fetchData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="dashboard-header">
        <h1>Weather Dashboard - Sindre Veum</h1>
        <Navbar />
        <p className="last-updated">
          Last updated: {data?.stats?.latest ? new Date(data.stats.latest).toLocaleString() : 'Loading...'}
        </p>
      </header>

      <div className="dashboard-content">
        <div className="dashboard">
          <div className="data-box temperature-box">
            <div className="box-header">
              <h2>Maximum Temperature</h2>
            </div>
            <div className="box-content">
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <p className="temperature-value">
                    {data?.maxTemperature?.temperature != null
                      ? `${data.maxTemperature.temperature.toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="station-name">
                    {data?.maxTemperature?.stationname || 'Unknown Station'}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="data-box average-box">
            <div className="box-header">
              <h2>Average Temperature</h2>
            </div>
            <div className="box-content">
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <p className="temperature-value">
                    {data?.stats?.avgTemp != null
                      ? `${data.stats.avgTemp.toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="time-range">
                    {data?.stats?.earliest && data?.stats?.latest
                      ? `From ${new Date(data.stats.earliest).toLocaleDateString()} to ${new Date(data.stats.latest).toLocaleDateString()}`
                      : 'No time range available'}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="data-box difference-box">
            <div className="box-header">
              <h2>Temperature Difference</h2>
            </div>
            <div className="box-content">
              {loading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <p className="temperature-value">
                    {data?.biggestFeelTempDiff?.diff != null
                      ? `${data.biggestFeelTempDiff.diff.toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="station-name">
                    {data?.biggestFeelTempDiff?.stationname || 'Unknown Station'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="map-container">
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <MapContainer
              center={[52.1326, 5.2913]}
              zoom={7}
              style={{ height: '100%', width: '100%', borderRadius: '12px' }}
              className="modern-map"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {data?.stations?.map((station) => (
                <CircleMarker
                  key={station.stationname}
                  center={[station.lat, station.lon]}
                  radius={10}
                  pathOptions={{
                    fillColor: '#3498db',
                    fillOpacity: 0.9,
                    color: '#fff',
                    weight: 2
                  }}
                >
                  <Tooltip 
                    className="modern-tooltip"
                    permanent={false}
                    sticky={true}
                  >
                    <div className="tooltip-content">
                      <h3>{station.stationname}</h3>
                      <p>Latitude: {station.lat}</p>
                      <p>Longitude: {station.lon}</p>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/detailed" element={<DetailedView />} />
      </Routes>
    </Router>
  );
}

export default App;