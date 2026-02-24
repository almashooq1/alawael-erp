/**
 * SearchDashboard Component
 * لوحة تحكم البحث المتقدم
 * 
 * Advanced Search Interface with:
 * - Multi-field search
 * - Advanced filters
 * - Faceted navigation
 * - Autocomplete
 * - Result export
 */

import React, { useState, useCallback, useEffect } from 'react';
import './SearchDashboard.css';

const SearchDashboard = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState({});
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [searchStats, setSearchStats] = useState({});
  const [selectedFields, setSelectedFields] = useState(['name', 'email', 'department']);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // ============================================
  // SEARCH FUNCTIONALITY
  // ============================================
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          fields: selectedFields,
          filters: selectedFilters,
          sort: { field: sortField, direction: sortDirection },
          pagination: { page: currentPage, pageSize }
        })
      });

      const data = await response.json();
      setResults(data.items || []);
      setTotalResults(data.total || 0);
      setSearchStats(data.stats || {});
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedFields, selectedFilters, sortField, sortDirection, currentPage, pageSize]);

  // ============================================
  // AUTOCOMPLETE FUNCTIONALITY
  // ============================================
  const handleSearchInput = useCallback(async (value) => {
    setSearchQuery(value);
    
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch('/api/search/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: value,
          fields: selectedFields,
          limit: 8
        })
      });

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  }, [selectedFields]);

  // ============================================
  // FILTER MANAGEMENT
  // ============================================
  const addFilter = (field, operator, value) => {
    const newFilter = { field, operator, value };
    setSelectedFilters([...selectedFilters, newFilter]);
    setCurrentPage(1);
  };

  const removeFilter = (index) => {
    setSelectedFilters(selectedFilters.filter((_, i) => i !== index));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    setCurrentPage(1);
  };

  // ============================================
  // FACET OPERATIONS
  // ============================================
  const loadFacets = useCallback(async () => {
    try {
      const response = await fetch('/api/search/facets/department');
      const data = await response.json();
      setFacets(data.facets || {});
    } catch (error) {
      console.error('Facet loading error:', error);
    }
  }, []);

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================
  const handleExport = async () => {
    try {
      const response = await fetch('/api/search/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          filters: selectedFilters,
          format: exportFormat
        })
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results.${exportFormat}`;
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  useEffect(() => {
    loadFacets();
  }, [loadFacets]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(totalResults / pageSize);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="search-dashboard">
      <div className="search-container">
        {/* HEADER */}
        <div className="search-header">
          <h1>🔍 لوحة البحث المتقدم</h1>
          <p className="subtitle">Advanced Search & Analytics Dashboard</p>
        </div>

        {/* SEARCH BAR */}
        <div className="search-bar-wrapper">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="ابحث عن... Search for..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            />
            <button className="search-button" onClick={performSearch} disabled={loading}>
              {loading ? '⏳ جاري...' : '🔍 بحث'}
            </button>
          </div>

          {/* AUTOCOMPLETE SUGGESTIONS */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => {
                    setSearchQuery(suggestion);
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONTROLS ROW */}
        <div className="controls-row">
          <div className="field-selector">
            <label>المجالات / Fields:</label>
            <div className="field-checkboxes">
              {['name', 'email', 'department', 'status'].map(field => (
                <label key={field} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFields([...selectedFields, field]);
                      } else {
                        setSelectedFields(selectedFields.filter(f => f !== field));
                      }
                    }}
                  />
                  {field}
                </label>
              ))}
            </div>
          </div>

          <div className="sort-controls">
            <label>الترتيب / Sort:</label>
            <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
              <option value="name">الاسم</option>
              <option value="email">البريد</option>
              <option value="department">القسم</option>
              <option value="date">التاريخ</option>
            </select>
            <button
              className={`sort-direction ${sortDirection}`}
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              {sortDirection === 'asc' ? '↑ تصاعدي' : '↓ تنازلي'}
            </button>
          </div>

          <div className="export-controls">
            <label>تصدير / Export:</label>
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="excel">Excel</option>
            </select>
            <button className="export-button" onClick={handleExport}>
              📥 تصدير
            </button>
          </div>
        </div>

        {/* FILTERS SECTION */}
        <div className="filters-section">
          <h3>الفلاتر / Filters</h3>
          
          <div className="active-filters">
            {selectedFilters.map((filter, index) => (
              <div key={index} className="filter-chip">
                <span>{filter.field} {filter.operator} {filter.value}</span>
                <button onClick={() => removeFilter(index)}>✕</button>
              </div>
            ))}
            {selectedFilters.length > 0 && (
              <button className="clear-filters" onClick={clearFilters}>
                مسح الكل / Clear All
              </button>
            )}
          </div>

          <div className="filter-presets">
            <button className="preset-button" onClick={() => addFilter('status', 'equals', 'active')}>
              نشط فقط / Active Only
            </button>
            <button className="preset-button" onClick={() => addFilter('department', 'equals', 'Engineering')}>
              الهندسة / Engineering
            </button>
            <button className="preset-button" onClick={() => addFilter('salary', 'gt', 5000)}>
              الراتب > 5000
            </button>
          </div>
        </div>

        {/* FACETS SIDEBAR */}
        <div className="facets-section">
          <h3>الفئات / Facets</h3>
          {Object.keys(facets).map(facetName => (
            <div key={facetName} className="facet-group">
              <h4>{facetName}</h4>
              {typeof facets[facetName] === 'object' ? (
                Object.entries(facets[facetName]).map(([value, count]) => (
                  <label key={value} className="facet-item">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          addFilter(facetName, 'equals', value);
                        }
                      }}
                    />
                    <span>{value} ({count})</span>
                  </label>
                ))
              ) : (
                <p className="facet-empty">No facets available</p>
              )}
            </div>
          ))}
        </div>

        {/* STATISTICS */}
        {searchStats && Object.keys(searchStats).length > 0 && (
          <div className="statistics-section">
            <h3>الإحصائيات / Statistics</h3>
            <div className="stats-grid">
              {Object.entries(searchStats).map(([key, value]) => (
                <div key={key} className="stat-card">
                  <div className="stat-label">{key}</div>
                  <div className="stat-value">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS COUNT */}
        <div className="results-info">
          <p>
            عرض {results.length} من {totalResults} نتيجة
            <br />
            Showing {results.length} of {totalResults} results
          </p>
        </div>

        {/* RESULTS TABLE */}
        <div className="results-section">
          {results.length > 0 ? (
            <>
              <table className="results-table">
                <thead>
                  <tr>
                    {selectedFields.map(field => (
                      <th key={field}>{field}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="result-row">
                      {selectedFields.map(field => (
                        <td key={field}>{result[field] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PAGINATION */}
              <div className="pagination">
                <button
                  className="page-button"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← السابق
                </button>
                <span className="page-info">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  className="page-button"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي →
                </button>
              </div>
            </>
          ) : (
            <div className="no-results">
              <p>لا توجد نتائج / No results found</p>
              <p className="hint">حاول بحث مختلف / Try a different search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDashboard;
