# SG BizMapper

**Location-Based Demographic Tool for SMEs in Singapore**

SG BizMapper is a web-based visualization tool designed to help small and medium enterprises (SMEs) in Singapore make data-driven decisions. By providing easy access to localized demographic data, businesses can better understand their target audience and optimize their location strategies.

## Features

- **Interactive Map:** Powered by Leaflet and OneMap Singapore, allowing users to explore Singapore's geography.
- **Location Search:** Search for specific addresses, landmarks, or planning areas to get instant insights.
- **Reverse Geocoding:** Click anywhere on the map to automatically identify the corresponding planning area.
- **Demographic Insights:** Visualizes key population statistics using interactive charts, including:
  - Total Population
  - Age Distribution
  - Economic Status
  - Type of Dwelling
- **Intelligent Fallback:** Seamlessly switches to local centroid-based lookups if the OneMap API is unavailable or returns no results.

## Tech Stack

- **Frontend:** React (v18), Vite
- **Mapping:** [Leaflet](https://leafletjs.com/), [React Leaflet](https://react-leaflet.js.org/)
- **Data Visualization:** [Recharts](https://recharts.org/)
- **API Services:**
  - [OneMap Singapore API](https://www.onemap.gov.sg/apidocs/) (Geocoding & Search)
  - [SingStat](https://www.singstat.gov.sg/) (Demographic Data)

## Getting Started

### Prerequisites

You will need a [OneMap API Token](https://developers.onemap.sg/) for full reverse geocoding functionality.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/blurboy1985/SG-BizMapper.git
   cd SG-BizMapper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your OneMap keys:
   ```env
   VITE_ONEMAP_DEV_KEY=your_onemap_dev_token_here
   VITE_ONEMAP_PROD_KEY=your_onemap_prod_token_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Project Structure

- `src/App.jsx`: Main application logic and state management.
- `src/components/Map.jsx`: Interactive map component using Leaflet.
- `src/components/Dashboard.jsx`: Data visualization dashboard.
- `src/services/onemap.js`: Integration with OneMap API.
- `src/services/singstat.js`: Demographic data processing and planning area resolution.

## Data Sources

- Demographic data is sourced from SingStat (Singapore Department of Statistics).
- Map tiles and geocoding services are provided by OneMap Singapore.

## License

MIT
