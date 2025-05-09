const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'server.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const port = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.resolve(__dirname, 'buienradar.db');
logger.info('Using database at:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error connecting to database:', err);
    process.exit(1);
  }
  logger.info('Connected to SQLite database');
});

// Helper function for database queries
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Helper function for single row queries
const queryOne = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Database query error:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Routes
app.get('/data', async (req, res) => {
  try {
    const response = {};

    // Get max temperature
    const maxTempRow = await queryOne(
      `SELECT m.*, s.stationname, temperature as value 
       FROM station_measurements m
       JOIN station_info s ON m.stationid = s.stationid
       ORDER BY temperature DESC LIMIT 1`
    );

    if (!maxTempRow) {
      logger.warn('No data found for max temperature');
      return res.json({ error: 'No data in station_measurements' });
    }
    response.maxTemperature = maxTempRow;

    // Get biggest feel temperature difference
    const maxDiffRow = await queryOne(
      `SELECT m.*, s.stationname, ABS(feeltemperature - temperature) as diff 
       FROM station_measurements m
       JOIN station_info s ON m.stationid = s.stationid
       ORDER BY diff DESC LIMIT 1`
    );
    response.biggestFeelTempDiff = maxDiffRow;

    // Get all station locations
    const locationRows = await query(
      `SELECT stationname, lat, lon FROM station_info`
    );
    response.stations = locationRows;

    // Get overall stats
    const statsRow = await queryOne(
      `SELECT AVG(temperature) as avgTemp, 
              MIN(timestamp) as earliest, 
              MAX(timestamp) as latest 
       FROM station_measurements`
    );
    response.stats = statsRow;

    res.json(response);
  } catch (err) {
    logger.error('Error in /data endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.get('/stations', async (req, res) => {
  try {
    const stations = await query(
      `SELECT DISTINCT s.stationname, s.lat, s.lon 
       FROM station_info s
       JOIN station_measurements m ON s.stationid = m.stationid
       ORDER BY s.stationname`
    );
    res.json(stations);
  } catch (err) {
    logger.error('Error in /stations endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

app.get('/station/:stationname', async (req, res) => {
  try {
    const { stationname } = req.params;
    const decodedName = decodeURIComponent(stationname);

    // Get measurements
    const measurements = await query(
      `SELECT 
        m.timestamp,
        m.temperature,
        m.feeltemperature as feel_temperature,
        s.stationname
      FROM station_measurements m
      JOIN station_info s ON m.stationid = s.stationid
      WHERE s.stationname = ?
      ORDER BY m.timestamp ASC`,
      [decodedName]
    );

    if (!measurements || measurements.length === 0) {
      return res.status(404).json({ error: 'No measurements found for this station' });
    }

    // Get station info
    const stationInfo = await queryOne(
      `SELECT lat, lon
       FROM station_info
       WHERE stationname = ?`,
      [decodedName]
    );

    // Get station stats
    const stats = await queryOne(
      `SELECT 
        AVG(m.temperature) as avgTemp,
        MAX(m.temperature) as maxTemp,
        MIN(m.temperature) as minTemp,
        MAX(ABS(m.temperature - m.feeltemperature)) as maxTempDiff,
        MIN(m.timestamp) as earliest,
        MAX(m.timestamp) as latest
      FROM station_measurements m
      JOIN station_info s ON m.stationid = s.stationid
      WHERE s.stationname = ?`,
      [decodedName]
    );

    res.json({
      stationInfo,
      measurements,
      stats
    });
  } catch (err) {
    logger.error('Error in /station/:stationname endpoint:', err);
    res.status(500).json({ error: 'Failed to fetch station data' });
  }
});

// shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Closing database connection...');
  db.close((err) => {
    if (err) {
      logger.error('Error closing database:', err);
    } else {
      logger.info('Database connection closed');
    }
    process.exit(0);
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});