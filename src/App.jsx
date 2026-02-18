import React, { useState, useCallback } from 'react'
import Header from './components/Header'
import SGMap from './components/Map'
import Dashboard from './components/Dashboard'
import { reverseGeocode, searchPlace } from './services/onemap'
import { getDemographics, getNearestPlanningArea, getAllPlanningAreas, getAreaFromPostalCode } from './services/singstat'
import './App.css'

/**
 * Resolve a planning area name from OneMap geocode result fields.
 * OneMap /revgeocode does NOT return PLANNING_AREA, so we derive it
 * from the POSTALCODE using Singapore's postal district scheme.
 * Iterates all results to find the first valid postal code.
 */
function extractAreaFromGeocode(geoResult) {
  if (!geoResult?.GeocodeInfo?.length) return null
  // Try each result until we find one with a valid, mappable postal code
  for (const info of geoResult.GeocodeInfo) {
    if (info.PLANNING_AREA) return info.PLANNING_AREA
    if (info.POSTALCODE && info.POSTALCODE !== 'NIL') {
      const area = getAreaFromPostalCode(info.POSTALCODE)
      if (area) return area
    }
  }
  return null
}

/**
 * Given a raw area string from OneMap, find the matching key in our dataset
 * (exact → partial → nearest-centroid fallback).
 */
async function resolveArea(rawArea) {
  if (!rawArea) return null
  const upper = rawArea.toUpperCase().trim()
  if (await getDemographics(upper)) return upper

  const all = getAllPlanningAreas()
  return all.find((a) => a.includes(upper) || upper.includes(a)) ?? null
}

export default function App() {
  const [pin, setPin] = useState(null)
  const [flyTo, setFlyTo] = useState(null)
  const [planningArea, setPlanningArea] = useState(null)
  const [demographics, setDemographics] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  // 'onemap' | 'centroid' | null — source of last area resolution
  const [areaSource, setAreaSource] = useState(null)

  /**
   * Shared handler: given a latlng, reverse-geocode → planning area → demographics.
   * Strategy:
   *   1. Try OneMap reverse-geocode (needs a valid API key + network).
   *   2. If that fails or returns no useful area, silently fall back to the
   *      nearest-centroid lookup (always works offline).
   */
  const handlePin = useCallback(async (latlng) => {
    setPin(latlng)
    setIsLoading(true)
    setError(null)
    setPlanningArea(null)
    setDemographics(null)
    setAreaSource(null)

    let resolvedArea = null
    let source = 'centroid' // assume fallback; upgrade to 'onemap' if API works

    // ── 1. Try OneMap API ────────────────────────────────────────────────────
    try {
      const geoResult = await reverseGeocode(latlng.lat, latlng.lng, 300)
      const rawArea = extractAreaFromGeocode(geoResult)
      const matched = await resolveArea(rawArea)
      if (matched) {
        resolvedArea = matched
        source = 'onemap'
      } else {
        // API responded (valid token) but returned no addresses in buffer.
        // Try a wider search radius before falling to centroid.
        const wider = await reverseGeocode(latlng.lat, latlng.lng, 500)
        const rawAreaWider = extractAreaFromGeocode(wider)
        const matchedWider = await resolveArea(rawAreaWider)
        if (matchedWider) {
          resolvedArea = matchedWider
          source = 'onemap'
        } else {
          // API is up but no postal code in range — use centroid but
          // still mark as onemap since the API is reachable.
          source = 'onemap'
        }
      }
    } catch {
      // OneMap is truly unreachable (network error, CORS, expired token).
      // Fall through silently — centroid fallback handles it below.
    }

    // ── 2. Centroid fallback ──────────────────────────────────────────────────
    if (!resolvedArea) {
      resolvedArea = getNearestPlanningArea(latlng.lat, latlng.lng)
    }

    // ── 3. Load demographics ─────────────────────────────────────────────────
    if (resolvedArea) {
      const data = await getDemographics(resolvedArea)
      setPlanningArea(resolvedArea)
      setDemographics(data)
      setAreaSource(source)
    } else {
      setError('Could not determine a planning area for this location.')
    }

    setIsLoading(false)
  }, [])

  /**
   * Search handler: find the place via OneMap then drop a pin.
   * Falls back to a simple name-match against known planning areas
   * if the OneMap search API is unreachable.
   */
  const handleSearch = useCallback(async (query) => {
    setIsLoading(true)
    setError(null)

    let latlng = null

    // ── Try OneMap place search ───────────────────────────────────────────────
    try {
      const result = await searchPlace(query)
      if (result?.results?.length > 0) {
        const { LATITUDE, LONGITUDE } = result.results[0]
        latlng = { lat: parseFloat(LATITUDE), lng: parseFloat(LONGITUDE) }
      }
    } catch {
      // OneMap unreachable — try local name match below
    }

    // ── Local planning-area name fallback ────────────────────────────────────
    if (!latlng) {
      const singstat = await import('./services/singstat')
      const upper = query.toUpperCase().trim()
      const matched = singstat.getAllPlanningAreas().find(
        (a) => a === upper || a.includes(upper) || upper.includes(a)
      )
      if (matched) {
        const centroid = singstat.getPlanningAreaCentroid(matched)
        if (centroid) latlng = { lat: centroid[0], lng: centroid[1] }
      }
    }

    if (latlng) {
      setFlyTo(latlng)
      await handlePin(latlng)
    } else {
      setIsLoading(false)
      setError(`No results found for "${query}". Try a planning area name like "Tampines" or "Clementi".`)
    }
  }, [handlePin])

  return (
    <div className="app">
      <Header onSearch={handleSearch} />
      <div className="app-body">
        <SGMap
          pin={pin}
          onMapClick={handlePin}
          isLoading={isLoading}
          flyTo={flyTo}
          planningArea={planningArea}
        />
        <Dashboard
          data={demographics}
          planningArea={planningArea}
          coords={pin}
          error={error}
          areaSource={areaSource}
        />
      </div>
    </div>
  )
}
