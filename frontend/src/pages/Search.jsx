import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSearch, FiFilter, FiDownload } from 'react-icons/fi';
import './Search.css';

/**
 * Phase 12 - Search Component
 * Integrates Phase 10 Search Engine with Frontend
 */
const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('full-text');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Auto-complete suggestions
  useEffect(() => {
    if (searchQuery.length > 2) {
      fetchSuggestions(searchQuery);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  const fetchSuggestions = async (query) => {
    try {
      const res = await axios.get(`/api/search/suggestions?query=${query}`);
      setSuggestions(res.data.data || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      let endpoint = '/api/search/full-text';
      if (searchType === 'fuzzy') {
        endpoint = '/api/search/fuzzy';
      }

      const res = await axios.get(`${endpoint}?query=${encodeURIComponent(searchQuery)}`);
      setResults(res.data.data?.results || []);
    } catch (err) {
      setError(`Search failed: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setSuggestions([]);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `search-results-${Date.now()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="search-container">
      <header className="search-header">
        <h1>🔍 Advanced Search</h1>
        <p>Search across the entire system with full-text and fuzzy matching</p>
      </header>

      {/* Search Box */}
      <section className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search for anything... (accounting, users, reports, etc.)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {suggestions.map((sugg, idx) => (
                  <div
                    key={idx}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(sugg)}
                  >
                    <FiSearch size={14} />
                    {sugg}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="search-filters">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="search-filter"
            >
              <option value="full-text">Full-Text</option>
              <option value="fuzzy">Fuzzy Match</option>
            </select>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      <section className="results-section">
        <div className="results-header">
          <h2>
            📋 Results
            {results.length > 0 && <span className="result-count">({results.length})</span>}
          </h2>
          {results.length > 0 && (
            <button onClick={handleExport} className="btn btn-secondary">
              <FiDownload /> Export
            </button>
          )}
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        )}

        {!loading && results.length === 0 && searchQuery && (
          <div className="no-results">
            <p>No results found for "{searchQuery}"</p>
            <p>Try a different search term or use fuzzy matching for typo tolerance</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="results-list">
            {results.map((result, idx) => (
              <div key={idx} className="result-item">
                <div className="result-header">
                  <h3>{result.name || result.title}</h3>
                  {result.score && (
                    <span className="result-score">Score: {result.score}</span>
                  )}
                </div>
                <p className="result-description">
                  {result.description || result.content || 'No description available'}
                </p>
                {result.metadata && (
                  <div className="result-metadata">
                    {Object.entries(result.metadata).map(([key, value]) => (
                      <span key={key} className="metadata-tag">
                        {key}: {String(value).substring(0, 30)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats */}
      {searchQuery && (
        <section className="search-stats">
          <h3>📊 Search Statistics</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Total Results</span>
              <span className="stat-value">{results.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Search Type</span>
              <span className="stat-value">{searchType === 'full-text' ? 'Full-Text' : 'Fuzzy'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Query</span>
              <span className="stat-value">{searchQuery}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Search;
