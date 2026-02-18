/**
 * OneMap API Service (Singapore Land Authority)
 * Docs: https://www.onemap.gov.sg/apidocs/
 *
 * TOKEN NOTES:
 *   - Tokens expire after ~3 days (dev) / 30 days (prod).
 *   - Renew at: https://developers.onemap.sg/ → "Get New Token"
 *   - The /search endpoint is PUBLIC — no token required.
 *   - The /revgeocodexy endpoint REQUIRES a valid token.
 *   - If the token is expired the app silently falls back to centroid lookup.
 */

const ONEMAP_TOKEN =
  import.meta.env.MODE === 'production'
    ? import.meta.env.VITE_ONEMAP_PROD_KEY
    : import.meta.env.VITE_ONEMAP_DEV_KEY

/**
 * Reverse geocode a lat/lng to get nearest address and planning area info.
 * @param {number} lat
 * @param {number} lng
 * @param {number} buffer  search radius in metres (default 100)
 */
export async function reverseGeocode(lat, lng, buffer = 100) {
  const url = `/onemap-api/api/public/revgeocode?location=${lat},${lng}&buffer=${buffer}&addressType=All&otherFeatures=N`
  const res = await fetch(url, {
    headers: { Authorization: ONEMAP_TOKEN }
  })
  if (!res.ok) throw new Error(`OneMap reverseGeocode failed: ${res.status}`)
  return res.json()
}

/**
 * Search OneMap for a place query, returns matching results.
 * This endpoint is PUBLIC — no token required.
 * @param {string} query
 */
export async function searchPlace(query) {
  const encoded = encodeURIComponent(query)
  // Note: no Authorization header — this endpoint is public
  const url = `/onemap-api/api/common/elastic/search?searchVal=${encoded}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OneMap search failed: ${res.status}`)
  const data = await res.json()
  // The API returns results even if it also returns an "error" field about missing token
  return data
}

/**
 * OneMap tile URL template for use with Leaflet.
 */
export const ONEMAP_TILE_URL =
  'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png'

export const ONEMAP_TILE_OPTIONS = {
  detectRetina: true,
  minZoom: 11,
  maxZoom: 19,
  attribution:
    '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;' +
    '<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;|&nbsp;' +
    '<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>'
}
