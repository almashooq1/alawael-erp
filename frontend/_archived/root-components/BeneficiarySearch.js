/**
 * BeneficiarySearch.js - Advanced Beneficiary Search and Filtering Component
 * Search, filter, and manage multiple beneficiaries
 */

import React, { useState, useEffect } from 'react';
import './BeneficiarySearch.css';

const BeneficiarySearch = ({ onSelectBeneficiary, isAdmin = false }) => {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    program: 'all',
    level: 'all',
    riskLevel: 'all'
  });

  const itemsPerPage = 10;

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [beneficiaries, searchTerm, filters]);

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/beneficiary/all');

      if (!response.ok) throw new Error('Failed to fetch beneficiaries');

      const data = await response.json();
      setBeneficiaries(data.data.beneficiaries || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let results = beneficiaries;

    // Apply search term
    if (searchTerm) {
      results = results.filter(b =>
        b.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.beneficiaryId.includes(searchTerm)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      results = results.filter(b => b.status === filters.status);
    }

    // Apply program filter
    if (filters.program !== 'all') {
      results = results.filter(b => b.programName === filters.program);
    }

    // Apply level filter
    if (filters.level !== 'all') {
      results = results.filter(b => b.academicLevel === filters.level);
    }

    // Apply risk level filter
    if (filters.riskLevel !== 'all') {
      results = results.filter(b => b.riskLevel === filters.riskLevel);
    }

    setFilteredBeneficiaries(results);
    setCurrentPage(1);
  };

  const handleSelectBeneficiary = (beneficiary) => {
    if (onSelectBeneficiary) {
      onSelectBeneficiary(beneficiary);
    }
  };

  const handleBulkSelect = (beneficiaryId) => {
    setSelectedBeneficiaries(prev =>
      prev.includes(beneficiaryId)
        ? prev.filter(id => id !== beneficiaryId)
        : [...prev, beneficiaryId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBeneficiaries(paginatedData.map(b => b._id));
    } else {
      setSelectedBeneficiaries([]);
    }
  };

  const handleExportSelected = async () => {
    if (selectedBeneficiaries.length === 0) {
      alert('Please select beneficiaries to export');
      return;
    }

    try {
      const response = await fetch('/api/beneficiary/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beneficiaryIds: selectedBeneficiaries })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `beneficiaries_${new Date().getTime()}.csv`;
      link.click();
    } catch (err) {
      setError(err.message);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredBeneficiaries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredBeneficiaries.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <div className="loading">Loading beneficiaries...</div>;

  return (
    <div className="beneficiary-search">
      <div className="search-header">
        <h2>Beneficiary Directory</h2>
        <div className="search-stats">
          <span>Total: {filteredBeneficiaries.length}</span>
          {selectedBeneficiaries.length > 0 && (
            <span>Selected: {selectedBeneficiaries.length}</span>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="GRADUATED">Graduated</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Program:</label>
          <select
            value={filters.program}
            onChange={(e) => setFilters({...filters, program: e.target.value})}
          >
            <option value="all">All Programs</option>
            <option value="SCHOLARSHIP">Scholarship</option>
            <option value="MENTORSHIP">Mentorship</option>
            <option value="VOCATIONAL">Vocational</option>
            <option value="INTERNSHIP">Internship</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Level:</label>
          <select
            value={filters.level}
            onChange={(e) => setFilters({...filters, level: e.target.value})}
          >
            <option value="all">All Levels</option>
            <option value="SECONDARY">Secondary</option>
            <option value="DIPLOMA">Diploma</option>
            <option value="BACHELOR">Bachelor</option>
            <option value="MASTER">Master</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Risk Level:</label>
          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({...filters, riskLevel: e.target.value})}
          >
            <option value="all">All Risk Levels</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {isAdmin && selectedBeneficiaries.length > 0 && (
        <div className="bulk-actions">
          <button
            className="btn-export"
            onClick={handleExportSelected}
          >
            📥 Export Selected ({selectedBeneficiaries.length})
          </button>
          <button
            className="btn-clear"
            onClick={() => setSelectedBeneficiaries([])}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Results Table */}
      <div className="results-table">
        {paginatedData.length > 0 ? (
          <table>
            <thead>
              <tr>
                {isAdmin && (
                  <th>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedBeneficiaries.length === paginatedData.length && paginatedData.length > 0}
                    />
                  </th>
                )}
                <th>Name</th>
                <th>ID</th>
                <th>Email</th>
                <th>Program</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((beneficiary) => (
                <tr key={beneficiary._id} className={selectedBeneficiaries.includes(beneficiary._id) ? 'selected' : ''}>
                  {isAdmin && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedBeneficiaries.includes(beneficiary._id)}
                        onChange={() => handleBulkSelect(beneficiary._id)}
                      />
                    </td>
                  )}
                  <td className="name-cell">
                    <span className="avatar">{beneficiary.fullName.charAt(0)}</span>
                    {beneficiary.fullName}
                  </td>
                  <td>{beneficiary.beneficiaryId}</td>
                  <td>{beneficiary.email}</td>
                  <td>{beneficiary.programName}</td>
                  <td>
                    <span className={`status-badge status-${beneficiary.status}`}>
                      {beneficiary.status}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-badge risk-${beneficiary.riskLevel}`}>
                      {beneficiary.riskLevel}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-view"
                      onClick={() => handleSelectBeneficiary(beneficiary)}
                      title="View profile"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-results">No beneficiaries found matching your criteria</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <div className="page-info">
            Page {currentPage} of {totalPages}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default BeneficiarySearch;
