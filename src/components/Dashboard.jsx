import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { densityLabel, densityColour } from '../services/singstat'
import './Dashboard.css'

const DWELLING_COLOURS = {
  hdb: '#4299e1',
  condo: '#9f7aea',
  landed: '#48bb78',
  other: '#ed8936'
}

const AGE_COLOURS = ['#63b3ed', '#f6ad55', '#fc8181']

export default function Dashboard({ data, planningArea, coords, error, areaSource }) {
  // ── empty / error states ──────────────────────────────────────────────────
  if (error) {
    return (
      <aside className="dashboard dashboard--empty">
        <div className="dashboard-placeholder">
          <span className="placeholder-icon">⚠️</span>
          <p className="placeholder-title">No data found</p>
          <p className="placeholder-body">{error}</p>
        </div>
      </aside>
    )
  }

  if (!data) {
    return (
      <aside className="dashboard dashboard--empty">
        <div className="dashboard-placeholder">
          <span className="placeholder-icon">🗺️</span>
          <p className="placeholder-title">Drop a pin to explore</p>
          <p className="placeholder-body">
            Click anywhere on the map to see the neighbourhood
            demographics — population density, income, dwelling types,
            and age breakdown.
          </p>
          <ul className="placeholder-steps">
            <li>📍 Click on the map to place a pin</li>
            <li>🏙️ We identify your planning area</li>
            <li>📊 Instant demographic dashboard appears</li>
          </ul>
        </div>
      </aside>
    )
  }

  // ── computed values ───────────────────────────────────────────────────────
  const dwellingData = Object.entries(data.dwellings).map(([key, val]) => ({
    name: key.toUpperCase(),
    value: val
  }))

  const ageData = [
    { name: 'Young (0–24)', value: data.ageGroups.young },
    { name: 'Working (25–64)', value: data.ageGroups.working },
    { name: 'Senior (65+)', value: data.ageGroups.senior }
  ]

  const incomeFormatted = data.medianHHIncome.toLocaleString('en-SG')
  const popFormatted = data.population.toLocaleString('en-SG')
  const densityFormatted = data.density.toLocaleString('en-SG')

  const dominantDwelling = Object.entries(data.dwellings).sort(
    (a, b) => b[1] - a[1]
  )[0][0].toUpperCase()

  return (
    <aside className="dashboard">
      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <h2 className="dash-area-name">{planningArea}</h2>
          {coords && (
            <p className="dash-coords">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
          {areaSource === 'centroid' && (
            <p className="dash-estimated-note" title="OneMap API unavailable — area estimated from nearest planning-area centroid">
              ⚠️ Estimated area (offline mode)
            </p>
          )}
        </div>
        <span
          className="dash-density-badge"
          style={{ background: densityColour(data.density) }}
        >
          {densityLabel(data.density)}
        </span>
      </div>

      {/* ── KPI cards ── */}
      <div className="kpi-grid">
        <KPICard
          icon="👥"
          label="Population"
          value={popFormatted}
          sub="residents"
        />
        <KPICard
          icon="📏"
          label="Density"
          value={densityFormatted}
          sub="per km²"
        />
        <KPICard
          icon="🎂"
          label="Median Age"
          value={`${data.medianAge}`}
          sub="years old"
        />
        <KPICard
          icon="💰"
          label="Median HH Income"
          value={`$${incomeFormatted}`}
          sub="SGD / month"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="charts-grid">
        {/* Dwelling type pie */}
        <div className="chart-card">
          <h3 className="chart-title">Dwelling Types</h3>
          <p className="chart-dominant">
            Dominant: <strong>{dominantDwelling}</strong> ({data.dwellings[dominantDwelling.toLowerCase()]}%)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={dwellingData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {dwellingData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={DWELLING_COLOURS[entry.name.toLowerCase()]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => (
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e0' }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Age breakdown bar */}
        <div className="chart-card">
          <h3 className="chart-title">Age Breakdown</h3>
          <p className="chart-dominant">
            Largest segment:{' '}
            <strong>
              {ageData.sort((a, b) => b.value - a.value)[0].name.split(' ')[0]}
            </strong>
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ageData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#a0aec0' }}
                tickFormatter={(v) => v.split(' ')[0]}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#a0aec0' }}
                tickFormatter={(v) => `${v}%`}
                width={32}
              />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {ageData.map((entry, index) => (
                  <Cell key={entry.name} fill={AGE_COLOURS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Insights ── */}
      <div className="insights">
        <h3 className="insights-title">💡 SME Insights</h3>
        <div className="insights-list">
          {generateInsights(data, planningArea).map((tip, i) => (
            <div key={i} className="insight-item">
              <span className="insight-icon">{tip.icon}</span>
              <span>{tip.text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="dash-footer">
        Source: Singapore Census 2020 (SingStat) · Map: OneMap (SLA)
      </p>
    </aside>
  )
}

function KPICard({ icon, label, value, sub }) {
  return (
    <div className="kpi-card">
      <span className="kpi-icon">{icon}</span>
      <div>
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        <p className="kpi-sub">{sub}</p>
      </div>
    </div>
  )
}

function generateInsights(data, area) {
  const tips = []

  if (data.medianHHIncome >= 14_000) {
    tips.push({ icon: '🎯', text: 'High-income neighbourhood — premium or lifestyle brands may thrive here.' })
  } else if (data.medianHHIncome >= 10_000) {
    tips.push({ icon: '🎯', text: 'Mid-to-upper income area — broad product range likely to perform well.' })
  } else {
    tips.push({ icon: '🎯', text: 'Value-conscious area — competitive pricing and everyday essentials resonate.' })
  }

  if (data.dwellings.hdb >= 75) {
    tips.push({ icon: '🏗️', text: `Predominantly HDB estate (${data.dwellings.hdb}%) — high foot traffic near void decks and wet markets.` })
  } else if (data.dwellings.landed >= 30) {
    tips.push({ icon: '🏡', text: `High landed-property share (${data.dwellings.landed}%) — car ownership likely, large-format retail may be viable.` })
  } else {
    tips.push({ icon: '🏙️', text: `Mixed condo/HDB zone — diverse consumer base, food & beverage tends to perform strongly.` })
  }

  if (data.ageGroups.senior >= 20) {
    tips.push({ icon: '👴', text: `Ageing population (${data.ageGroups.senior}% seniors) — healthcare, convenience, and accessible services in demand.` })
  } else if (data.ageGroups.young >= 30) {
    tips.push({ icon: '👶', text: `Young demographic (${data.ageGroups.young}% under-25) — education, childcare, and family-oriented concepts may do well.` })
  }

  if (data.density >= 15_000) {
    tips.push({ icon: '📈', text: 'Very high population density — strong captive customer base for neighbourhood businesses.' })
  } else if (data.density < 1_000) {
    tips.push({ icon: '🚗', text: 'Low-density area — destination-driven shoppers; parking and accessibility are key.' })
  }

  return tips
}
