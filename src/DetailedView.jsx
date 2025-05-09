import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Navbar from './components/Navbar';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function DetailedView() {
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [stationData, setStationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all stations
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch('http://localhost:3004/stations');
        const data = await res.json();
        setStations(data);
        if (data.length > 0) {
          setSelectedStation(data[0].stationname);
        }
      } catch (err) {
        console.error('Error fetching stations:', err);
        setError('Failed to fetch stations');
      }
    };

    fetchStations();
  }, []);

  // Fetch station data when selection changes
  useEffect(() => {
    const fetchStationData = async () => {
      if (!selectedStation) return;
      
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3004/station/${selectedStation}`);
        const data = await res.json();
        setStationData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching station data:', err);
        setError('Failed to fetch station data');
        setLoading(false);
      }
    };

    fetchStationData();
  }, [selectedStation]);

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  const chartData = {
    labels: stationData?.measurements?.map(m => 
      new Date(m.timestamp).toLocaleString()
    ) || [],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: stationData?.measurements?.map(m => m.temperature) || [],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Feels Like (°C)',
        data: stationData?.measurements?.map(m => m.feel_temperature) || [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Temperature Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Temperature (°C)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    }
  };

  return (
    <div className="app-container">
      <header className="dashboard-header">
        <h1>Weather Dashboard - Sindre Veum</h1>
        <Navbar />
        <div className="station-selector">
          <select 
            value={selectedStation} 
            onChange={(e) => setSelectedStation(e.target.value)}
            className="station-select"
          >
            {stations.map(station => (
              <option key={station.stationname} value={station.stationname}>
                {station.stationname}
              </option>
            ))}
          </select>
        </div>
        <p className="last-updated">
          Last updated: {stationData?.stats?.latest ? new Date(stationData.stats.latest).toLocaleString() : 'Loading...'}
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
                    {stationData?.stats?.maxTemp != null
                      ? `${stationData.stats.maxTemp.toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="station-name">
                    {selectedStation}
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
                    {stationData?.stats?.avgTemp != null
                      ? `${stationData.stats.avgTemp.toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="time-range">
                    {stationData?.stats?.earliest && stationData?.stats?.latest
                      ? `From ${new Date(stationData.stats.earliest).toLocaleDateString()} to ${new Date(stationData.stats.latest).toLocaleDateString()}`
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
                    {stationData?.stats?.maxTempDiff != null
                      ? `${stationData.stats.maxTempDiff.toFixed(1)}°C`
                      : 'N/A'}
                  </p>
                  <p className="station-name">
                    {selectedStation}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="chart-container">
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailedView;
