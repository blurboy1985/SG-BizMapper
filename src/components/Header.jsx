import React from 'react'
import './Header.css'

export default function Header({ onSearch }) {
  const [query, setQuery] = React.useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) onSearch(query.trim())
  }

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">📍</span>
        <div>
          <h1 className="header-title">SG BizMapper</h1>
          <p className="header-subtitle">Location Intelligence for SMEs</p>
        </div>
      </div>

      <form className="header-search" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="Search a location (e.g. Clementi, Tampines…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-btn">
          Search
        </button>
      </form>

      <div className="header-hint">
        <span className="pulse-dot" /> Drop a pin anywhere on the map
      </div>
    </header>
  )
}
