/**
 * Migration Management Dashboard Component
 * Displays migration status, progress, and controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import './MigrationDashboard.css';

const MigrationDashboard = () => {
  const [migrationState, setMigrationState] = useState({
    initialized: false,
    planCreated: false,
    executing: false,
    paused: false,
    summary: null,
    logs: [],
    csvInfo: null,
    error: null,
    successMessage: null,
  });

  const [formData, setFormData] = useState({
    sourceDB: '',
    targetDB: '',
    selectedTables: [],
  });

  const API_BASE = 'http://localhost:3001/api/migrations';

  // Fetch migration summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/summary`);
      const data = await response.json();
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          summary: data.summary,
          error: null,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/log`);
      const data = await response.json();
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          logs: data.logs || [],
        }));
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  // Initialize migration manager
  const handleInitialize = async () => {
    if (!formData.sourceDB || !formData.targetDB) {
      setMigrationState(prev => ({
        ...prev,
        error: 'Source and target databases are required',
      }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDB: formData.sourceDB,
          targetDB: formData.targetDB,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          initialized: true,
          successMessage: 'Migration manager initialized successfully',
          error: null,
        }));
      } else {
        setMigrationState(prev => ({
          ...prev,
          error: data.error || 'Failed to initialize',
        }));
      }
    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  // Create migration plan
  const handleCreatePlan = async () => {
    try {
      const response = await fetch(`${API_BASE}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: formData.selectedTables || [],
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          planCreated: true,
          successMessage: 'Migration plan created successfully',
          error: null,
        }));
      } else {
        setMigrationState(prev => ({
          ...prev,
          error: data.error || 'Failed to create plan',
        }));
      }
    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  // Execute migration
  const handleExecute = async () => {
    try {
      const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          executing: true,
          successMessage: 'Migration started',
          error: null,
        }));
        // Refresh summary after execution
        setTimeout(fetchSummary, 1000);
        setTimeout(fetchLogs, 1000);
      } else {
        setMigrationState(prev => ({
          ...prev,
          error: data.error || 'Failed to execute migration',
        }));
      }
    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  // Pause migration
  const handlePause = async () => {
    try {
      const response = await fetch(`${API_BASE}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          paused: true,
          successMessage: 'Migration paused',
          error: null,
        }));
      }
    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  // Resume migration
  const handleResume = async () => {
    try {
      const response = await fetch(`${API_BASE}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          paused: false,
          successMessage: 'Migration resumed',
          error: null,
        }));
      }
    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  // Clear logs
  const handleClearLogs = async () => {
    try {
      const response = await fetch(`${API_BASE}/log`, {
        method: 'DELETE',
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationState(prev => ({
          ...prev,
          logs: [],
          successMessage: 'Logs cleared',
          error: null,
        }));
      }
    } catch (error) {
      setMigrationState(prev => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  useEffect(() => {
    // Auto-refresh summary and logs every 3 seconds
    const interval = setInterval(() => {
      if (migrationState.executing) {
        fetchSummary();
        fetchLogs();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [migrationState.executing, fetchSummary, fetchLogs]);

  return (
    <div className="migration-dashboard">
      <div className="dashboard-header">
        <h1>🔄 Migration Management</h1>
        <p className="subtitle">Manage and monitor database migrations</p>
      </div>

      {/* Status Messages */}
      {migrationState.error && (
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          {migrationState.error}
        </div>
      )}
      {migrationState.successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {migrationState.successMessage}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Step 1: Initialize */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>1️⃣ Initialize Migration Manager</h2>
            <span className={`status-badge ${migrationState.initialized ? 'completed' : 'pending'}`}>
              {migrationState.initialized ? '✅ Done' : '⏳ Pending'}
            </span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Source Database URL</label>
              <input
                type="text"
                placeholder="mongodb://source:27017/db"
                value={formData.sourceDB}
                onChange={(e) => setFormData({ ...formData, sourceDB: e.target.value })}
                disabled={migrationState.initialized}
              />
            </div>
            <div className="form-group">
              <label>Target Database URL</label>
              <input
                type="text"
                placeholder="mongodb://target:27017/db"
                value={formData.targetDB}
                onChange={(e) => setFormData({ ...formData, targetDB: e.target.value })}
                disabled={migrationState.initialized}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleInitialize}
              disabled={migrationState.initialized}
            >
              {migrationState.initialized ? 'Initialized ✅' : 'Initialize'}
            </button>
          </div>
        </div>

        {/* Step 2: Plan */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>2️⃣ Create Migration Plan</h2>
            <span className={`status-badge ${migrationState.planCreated ? 'completed' : 'pending'}`}>
              {migrationState.planCreated ? '✅ Done' : '⏳ Pending'}
            </span>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Select Tables to Migrate</label>
              <div className="table-list">
                {['users', 'products', 'orders', 'categories'].map(table => (
                  <label key={table} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.selectedTables.includes(table)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            selectedTables: [...formData.selectedTables, table],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedTables: formData.selectedTables.filter(t => t !== table),
                          });
                        }
                      }}
                      disabled={migrationState.planCreated}
                    />
                    <span>{table}</span>
                  </label>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCreatePlan}
              disabled={migrationState.planCreated || !migrationState.initialized}
            >
              {migrationState.planCreated ? 'Plan Created ✅' : 'Create Plan'}
            </button>
          </div>
        </div>

        {/* Step 3: Execute */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>3️⃣ Execute Migration</h2>
            <span className={`status-badge ${migrationState.executing ? 'executing' : 'pending'}`}>
              {migrationState.executing ? '▶️ Running' : '⏳ Ready'}
            </span>
          </div>
          <div className="card-body">
            <p className="info-text">Start the migration process with the configured plan.</p>
            <div className="button-group">
              <button
                className="btn btn-success"
                onClick={handleExecute}
                disabled={!migrationState.planCreated || migrationState.executing}
              >
                {migrationState.executing ? 'Executing...' : 'Execute Migration'}
              </button>
              {migrationState.executing && (
                <>
                  <button
                    className="btn btn-warning"
                    onClick={handlePause}
                    disabled={migrationState.paused}
                  >
                    {migrationState.paused ? 'Paused ⏸' : 'Pause'}
                  </button>
                  {migrationState.paused && (
                    <button
                      className="btn btn-info"
                      onClick={handleResume}
                    >
                      Resume ▶️
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {migrationState.summary && (
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h2>📊 Migration Summary</h2>
          </div>
          <div className="card-body">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Total Records:</span>
                <span className="summary-value">{migrationState.summary.totalRecords || '-'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Migrated:</span>
                <span className="summary-value">{migrationState.summary.migratedCount || 0}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Failed:</span>
                <span className="summary-value warning">{migrationState.summary.failedCount || 0}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Duration:</span>
                <span className="summary-value">{migrationState.summary.duration || '-'}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${(migrationState.summary.migratedCount / migrationState.summary.totalRecords) * 100 || 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div className="dashboard-card full-width">
        <div className="card-header">
          <h2>📋 Migration Logs</h2>
          <button className="btn btn-small btn-danger" onClick={handleClearLogs}>
            Clear Logs
          </button>
        </div>
        <div className="card-body">
          {migrationState.logs.length > 0 ? (
            <div className="logs-container">
              {migrationState.logs.map((log, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-time">{log.timestamp || new Date().toLocaleTimeString()}</span>
                  <span className={`log-level log-${log.level?.toLowerCase() || 'info'}`}>
                    {log.level || 'INFO'}
                  </span>
                  <span className="log-message">{log.message || log}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No logs yet. Start a migration to see activity.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MigrationDashboard;
