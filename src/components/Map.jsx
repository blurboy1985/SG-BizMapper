import React, { useEffect, useRef, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import { ONEMAP_TILE_URL, ONEMAP_TILE_OPTIONS } from '../services/onemap'
import './Map.css'

// Fix Leaflet default icon path issue with Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

const PIN_ICON = new L.Icon({
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

/** Listens for map clicks and calls onMapClick(latlng). */
function ClickHandler({ onMapClick, isLoading }) {
  useMapEvents({
    click(e) {
      if (!isLoading) onMapClick(e.latlng)
    }
  })
  return null
}

/** Flies the map to a given centre position. */
function FlyToCenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 15, { duration: 1.4 })
  }, [center, map])
  return null
}

const SG_CENTER = [1.3521, 103.8198]

export default function SGMap({ pin, onMapClick, isLoading, flyTo, planningArea }) {
  return (
    <div className="map-wrapper">
      {isLoading && (
        <div className="map-loading-overlay">
          <div className="spinner" />
          <span>Fetching demographics…</span>
        </div>
      )}

      <MapContainer
        center={SG_CENTER}
        zoom={12}
        className="leaflet-map"
        zoomControl={true}
      >
        <TileLayer url={ONEMAP_TILE_URL} {...ONEMAP_TILE_OPTIONS} />
        <ClickHandler onMapClick={onMapClick} isLoading={isLoading} />
        {flyTo && <FlyToCenter center={flyTo} />}

        {pin && (
          <Marker position={pin} icon={PIN_ICON}>
            <Popup>
              <div className="popup-content">
                <strong>📍 {planningArea || 'Selected Location'}</strong>
                <br />
                <small>
                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                </small>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="map-legend">
        <span>🗺️ OneMap © SLA</span>
      </div>
    </div>
  )
}
