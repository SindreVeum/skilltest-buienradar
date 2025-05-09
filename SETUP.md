# Setup Instructions

This document contains setup instructions for running the project.

## Prerequisites

- Python 3.10 or higher
- Git

## Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd skilltest-buienradar
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install the required packages:
```bash
pip install -r requirements.txt
```

## Required Packages

The following packages are required to run the project:
- requests>=2.31.0
- pandas>=2.0.0
- schedule>=1.2.0 
- folium>=0.13.0
- scikit-learn>=1.0.0

## Running the project

1. Start the Python backend:
   ```bash
   # Activate the virtual environment (if not already activated)
   source venv/bin/activate  # On Unix/macOS
   # or
   .\venv\Scripts\activate  # On Windows

   # Run the Python script
   python api.py
   ```
   This will start collecting weather data every 20 minutes.

2. Start the Node.js server:
   ```bash
   # Install dependencies (if not already done)
   npm install

   # Start the server
   node server.cjs
   ```
   The server will run on http://localhost:3004

3. Start the React application:
   ```bash
   # Navigate to the React app directory
   cd src

   # Install dependencies (if not already done)
   npm install

   # Start the development server
   npm start
   ```


Note: Make sure all three components (Python backend, Node.js server, and React app) are running simultaneously for the application to work properly. The Python script collects the data, the Node.js server provides the API endpoints, and the React app displays the data in the browser.