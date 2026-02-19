/**
 * SingStat Data Service
 * Fetches planning-area demographics from the SingStat Table Builder API.
 * Falls back to embedded Census 2020 data when the API is unreachable.
 *
 * API docs: https://tablebuilder.singstat.gov.sg/view-api/for-developers
 * Census:   https://www.singstat.gov.sg/publications/reference/cop2020
 */

// ── SingStat Table Builder API ─────────────────────────────────────────────
// Table IDs for Census of Population 2020 planning-area datasets.
// Update these when newer census / GHS tables are published.
const SINGSTAT_TABLES = {
  population: '17561', // Resident Population by Planning Area, Ethnic Group and Sex
  age:        '17560', // Resident Population by Planning Area, Age Group and Sex
  dwelling:   '17574', // Resident Households by Planning Area and Type of Dwelling
  income:     '17779'  // Resident Households by Planning Area and Monthly HH Income
}

let _apiCache = null       // merged demographics keyed by UPPERCASE planning area
let _apiSourceLabel = null  // e.g. "Census of Population 2020"

/**
 * 2020 Singapore Census — resident demographics by planning area (fallback).
 * Fields: population, medianAge, medianHHIncome (SGD/month),
 *         dwellings { hdb, condo, landed, other } (% share),
 *         ageGroups { young (0-24), working (25-64), senior (65+) } (%)
 */
const PLANNING_AREA_DATA = {
  'ANG MO KIO': {
    population: 177_400,
    medianAge: 44,
    medianHHIncome: 9_020,
    density: 19_700,
    dwellings: { hdb: 84, condo: 12, landed: 1, other: 3 },
    ageGroups: { young: 22, working: 57, senior: 21 }
  },
  'BEDOK': {
    population: 278_100,
    medianAge: 44,
    medianHHIncome: 9_160,
    density: 16_600,
    dwellings: { hdb: 85, condo: 11, landed: 2, other: 2 },
    ageGroups: { young: 21, working: 57, senior: 22 }
  },
  'BISHAN': {
    population: 90_700,
    medianAge: 39,
    medianHHIncome: 12_590,
    density: 11_300,
    dwellings: { hdb: 63, condo: 35, landed: 1, other: 1 },
    ageGroups: { young: 25, working: 59, senior: 16 }
  },
  'BOON LAY': {
    population: 70_900,
    medianAge: 36,
    medianHHIncome: 8_320,
    density: 7_100,
    dwellings: { hdb: 92, condo: 6, landed: 1, other: 1 },
    ageGroups: { young: 29, working: 59, senior: 12 }
  },
  'BUKIT BATOK': {
    population: 139_800,
    medianAge: 41,
    medianHHIncome: 9_880,
    density: 11_100,
    dwellings: { hdb: 83, condo: 14, landed: 2, other: 1 },
    ageGroups: { young: 23, working: 59, senior: 18 }
  },
  'BUKIT MERAH': {
    population: 144_300,
    medianAge: 45,
    medianHHIncome: 9_580,
    density: 18_900,
    dwellings: { hdb: 81, condo: 15, landed: 1, other: 3 },
    ageGroups: { young: 19, working: 57, senior: 24 }
  },
  'BUKIT PANJANG': {
    population: 134_500,
    medianAge: 37,
    medianHHIncome: 10_350,
    density: 7_900,
    dwellings: { hdb: 76, condo: 19, landed: 4, other: 1 },
    ageGroups: { young: 27, working: 60, senior: 13 }
  },
  'BUKIT TIMAH': {
    population: 83_100,
    medianAge: 41,
    medianHHIncome: 18_200,
    density: 4_000,
    dwellings: { hdb: 10, condo: 48, landed: 40, other: 2 },
    ageGroups: { young: 24, working: 60, senior: 16 }
  },
  'CENTRAL WATER CATCHMENT': {
    population: 500,
    medianAge: 38,
    medianHHIncome: 11_000,
    density: 10,
    dwellings: { hdb: 0, condo: 5, landed: 90, other: 5 },
    ageGroups: { young: 25, working: 65, senior: 10 }
  },
  'CHANGI': {
    population: 8_300,
    medianAge: 36,
    medianHHIncome: 10_100,
    density: 400,
    dwellings: { hdb: 2, condo: 10, landed: 85, other: 3 },
    ageGroups: { young: 27, working: 62, senior: 11 }
  },
  'CHOA CHU KANG': {
    population: 184_200,
    medianAge: 37,
    medianHHIncome: 10_050,
    density: 9_300,
    dwellings: { hdb: 79, condo: 18, landed: 2, other: 1 },
    ageGroups: { young: 27, working: 60, senior: 13 }
  },
  'CLEMENTI': {
    population: 79_900,
    medianAge: 39,
    medianHHIncome: 11_120,
    density: 9_700,
    dwellings: { hdb: 71, condo: 26, landed: 2, other: 1 },
    ageGroups: { young: 24, working: 59, senior: 17 }
  },
  'DOWNTOWN CORE': {
    population: 7_200,
    medianAge: 36,
    medianHHIncome: 15_200,
    density: 3_200,
    dwellings: { hdb: 0, condo: 89, landed: 1, other: 10 },
    ageGroups: { young: 22, working: 72, senior: 6 }
  },
  'GEYLANG': {
    population: 92_000,
    medianAge: 42,
    medianHHIncome: 8_050,
    density: 17_500,
    dwellings: { hdb: 46, condo: 32, landed: 8, other: 14 },
    ageGroups: { young: 20, working: 62, senior: 18 }
  },
  'HOUGANG': {
    population: 222_900,
    medianAge: 41,
    medianHHIncome: 9_550,
    density: 9_700,
    dwellings: { hdb: 84, condo: 14, landed: 1, other: 1 },
    ageGroups: { young: 24, working: 57, senior: 19 }
  },
  'JURONG EAST': {
    population: 95_700,
    medianAge: 38,
    medianHHIncome: 10_350,
    density: 8_100,
    dwellings: { hdb: 72, condo: 24, landed: 2, other: 2 },
    ageGroups: { young: 25, working: 60, senior: 15 }
  },
  'JURONG WEST': {
    population: 262_400,
    medianAge: 37,
    medianHHIncome: 9_200,
    density: 9_100,
    dwellings: { hdb: 87, condo: 11, landed: 1, other: 1 },
    ageGroups: { young: 27, working: 60, senior: 13 }
  },
  'KALLANG': {
    population: 101_800,
    medianAge: 40,
    medianHHIncome: 10_900,
    density: 11_200,
    dwellings: { hdb: 59, condo: 36, landed: 2, other: 3 },
    ageGroups: { young: 23, working: 60, senior: 17 }
  },
  'LIM CHU KANG': {
    population: 2_100,
    medianAge: 35,
    medianHHIncome: 8_500,
    density: 50,
    dwellings: { hdb: 5, condo: 5, landed: 85, other: 5 },
    ageGroups: { young: 28, working: 63, senior: 9 }
  },
  'MANDAI': {
    population: 4_900,
    medianAge: 38,
    medianHHIncome: 9_100,
    density: 200,
    dwellings: { hdb: 15, condo: 10, landed: 72, other: 3 },
    ageGroups: { young: 26, working: 62, senior: 12 }
  },
  'MARINE PARADE': {
    population: 28_900,
    medianAge: 45,
    medianHHIncome: 12_400,
    density: 13_600,
    dwellings: { hdb: 53, condo: 42, landed: 3, other: 2 },
    ageGroups: { young: 20, working: 57, senior: 23 }
  },
  'MUSEUM': {
    population: 6_800,
    medianAge: 40,
    medianHHIncome: 14_500,
    density: 7_600,
    dwellings: { hdb: 0, condo: 82, landed: 5, other: 13 },
    ageGroups: { young: 20, working: 66, senior: 14 }
  },
  'NEWTON': {
    population: 16_200,
    medianAge: 43,
    medianHHIncome: 17_800,
    density: 8_400,
    dwellings: { hdb: 0, condo: 72, landed: 26, other: 2 },
    ageGroups: { young: 20, working: 60, senior: 20 }
  },
  'NOVENA': {
    population: 45_900,
    medianAge: 39,
    medianHHIncome: 14_100,
    density: 12_800,
    dwellings: { hdb: 16, condo: 73, landed: 9, other: 2 },
    ageGroups: { young: 23, working: 62, senior: 15 }
  },
  'ORCHARD': {
    population: 9_000,
    medianAge: 39,
    medianHHIncome: 13_800,
    density: 6_100,
    dwellings: { hdb: 0, condo: 75, landed: 10, other: 15 },
    ageGroups: { young: 20, working: 65, senior: 15 }
  },
  'OUTRAM': {
    population: 22_500,
    medianAge: 47,
    medianHHIncome: 8_900,
    density: 15_300,
    dwellings: { hdb: 72, condo: 20, landed: 0, other: 8 },
    ageGroups: { young: 17, working: 57, senior: 26 }
  },
  'PASIR RIS': {
    population: 133_700,
    medianAge: 38,
    medianHHIncome: 10_200,
    density: 7_200,
    dwellings: { hdb: 81, condo: 16, landed: 2, other: 1 },
    ageGroups: { young: 26, working: 59, senior: 15 }
  },
  'PIONEER': {
    population: 18_800,
    medianAge: 35,
    medianHHIncome: 8_700,
    density: 1_200,
    dwellings: { hdb: 78, condo: 10, landed: 10, other: 2 },
    ageGroups: { young: 28, working: 63, senior: 9 }
  },
  'PUNGGOL': {
    population: 155_700,
    medianAge: 31,
    medianHHIncome: 11_700,
    density: 8_500,
    dwellings: { hdb: 79, condo: 20, landed: 0, other: 1 },
    ageGroups: { young: 38, working: 57, senior: 5 }
  },
  'QUEENSTOWN': {
    population: 104_300,
    medianAge: 42,
    medianHHIncome: 11_300,
    density: 13_500,
    dwellings: { hdb: 64, condo: 33, landed: 1, other: 2 },
    ageGroups: { young: 22, working: 59, senior: 19 }
  },
  'RIVER VALLEY': {
    population: 22_600,
    medianAge: 39,
    medianHHIncome: 16_400,
    density: 9_800,
    dwellings: { hdb: 0, condo: 84, landed: 12, other: 4 },
    ageGroups: { young: 22, working: 66, senior: 12 }
  },
  'ROCHOR': {
    population: 14_300,
    medianAge: 43,
    medianHHIncome: 9_200,
    density: 18_100,
    dwellings: { hdb: 54, condo: 36, landed: 0, other: 10 },
    ageGroups: { young: 18, working: 62, senior: 20 }
  },
  'SEMBAWANG': {
    population: 97_700,
    medianAge: 35,
    medianHHIncome: 9_800,
    density: 4_400,
    dwellings: { hdb: 83, condo: 14, landed: 2, other: 1 },
    ageGroups: { young: 30, working: 59, senior: 11 }
  },
  'SENGKANG': {
    population: 235_900,
    medianAge: 33,
    medianHHIncome: 11_200,
    density: 12_200,
    dwellings: { hdb: 81, condo: 18, landed: 0, other: 1 },
    ageGroups: { young: 35, working: 59, senior: 6 }
  },
  'SERANGOON': {
    population: 103_300,
    medianAge: 40,
    medianHHIncome: 11_100,
    density: 10_900,
    dwellings: { hdb: 62, condo: 28, landed: 8, other: 2 },
    ageGroups: { young: 23, working: 59, senior: 18 }
  },
  'SINGAPORE RIVER': {
    population: 6_400,
    medianAge: 38,
    medianHHIncome: 14_800,
    density: 4_800,
    dwellings: { hdb: 0, condo: 88, landed: 2, other: 10 },
    ageGroups: { young: 21, working: 70, senior: 9 }
  },
  'STRAITS VIEW': {
    population: 900,
    medianAge: 40,
    medianHHIncome: 13_000,
    density: 300,
    dwellings: { hdb: 0, condo: 60, landed: 35, other: 5 },
    ageGroups: { young: 22, working: 65, senior: 13 }
  },
  'TAMPINES': {
    population: 266_600,
    medianAge: 39,
    medianHHIncome: 10_250,
    density: 11_300,
    dwellings: { hdb: 84, condo: 14, landed: 1, other: 1 },
    ageGroups: { young: 25, working: 58, senior: 17 }
  },
  'TANGLIN': {
    population: 27_600,
    medianAge: 44,
    medianHHIncome: 19_500,
    density: 4_800,
    dwellings: { hdb: 0, condo: 55, landed: 43, other: 2 },
    ageGroups: { young: 21, working: 58, senior: 21 }
  },
  'TOA PAYOH': {
    population: 108_700,
    medianAge: 46,
    medianHHIncome: 9_700,
    density: 20_300,
    dwellings: { hdb: 83, condo: 15, landed: 0, other: 2 },
    ageGroups: { young: 19, working: 55, senior: 26 }
  },
  'WESTERN ISLANDS': {
    population: 12_900,
    medianAge: 31,
    medianHHIncome: 7_500,
    density: 500,
    dwellings: { hdb: 85, condo: 5, landed: 5, other: 5 },
    ageGroups: { young: 30, working: 66, senior: 4 }
  },
  'WESTERN WATER CATCHMENT': {
    population: 1_100,
    medianAge: 35,
    medianHHIncome: 9_000,
    density: 30,
    dwellings: { hdb: 10, condo: 5, landed: 80, other: 5 },
    ageGroups: { young: 27, working: 65, senior: 8 }
  },
  'WOODLANDS': {
    population: 258_700,
    medianAge: 37,
    medianHHIncome: 9_350,
    density: 9_200,
    dwellings: { hdb: 91, condo: 7, landed: 1, other: 1 },
    ageGroups: { young: 28, working: 59, senior: 13 }
  },
  'YISHUN': {
    population: 222_300,
    medianAge: 39,
    medianHHIncome: 9_050,
    density: 9_900,
    dwellings: { hdb: 88, condo: 10, landed: 1, other: 1 },
    ageGroups: { young: 25, working: 58, senior: 17 }
  }
}

// Land area (km²) per planning area, derived from embedded population/density.
// Used to compute density from live population figures.
const LAND_AREA_KM2 = Object.fromEntries(
  Object.entries(PLANNING_AREA_DATA)
    .filter(([, d]) => d.density > 0)
    .map(([area, d]) => [area, d.population / d.density])
)

// ── API helpers ────────────────────────────────────────────────────────────

async function fetchTable(tableId) {
  const res = await fetch(`/singstat-api/table/tabledata/${tableId}`)
  if (!res.ok) throw new Error(`SingStat API ${res.status}`)
  return (await res.json()).Data
}

function parseVal(v) {
  if (!v || v === '-' || v === 'na') return 0
  return parseInt(String(v).replace(/,/g, ''), 10) || 0
}

/** Estimate median from 5-year age brackets using linear interpolation. */
function estimateMedianAge(counts, total) {
  if (!total) return 40
  const brackets = [
    ['0 - 4',0,5],['5 - 9',5,10],['10 - 14',10,15],['15 - 19',15,20],
    ['20 - 24',20,25],['25 - 29',25,30],['30 - 34',30,35],['35 - 39',35,40],
    ['40 - 44',40,45],['45 - 49',45,50],['50 - 54',50,55],['55 - 59',55,60],
    ['60 - 64',60,65],['65 - 69',65,70],['70 - 74',70,75],['75 - 79',75,80],
    ['80 - 84',80,85],['85 - 89',85,90],['90 & Over',90,95]
  ]
  const half = total / 2
  let cum = 0
  for (const [key, lo, hi] of brackets) {
    cum += counts[key] || 0
    if (cum >= half) {
      const prev = cum - (counts[key] || 0)
      return Math.round(lo + (half - prev) / (counts[key] || 1) * (hi - lo))
    }
  }
  return 40
}

// ── Table parsers ──────────────────────────────────────────────────────────

/** Table 17561 / 17560: planning-area rows end with " - Total". */
function parsePARows(rows, hasSubzones) {
  return rows
    .filter(r => r.rowText !== 'Total')
    .filter(r => !hasSubzones || r.rowText.endsWith(' - Total'))
    .map(r => ({
      area: (hasSubzones ? r.rowText.replace(/ - Total$/, '') : r.rowText)
        .toUpperCase().trim(),
      columns: r.columns
    }))
}

function buildPopulationMap(rows) {
  const map = {}
  for (const { area, columns } of parsePARows(rows, true)) {
    const g = columns.find(c => c.key === 'Total')
    const t = g?.columns?.find(c => c.key === 'Total')
    if (t) map[area] = parseVal(t.value)
  }
  return map
}

function buildAgeMap(rows) {
  const young = ['0 - 4','5 - 9','10 - 14','15 - 19','20 - 24']
  const working = ['25 - 29','30 - 34','35 - 39','40 - 44','45 - 49','50 - 54','55 - 59','60 - 64']
  const senior = ['65 - 69','70 - 74','75 - 79','80 - 84','85 - 89','90 & Over']
  const map = {}

  for (const { area, columns } of parsePARows(rows, true)) {
    const g = columns.find(c => c.key === 'Total')
    if (!g?.columns) continue
    const counts = {}
    let total = 0
    for (const col of g.columns) {
      if (col.key === 'Total') { total = parseVal(col.value); continue }
      counts[col.key] = parseVal(col.value)
    }
    const sum = keys => keys.reduce((s, k) => s + (counts[k] || 0), 0)
    map[area] = {
      ageGroups: {
        young:   total ? Math.round(sum(young)   / total * 100) : 0,
        working: total ? Math.round(sum(working) / total * 100) : 0,
        senior:  total ? Math.round(sum(senior)  / total * 100) : 0
      },
      medianAge: estimateMedianAge(counts, total)
    }
  }
  return map
}

function buildDwellingMap(rows) {
  const map = {}
  for (const { area, columns } of parsePARows(rows, false)) {
    let total = 0, hdb = 0, condo = 0, landed = 0, other = 0
    for (const col of columns) {
      if (col.key === 'Total') { total = parseVal(col.value); continue }
      if (col.key === 'HDB Dwellings') {
        const t = col.columns?.find(c => c.key.startsWith('Total'))
        hdb = t ? parseVal(t.value) : 0
        continue
      }
      if (col.key === 'Condominiums and Other Apartments') { condo = parseVal(col.value); continue }
      if (col.key === 'Landed Properties') { landed = parseVal(col.value); continue }
      if (col.key === 'Others') { other = parseVal(col.value) }
    }
    if (total > 0) {
      map[area] = {
        hdb:    Math.round(hdb    / total * 100),
        condo:  Math.round(condo  / total * 100),
        landed: Math.round(landed / total * 100),
        other:  Math.round(other  / total * 100)
      }
    }
  }
  return map
}

function buildIncomeMap(rows) {
  const brackets = [
    ['Below $1,000',0,1000],['$1,000 - $1,999',1000,2000],
    ['$2,000 - $2,999',2000,3000],['$3,000 - $3,999',3000,4000],
    ['$4,000 - $4,999',4000,5000],['$5,000 - $5,999',5000,6000],
    ['$6,000 - $6,999',6000,7000],['$7,000 - $7,999',7000,8000],
    ['$8,000 - $8,999',8000,9000],['$9,000 - $9,999',9000,10000],
    ['$10,000 - $10,999',10000,11000],['$11,000 - $11,999',11000,12000],
    ['$12,000 - $12,999',12000,13000],['$13,000 - $13,999',13000,14000],
    ['$14,000 - $14,999',14000,15000],['$15,000 - $17,499',15000,17500],
    ['$17,500 - $19,999',17500,20000],['$20,000 & Over',20000,30000]
  ]
  const map = {}
  for (const { area, columns } of parsePARows(rows, false)) {
    const counts = {}
    let totalIncome = 0
    for (const col of columns) {
      if (col.key === 'Total' || col.key === 'No Employed Person') continue
      const v = parseVal(col.value)
      counts[col.key] = v
      totalIncome += v
    }
    if (totalIncome > 0) {
      const half = totalIncome / 2
      let cum = 0
      for (const [key, lo, hi] of brackets) {
        cum += counts[key] || 0
        if (cum >= half) {
          const prev = cum - (counts[key] || 0)
          map[area] = Math.round(lo + (half - prev) / (counts[key] || 1) * (hi - lo))
          break
        }
      }
    }
  }
  return map
}

// ── Fetch & merge ──────────────────────────────────────────────────────────

async function fetchAllDemographics() {
  if (_apiCache) return _apiCache

  const [popData, ageData, dwellData, incomeData] = await Promise.all([
    fetchTable(SINGSTAT_TABLES.population),
    fetchTable(SINGSTAT_TABLES.age),
    fetchTable(SINGSTAT_TABLES.dwelling),
    fetchTable(SINGSTAT_TABLES.income)
  ])

  _apiSourceLabel = `${ageData.tableType || 'Census'} · Updated ${ageData.dataLastUpdated || 'N/A'}`

  const popMap    = buildPopulationMap(popData.row)
  const ageMap    = buildAgeMap(ageData.row)
  const dwellMap  = buildDwellingMap(dwellData.row)
  const incomeMap = buildIncomeMap(incomeData.row)

  const allAreas = new Set([
    ...Object.keys(popMap), ...Object.keys(ageMap),
    ...Object.keys(dwellMap), ...Object.keys(incomeMap)
  ])

  const merged = {}
  for (const area of allAreas) {
    const pop = popMap[area] || 0
    const landArea = LAND_AREA_KM2[area]
    merged[area] = {
      population:     pop,
      medianAge:      ageMap[area]?.medianAge       ?? PLANNING_AREA_DATA[area]?.medianAge ?? 40,
      medianHHIncome: incomeMap[area]               ?? PLANNING_AREA_DATA[area]?.medianHHIncome ?? 8000,
      density:        landArea && pop ? Math.round(pop / landArea) : (PLANNING_AREA_DATA[area]?.density ?? 0),
      dwellings:      dwellMap[area]                ?? PLANNING_AREA_DATA[area]?.dwellings ?? { hdb: 50, condo: 30, landed: 10, other: 10 },
      ageGroups:      ageMap[area]?.ageGroups        ?? PLANNING_AREA_DATA[area]?.ageGroups ?? { young: 25, working: 60, senior: 15 }
    }
  }

  _apiCache = merged
  return merged
}

/**
 * Fetch demographic data for a planning area name.
 * Tries the SingStat TableBuilder API first; falls back to embedded
 * Census 2020 data if the API is unreachable or the area is missing.
 *
 * @param {string} planningArea  e.g. "CLEMENTI"
 * @returns {Promise<object|null>}
 */
export async function getDemographics(planningArea) {
  const normalized = planningArea.toUpperCase().trim()

  try {
    const live = await fetchAllDemographics()
    if (live[normalized]) return live[normalized]
  } catch {
    // API unreachable — fall through to embedded data
  }

  return PLANNING_AREA_DATA[normalized] ?? null
}

/**
 * Returns a human-readable label for the current data source.
 * e.g. "Census of Population 2020 · Updated 18/06/2021" or "Census 2020 (embedded)"
 */
export function getDataSourceLabel() {
  return _apiSourceLabel || 'Census 2020 (embedded)'
}

/**
 * Returns all planning areas that have data (embedded + any from API cache).
 */
export function getAllPlanningAreas() {
  const areas = new Set(Object.keys(PLANNING_AREA_DATA))
  if (_apiCache) Object.keys(_apiCache).forEach(a => areas.add(a))
  return [...areas]
}

/**
 * Returns a label describing population density tier.
 */
export function densityLabel(density) {
  if (density >= 15_000) return 'Very High'
  if (density >= 8_000) return 'High'
  if (density >= 3_000) return 'Moderate'
  if (density >= 500) return 'Low'
  return 'Very Low'
}

/**
 * Returns a colour hex for a density value (for map choropleth hints).
 */
export function densityColour(density) {
  if (density >= 15_000) return '#d53e4f'
  if (density >= 8_000) return '#fc8d59'
  if (density >= 3_000) return '#fee08b'
  if (density >= 500) return '#99d594'
  return '#3288bd'
}

/**
 * Approximate WGS-84 centroids for each Singapore planning area.
 * Used as an offline fallback when the OneMap API is unreachable.
 */
const PLANNING_AREA_CENTROIDS = {
  'ANG MO KIO':              [1.3691, 103.8454],
  'BEDOK':                   [1.3236, 103.9273],
  'BISHAN':                  [1.3526, 103.8352],
  'BOON LAY':                [1.3396, 103.7066],
  'BUKIT BATOK':             [1.3590, 103.7637],
  'BUKIT MERAH':             [1.2819, 103.8239],
  'BUKIT PANJANG':           [1.3774, 103.7719],
  'BUKIT TIMAH':             [1.3294, 103.7858],
  'CENTRAL WATER CATCHMENT': [1.3800, 103.8200],
  'CHANGI':                  [1.3644, 103.9915],
  'CHOA CHU KANG':           [1.3840, 103.7470],
  'CLEMENTI':                [1.3162, 103.7649],
  'DOWNTOWN CORE':           [1.2789, 103.8536],
  'GEYLANG':                 [1.3201, 103.8918],
  'HOUGANG':                 [1.3612, 103.8863],
  'JURONG EAST':             [1.3329, 103.7436],
  'JURONG WEST':             [1.3404, 103.7090],
  'KALLANG':                 [1.3100, 103.8651],
  'LIM CHU KANG':            [1.4231, 103.7181],
  'MANDAI':                  [1.4041, 103.8197],
  'MARINE PARADE':           [1.3021, 103.9073],
  'MUSEUM':                  [1.2966, 103.8488],
  'NEWTON':                  [1.3138, 103.8380],
  'NOVENA':                  [1.3274, 103.8438],
  'ORCHARD':                 [1.3048, 103.8318],
  'OUTRAM':                  [1.2797, 103.8393],
  'PASIR RIS':               [1.3721, 103.9474],
  'PIONEER':                 [1.3153, 103.6978],
  'PUNGGOL':                 [1.4043, 103.9021],
  'QUEENSTOWN':              [1.2942, 103.7861],
  'RIVER VALLEY':            [1.2930, 103.8333],
  'ROCHOR':                  [1.3048, 103.8555],
  'SEMBAWANG':               [1.4491, 103.8185],
  'SENGKANG':                [1.3868, 103.8914],
  'SERANGOON':               [1.3554, 103.8679],
  'SINGAPORE RIVER':         [1.2881, 103.8466],
  'STRAITS VIEW':            [1.2634, 103.8198],
  'TAMPINES':                [1.3496, 103.9568],
  'TANGLIN':                 [1.3085, 103.8116],
  'TOA PAYOH':               [1.3343, 103.8563],
  'WESTERN ISLANDS':         [1.2260, 103.7680],
  'WESTERN WATER CATCHMENT': [1.3500, 103.6900],
  'WOODLANDS':               [1.4382, 103.7890],
  'YISHUN':                  [1.4304, 103.8354]
}

/**
 * Given a lat/lng, return the name of the nearest planning area
 * using Euclidean distance between centroids.
 * This is used as an offline fallback when OneMap API is unreachable.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {string}  planning area name
 */
export function getNearestPlanningArea(lat, lng) {
  let nearest = null
  let minDist = Infinity

  for (const [area, [cLat, cLng]] of Object.entries(PLANNING_AREA_CENTROIDS)) {
    const dist = Math.hypot(lat - cLat, lng - cLng)
    if (dist < minDist) {
      minDist = dist
      nearest = area
    }
  }

  return nearest
}

/**
 * Returns the [lat, lng] centroid for a known planning area, or null.
 * @param {string} planningArea
 * @returns {[number, number] | null}
 */
export function getPlanningAreaCentroid(planningArea) {
  return PLANNING_AREA_CENTROIDS[planningArea.toUpperCase().trim()] ?? null
}

/**
 * Map of Singapore postal code prefix → planning area.
 *
 * Standard postal districts (01-45) use 2-digit prefixes.
 * HDB estate / newer codes (46+) overlap across planning areas within the
 * same 2-digit prefix, so a 3-digit lookup is tried first for those ranges.
 *
 * Sources: URA postal districts, HDB town postal ranges, OneMap reverse-geocode
 */
const POSTAL_PREFIX_3D = {
  // Bedok HDB
  '460': 'BEDOK', '461': 'BEDOK', '462': 'BEDOK', '463': 'BEDOK',
  '464': 'BEDOK', '465': 'BEDOK', '466': 'BEDOK', '467': 'BEDOK',
  '468': 'BEDOK', '469': 'BEDOK',
  // Changi
  '470': 'CHANGI', '471': 'CHANGI', '472': 'CHANGI', '473': 'CHANGI',
  '474': 'CHANGI', '475': 'CHANGI', '476': 'CHANGI', '477': 'CHANGI',
  '478': 'CHANGI', '479': 'CHANGI', '480': 'CHANGI', '481': 'CHANGI',
  '482': 'CHANGI', '483': 'CHANGI', '484': 'CHANGI', '485': 'CHANGI',
  '486': 'CHANGI', '487': 'CHANGI', '488': 'CHANGI', '489': 'CHANGI',
  // Pasir Ris
  '510': 'PASIR RIS', '511': 'PASIR RIS', '512': 'PASIR RIS',
  '513': 'PASIR RIS', '514': 'PASIR RIS', '515': 'PASIR RIS',
  '516': 'PASIR RIS', '517': 'PASIR RIS', '518': 'PASIR RIS',
  '519': 'PASIR RIS',
  // Tampines
  '520': 'TAMPINES', '521': 'TAMPINES', '522': 'TAMPINES',
  '523': 'TAMPINES', '524': 'TAMPINES', '525': 'TAMPINES',
  '526': 'TAMPINES', '527': 'TAMPINES', '528': 'TAMPINES',
  '529': 'TAMPINES',
  // Hougang
  '530': 'HOUGANG', '531': 'HOUGANG', '532': 'HOUGANG',
  '533': 'HOUGANG', '534': 'HOUGANG', '535': 'HOUGANG',
  '536': 'HOUGANG', '537': 'HOUGANG', '538': 'HOUGANG',
  '539': 'HOUGANG',
  // Sengkang / Hougang (540-549)
  '540': 'SENGKANG', '541': 'SENGKANG', '542': 'SENGKANG',
  '543': 'SENGKANG', '544': 'SENGKANG', '545': 'HOUGANG',
  '546': 'HOUGANG',  '547': 'HOUGANG',  '548': 'HOUGANG',
  '549': 'HOUGANG',
  // Serangoon
  '550': 'SERANGOON', '551': 'SERANGOON', '552': 'SERANGOON',
  '553': 'SERANGOON', '554': 'SERANGOON', '555': 'SERANGOON',
  '556': 'SERANGOON', '557': 'SERANGOON', '558': 'SERANGOON',
  '559': 'SERANGOON',
  // Ang Mo Kio
  '560': 'ANG MO KIO', '561': 'ANG MO KIO', '562': 'ANG MO KIO',
  '563': 'ANG MO KIO', '564': 'ANG MO KIO', '565': 'ANG MO KIO',
  '566': 'ANG MO KIO', '567': 'ANG MO KIO', '568': 'ANG MO KIO',
  '569': 'ANG MO KIO',
  // Bishan
  '570': 'BISHAN', '571': 'BISHAN', '572': 'BISHAN',
  '573': 'BISHAN', '574': 'BISHAN', '575': 'BISHAN',
  '576': 'BISHAN', '577': 'BISHAN', '578': 'BISHAN',
  '579': 'BISHAN',
  // Toa Payoh HDB (310-319)
  '310': 'TOA PAYOH', '311': 'TOA PAYOH', '312': 'TOA PAYOH',
  '313': 'TOA PAYOH', '314': 'TOA PAYOH', '315': 'TOA PAYOH',
  '316': 'TOA PAYOH', '317': 'TOA PAYOH', '318': 'TOA PAYOH',
  '319': 'TOA PAYOH',
  // Clementi HDB (600-607)
  '600': 'CLEMENTI', '601': 'CLEMENTI', '602': 'CLEMENTI',
  '603': 'CLEMENTI', '604': 'CLEMENTI', '605': 'CLEMENTI',
  '606': 'CLEMENTI', '607': 'CLEMENTI',
  // Jurong East HDB (608-609)
  '608': 'JURONG EAST', '609': 'JURONG EAST',
  // Bukit Merah HDB (610-619)
  '610': 'BUKIT MERAH', '611': 'BUKIT MERAH', '612': 'BUKIT MERAH',
  '613': 'BUKIT MERAH', '614': 'BUKIT MERAH', '615': 'BUKIT MERAH',
  '616': 'BUKIT MERAH', '617': 'BUKIT MERAH', '618': 'BUKIT MERAH',
  '619': 'BUKIT MERAH',
  // Queenstown HDB (620-629)
  '620': 'QUEENSTOWN', '621': 'QUEENSTOWN', '622': 'QUEENSTOWN',
  '623': 'QUEENSTOWN', '624': 'QUEENSTOWN', '625': 'QUEENSTOWN',
  '626': 'QUEENSTOWN', '627': 'QUEENSTOWN', '628': 'QUEENSTOWN',
  '629': 'QUEENSTOWN',
  // Jurong West HDB (630-649)
  '630': 'JURONG WEST', '631': 'JURONG WEST', '632': 'JURONG WEST',
  '633': 'JURONG WEST', '634': 'JURONG WEST', '635': 'JURONG WEST',
  '636': 'JURONG WEST', '637': 'JURONG WEST', '638': 'JURONG WEST',
  '639': 'JURONG WEST', '640': 'JURONG WEST', '641': 'JURONG WEST',
  '642': 'JURONG WEST', '643': 'BOON LAY',    '644': 'BOON LAY',
  '645': 'BOON LAY',    '646': 'BOON LAY',    '647': 'BOON LAY',
  '648': 'BOON LAY',    '649': 'BOON LAY',
  // Bukit Batok HDB (650-659)
  '650': 'BUKIT BATOK', '651': 'BUKIT BATOK', '652': 'BUKIT BATOK',
  '653': 'BUKIT BATOK', '654': 'BUKIT BATOK', '655': 'BUKIT BATOK',
  '656': 'BUKIT BATOK', '657': 'BUKIT BATOK', '658': 'BUKIT BATOK',
  '659': 'BUKIT BATOK',
  // Bukit Panjang HDB (670-679)
  '670': 'BUKIT PANJANG', '671': 'BUKIT PANJANG', '672': 'BUKIT PANJANG',
  '673': 'BUKIT PANJANG', '674': 'BUKIT PANJANG', '675': 'BUKIT PANJANG',
  '676': 'BUKIT PANJANG', '677': 'BUKIT PANJANG', '678': 'BUKIT PANJANG',
  '679': 'BUKIT PANJANG',
  // Choa Chu Kang HDB (680-689)
  '680': 'CHOA CHU KANG', '681': 'CHOA CHU KANG', '682': 'CHOA CHU KANG',
  '683': 'CHOA CHU KANG', '684': 'CHOA CHU KANG', '685': 'CHOA CHU KANG',
  '686': 'CHOA CHU KANG', '687': 'CHOA CHU KANG', '688': 'CHOA CHU KANG',
  '689': 'CHOA CHU KANG',
  // Woodlands HDB (730-739)
  '730': 'WOODLANDS', '731': 'WOODLANDS', '732': 'WOODLANDS',
  '733': 'WOODLANDS', '734': 'WOODLANDS', '735': 'WOODLANDS',
  '736': 'WOODLANDS', '737': 'WOODLANDS', '738': 'WOODLANDS',
  '739': 'WOODLANDS',
  // Sembawang HDB (750-759)
  '750': 'SEMBAWANG', '751': 'SEMBAWANG', '752': 'SEMBAWANG',
  '753': 'SEMBAWANG', '754': 'SEMBAWANG', '755': 'SEMBAWANG',
  '756': 'SEMBAWANG', '757': 'SEMBAWANG', '758': 'SEMBAWANG',
  '759': 'SEMBAWANG',
  // Yishun HDB (760-769)
  '760': 'YISHUN', '761': 'YISHUN', '762': 'YISHUN',
  '763': 'YISHUN', '764': 'YISHUN', '765': 'YISHUN',
  '766': 'YISHUN', '767': 'YISHUN', '768': 'YISHUN',
  '769': 'YISHUN',
  // Punggol HDB (820-828)
  '820': 'PUNGGOL', '821': 'PUNGGOL', '822': 'PUNGGOL',
  '823': 'PUNGGOL', '824': 'PUNGGOL', '825': 'PUNGGOL',
  '826': 'PUNGGOL', '827': 'PUNGGOL', '828': 'PUNGGOL',
}

const POSTAL_PREFIX_2D = {
  // District 1 — Raffles Place, Cecil, Marina, People's Park
  '01': 'DOWNTOWN CORE', '02': 'DOWNTOWN CORE', '03': 'DOWNTOWN CORE',
  '04': 'DOWNTOWN CORE', '05': 'DOWNTOWN CORE', '06': 'DOWNTOWN CORE',
  // District 2 — Anson, Tanjong Pagar
  '07': 'OUTRAM',        '08': 'OUTRAM',
  // District 3 — Queenstown, Tiong Bahru
  '09': 'QUEENSTOWN',    '10': 'QUEENSTOWN',
  // District 4 — Telok Blangah, Harbourfront
  '11': 'BUKIT MERAH',   '12': 'BUKIT MERAH',
  // District 5 — Pasir Panjang, Clementi New Town
  '13': 'CLEMENTI',      '14': 'CLEMENTI',
  // District 6 — High Street, Beach Road (City Hall)
  '15': 'DOWNTOWN CORE', '16': 'DOWNTOWN CORE',
  // District 7 — Middle Road, Golden Mile
  '17': 'ROCHOR',        '18': 'ROCHOR',
  // District 8 — Farrer Park, Serangoon Road
  '19': 'ROCHOR',        '20': 'ROCHOR',
  // District 9 — Orchard, Cairnhill, River Valley
  '21': 'ORCHARD',       '22': 'RIVER VALLEY',
  // District 10 — Ardmore, Bukit Timah, Holland, Tanglin
  '23': 'TANGLIN',       '24': 'TANGLIN',        '25': 'BUKIT TIMAH',
  '26': 'BUKIT TIMAH',   '27': 'BUKIT TIMAH',
  // District 11 — Novena, Thomson, Moulmein
  '28': 'NOVENA',        '29': 'NOVENA',         '30': 'NEWTON',
  // District 12 — Balestier, Toa Payoh, Serangoon
  '31': 'TOA PAYOH',     '32': 'TOA PAYOH',      '33': 'TOA PAYOH',
  // District 13 — Macpherson, Braddell
  '34': 'GEYLANG',       '35': 'GEYLANG',
  // District 14 — Geylang, Eunos
  '36': 'GEYLANG',       '37': 'GEYLANG',        '38': 'GEYLANG',
  '39': 'GEYLANG',       '40': 'MARINE PARADE',  '41': 'MARINE PARADE',
  // District 15 — Katong, Joo Chiat, Amber Road
  '42': 'MARINE PARADE', '43': 'MARINE PARADE',  '44': 'MARINE PARADE',
  '45': 'MARINE PARADE',
}

/**
 * Resolve a planning area from a Singapore postal code string.
 * Uses 3-digit prefix first (handles HDB estate codes accurately),
 * then falls back to 2-digit prefix for standard postal districts.
 * @param {string} postalCode  e.g. "600043"
 * @returns {string|null}
 */
export function getAreaFromPostalCode(postalCode) {
  if (!postalCode || postalCode === 'NIL') return null
  const code = String(postalCode).replace(/\s/g, '').padStart(6, '0')
  if (code.length < 2) return null
  return POSTAL_PREFIX_3D[code.slice(0, 3)] ?? POSTAL_PREFIX_2D[code.slice(0, 2)] ?? null
}
