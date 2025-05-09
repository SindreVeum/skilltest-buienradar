# Solution Documentation

This document explains my approach and implementation for the Weather Analysis skill test. 
Not sure how much information I was supposed to put here (given that there is a discussion later) so put down as much as i could in the remaining time

While doing the final check there appeared to be an issue with the Buienradar API toward the end: it should update three times per hour, but the latest entry at https://data.buienradar.nl/2.0/feed/json was from 12:40, despite checking at 14:00. I initially thought this was because of an error in my own code and tried several backend fixes. 

Update: At 14:05 the api updated and everything seemed to function again :)

## Thoughts and Justifications

I have done the backend in python (as this is what I am most familiar with and allowed me to copy code from existing projects to save time). More infomration on backend implementation can be found in the "Data Implementation" section. 

For the remaining part of the test I chose to go for a React Application. I thought this might be a cool approach to try out and also as its something I have less experience with. More information on this part can be found in the "React Application" section. This does, however, mean that running everything is not as simple as running a single python script. 

How to setup and run everything can be found in the `SETUP.md`file.

**Alternative Methods**

For the visualisation part multiple alternatives could also be used:
- Tableau/PowerBI: This project could actually have been fully done only using one of these tools, but didnt think this would really showcase my coding skills
- ipynb/py: The visualisation could have more easily been done using python (atleast easier for me) but again, thought it would be cool to see if I would be able to set up an actual application



#### NOTE on AI:
The backend (api.py and server.cjs) was created mostly using snippets from earlier projects. However, wanting to be transparent, the React app was created with the help of Cursor as my experience with front-end development is somewhat limited, and I wanted to see how far i could get within the limited timeframe. This mostly involved using it to set up the initial wbesite which i then configured to match what i envisioned.


## Project Structure

```
skilltest-buienradar/
├── src/                   # React application source code
│   ├── components/        # Reusable React components
│   ├── App.jsx           # Main application component
│   ├── DetailedView.jsx  # Detailed station view
│   └── App.css           # Main styles
├── api.py                # Backend API and data processing
├── bonus.ipynb          # Additional data analysis
└── requirements.txt     # Project dependencies
```

## Backend Implementation (Question 1, 2) (`api.py`)

### Database Structure
- **station_info table**: Stores information about weather stations
- **station_measurements table**: Stores weather measurements

### Key Features
**Automated Data Collection (Question 9A)**
- Fetches data from Buienradar API every 20 minutes
- For simplicity the code functions such that the script must be running to continously update the data. A more robust approach would be to run the script on a server, however the local approach was chosen for simplicity and time (did try to up a free Oracle server, but took a little to long with the free plan. Kept running into memory problems)
- If we are only interrested in one day we could also add a script to delete records older than 24 hours to ensure we dont store uneccecary data

**Data Quality and Imputation**
- Implemented K-Nearest Neighbors (KNN) imputation for missing numeric values (I have my Machine Learning Exam in 4 days so had to add some ML methods here)
- Due to the low amount of data and time restraint I did not put much time into tuning the KNN model, hence the imputed values may not be the best approximations

## React Application

**Overview Page (`App.jsx`)**
The main dashboard provides a view of weather data across all stations (Questions 5, 6, 7, 8, 9B):

**Detailed View (`DetailedView.jsx`)**
Provides in-depth analysis for individual weather stations (Question 9B Furthering):



