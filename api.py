import requests
import json
import sqlite3
import time
import schedule
import datetime
import pandas as pd
import os
from typing import Dict, List, Optional
from sklearn.impute import KNNImputer
import numpy as np
import logging
from contextlib import contextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Print to console
        logging.FileHandler('buienradar.log')  # Save to file
    ]
)

class BuienradarDatabaseManager:
    def __init__(self, db_path="buienradar.db"):
        """Initialize database connection and tables"""
        self.db_path = db_path
        self.base_url = "https://data.buienradar.nl/2.0/feed/json"
        logging.info("Initializing BuienradarDatabaseManager...")
        self.create_tables()
        logging.info("Database initialization complete.")
    
    @contextmanager
    def get_db_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()
    
    def create_tables(self):
        """Create database tables if they don't exist"""
        with self.get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Create table for station info
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS station_info (
                stationid INTEGER PRIMARY KEY,
                stationname TEXT,
                lat REAL,
                lon REAL,
                regio TEXT,
                last_updated TIMESTAMP
            )
            ''')
            
            # Create table for station measurements
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS station_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stationid INTEGER,
                timestamp TEXT,
                temperature REAL,
                groundtemperature REAL,
                feeltemperature REAL,
                windgusts REAL,
                windspeedBft INTEGER,
                humidity INTEGER,
                precipitation REAL,
                sunpower INTEGER,
                recorded_at TIMESTAMP,
                FOREIGN KEY (stationid) REFERENCES station_info (stationid),
                UNIQUE(stationid, timestamp)
            )
            ''')
            
            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_measurements_stationid ON station_measurements (stationid)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_measurements_timestamp ON station_measurements (timestamp)')
            
            conn.commit()
    
    def fetch_data(self) -> Optional[Dict]:
        """Fetch weather data from Buienradar API"""
        try:
            logging.info("Fetching data from Buienradar API...")
            response = requests.get(self.base_url)
            data = response.json()
            logging.info("Successfully fetched data from API")
            return data
        except requests.RequestException as e:
            logging.error(f"Error fetching data: {e}")
            return None
    
    def process_api_data(self, data: Dict) -> tuple:
        """Extract measurements and station info from API data"""
        if not data:
            return [], []
            
        stations = data.get('actual', {}).get('stationmeasurements', [])
        
        measurements = []
        station_info = []
        
        # First pass: collect all measurements
        for station in stations:
            # Station measurements
            measurement = {
                'stationid': station.get('stationid'),
                'timestamp': station.get('timestamp'),
                'temperature': round(station.get('temperature', 0), 1),
                'groundtemperature': round(station.get('groundtemperature', 0), 1),
                'feeltemperature': round(station.get('feeltemperature', 0), 1),
                'windgusts': round(station.get('windgusts', 0), 1),
                'windspeedBft': station.get('windspeedBft'),  # Integer, no rounding needed
                'humidity': station.get('humidity'),  # Integer, no rounding needed
                'precipitation': round(station.get('precipitation', 0), 1),
                'sunpower': station.get('sunpower'),  # Integer, no rounding needed
                'recorded_at': datetime.datetime.now().isoformat()
            }
            measurements.append(measurement)
            
            # Station info
            info = {
                'stationid': station.get('stationid'),
                'stationname': station.get('stationname'),
                'lat': round(station.get('lat', 0), 1),
                'lon': round(station.get('lon', 0), 1),
                'regio': station.get('regio'),
                'last_updated': datetime.datetime.now().isoformat()
            }
            station_info.append(info)
        
        # Only perform KNN imputation if we have enough data points
        if len(measurements) >= 5:  # Minimum required for KNN
            try:
                # Convert measurements to DataFrame for imputation
                df_measurements = pd.DataFrame(measurements)
                
                # Select numeric columns for imputation
                numeric_columns = [
                    'temperature', 'groundtemperature', 'feeltemperature',
                    'windgusts', 'windspeedBft', 'humidity',
                    'precipitation', 'sunpower'
                ]
                
                # Create a copy of numeric data for imputation
                numeric_data = df_measurements[numeric_columns].copy()
                
                # Initialize KNN imputer
                imputer = KNNImputer(n_neighbors=5, weights='distance') # K=5 was chosen arbitrarily, with additional data and cross-validation k should be optimised)
                
                # Perform imputation
                imputed_data = imputer.fit_transform(numeric_data)
                
                # Update the original measurements with imputed values
                for i, col in enumerate(numeric_columns):
                    if col in ['windspeedBft', 'humidity', 'sunpower']:  # Integer columns
                        df_measurements[col] = np.round(imputed_data[:, i]).astype(int)
                    else:  # Float columns
                        df_measurements[col] = np.round(imputed_data[:, i], 1)
                
                # Convert back to list of dictionaries
                measurements = df_measurements.to_dict('records')
            except Exception as e:
                logging.warning(f"KNN imputation failed: {e}. Using original measurements.")
        
        return measurements, station_info
    
    def update_database(self):
        """Fetch fresh data and update the database"""
        logging.info("Starting database update...")
        start_time = time.time()
        
        data = self.fetch_data()
        if not data:
            logging.error("Failed to fetch data. Will try again next cycle.")
            return
        
        measurements, station_info = self.process_api_data(data)
        
        if not measurements:
            logging.warning("No measurements found in API response.")
            return
            
        logging.info(f"Processing {len(measurements)} measurements and {len(station_info)} stations")
        
        with self.get_db_connection() as conn:
            cursor = conn.cursor()
            
            try:
                # Insert or update station info
                for info in station_info:
                    cursor.execute('''
                    INSERT OR REPLACE INTO station_info 
                    (stationid, stationname, lat, lon, regio, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        info['stationid'],
                        info['stationname'],
                        info['lat'],
                        info['lon'],
                        info['regio'],
                        info['last_updated']
                    ))
                
                # Insert new measurements
                inserted_count = 0
                duplicate_count = 0
                
                # First, get the latest timestamp for each station
                cursor.execute('''
                SELECT stationid, MAX(timestamp) as latest_timestamp 
                FROM station_measurements 
                GROUP BY stationid
                ''')
                latest_timestamps = {row[0]: row[1] for row in cursor.fetchall()}
                
                for measurement in measurements:
                    station_id = measurement['stationid']
                    timestamp = measurement['timestamp']
                    
                    # Check if this measurement is newer than what we have
                    if station_id in latest_timestamps and timestamp <= latest_timestamps[station_id]:
                        logging.debug(f"Skipping duplicate measurement for station {station_id} at {timestamp}")
                        duplicate_count += 1
                        continue
                    
                    try:
                        cursor.execute('''
                        INSERT INTO station_measurements 
                        (stationid, timestamp, temperature, groundtemperature, feeltemperature, 
                        windgusts, windspeedBft, humidity, precipitation, sunpower, recorded_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            measurement['stationid'],
                            measurement['timestamp'],
                            measurement['temperature'],
                            measurement['groundtemperature'],
                            measurement['feeltemperature'],
                            measurement['windgusts'],
                            measurement['windspeedBft'],
                            measurement['humidity'],
                            measurement['precipitation'],
                            measurement['sunpower'],
                            measurement['recorded_at']
                        ))
                        inserted_count += 1
                        logging.debug(f"Inserted new measurement for station {station_id} at {timestamp}")
                    except sqlite3.IntegrityError as e:
                        logging.warning(f"Integrity error for station {station_id} at {timestamp}: {e}")
                        duplicate_count += 1
                        continue
                    
                conn.commit()
                end_time = time.time()
                logging.info(f"Database update completed in {end_time - start_time:.2f} seconds")
                logging.info(f"Successfully updated database with {inserted_count} new measurements. Skipped {duplicate_count} duplicate entries.")
                
                # Log the latest timestamps for debugging
                if inserted_count == 0:
                    logging.info("No new measurements were inserted. Latest timestamps in database:")
                    for station_id, timestamp in latest_timestamps.items():
                        logging.info(f"Station {station_id}: {timestamp}")
                
            except sqlite3.Error as e:
                logging.error(f"Database error: {e}")
                conn.rollback()
    
    def get_latest_measurements(self, limit=5):
        """Get latest measurements from database"""
        with self.get_db_connection() as conn:
            query = '''
            SELECT m.*, s.stationname, s.regio 
            FROM station_measurements m
            JOIN station_info s ON m.stationid = s.stationid
            ORDER BY m.id DESC
            LIMIT ?
            '''
            df = pd.read_sql_query(query, conn, params=(limit,))
            return df
    
    def get_station_history(self, station_id, hours=24):
        """Get historical measurements for a specific station"""
        with self.get_db_connection() as conn:
            time_threshold = (datetime.datetime.now() - datetime.timedelta(hours=hours)).isoformat()
            
            query = '''
            SELECT m.*, s.stationname, s.regio 
            FROM station_measurements m
            JOIN station_info s ON m.stationid = s.stationid
            WHERE m.stationid = ? AND m.recorded_at >= ?
            ORDER BY m.recorded_at
            '''
            
            df = pd.read_sql_query(query, conn, params=(station_id, time_threshold))
            return df
    
    def get_all_stations(self):
        """Get info for all weather stations"""
        with self.get_db_connection() as conn:
            df = pd.read_sql_query("SELECT * FROM station_info", conn)
            return df
    
    def start_scheduler(self, interval_minutes=10):
        """Start scheduled updates every X minutes"""
        logging.info(f"Starting scheduler to update every {interval_minutes} minutes")
        
        # Run immediately
        logging.info("Running initial update...")
        self.update_database()
        
        # Schedule next update
        next_update = datetime.datetime.now() + datetime.timedelta(minutes=interval_minutes)
        logging.info(f"Next update scheduled for: {next_update.strftime('%H:%M:%S')}")
        
        while True:
            try:
                current_time = datetime.datetime.now()
                if current_time >= next_update:
                    logging.info("Running scheduled update...")
                    self.update_database()
                    next_update = current_time + datetime.timedelta(minutes=interval_minutes)
                    logging.info(f"Next update scheduled for: {next_update.strftime('%H:%M:%S')}")
                time.sleep(1)
            except Exception as e:
                logging.error(f"Error in scheduler loop: {e}")
                time.sleep(60)  # Wait a minute before retrying if there's an error


# usage
if __name__ == "__main__":
    try:
        print("Starting Buienradar Database Manager...")
        print("Press Ctrl+C to stop the program")
        manager = BuienradarDatabaseManager()
        manager.start_scheduler()
    except KeyboardInterrupt:
        print("\nScheduler stopped by user")
        logging.info("Scheduler stopped by user")
    except Exception as e:
        print(f"\nFatal error: {e}")
        logging.error(f"Fatal error: {e}")