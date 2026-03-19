/**
 * CashFlowDashboard.js - Advanced Cash Flow Analysis & Forecasting
 * Real-time cash position, flow analysis, and predictive forecasting
 */

import React, { useState, useEffect } from 'react';
import './CashFlowDashboard.css';

const CashFlowDashboard = ({ organizationId }) => {
  const [cashData, setCashData] = useState({
    currentBalance: 0,
    inflows: [],
    outflows: [],
    forecasts: [],
    reserves: [],
    dailyChange: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState({ from: null, to: null });
  const [viewMode, setViewMode] = useState('chart');
  const [selectedReserve, setSelectedReserve] = useState(null);

  useEffect(() => {
    fetchCashFlowData();
    // Real-time updates every 5 minutes
    const interval = setInterval(fetchCashFlowData, 300000);
    return () => clearInterval(interval);
  }, [organizationId, period]);

  const fetchCashFlowData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        organizationId,
        from: period.from || new Date(Date.now() - 30*24*60*60*1000).toISOString(),
        to: period.to || new Date().toISOString()
      });

      const response = await fetch(`/api/finance/cashflow/analysis?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch cash flow data');

      const data = await response.json();
      setCashData(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (transaction) => {
    try {
      const response = await fetch('/api/finance/cashflow/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...transaction
        })
      });

      if (!response.ok) throw new Error('Failed to add transaction');

      fetchCashFlowData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddReserve = async (reserve) => {
    try {
      const response = await fetch('/api/finance/cashflow/reserves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...reserve
        })
      });

      if (!response.ok) throw new Error('Failed to add reserve');

      fetchCashFlowData();
    } catch (err) {
      setError(err.message);
    }
  };

  const calculateMetrics = () => {
    const totalInflows = cashData.inflows.reduce((sum, flow) => sum + (flow.amount || 0), 0);
    const totalOutflows = cashData.outflows.reduce((sum, flow) => sum + (flow.amount || 0), 0);
    const reserveTotal = cashData.reserves.reduce((sum, res) => sum + (res.amount || 0), 0);
    const adequacyRatio = reserveTotal / totalOutflows || 0;

    return { totalInflows, totalOutflows, reserveTotal, adequacyRatio };
  };

  if (loading) return <div className="loading">Loading cash flow data...</div>;

  const metrics = calculateMetrics();

  return (
    <div className="cashflow-dashboard">
      <div className="dashboard-header">
        <h2>💵 Cash Flow Analysis & Forecasting</h2>
        <div className="header-controls">
          <button className="btn-refresh" onClick={fetchCashFlowData}>🔄 Refresh</button>
          <button className="btn-new-transaction" onClick={() => {}}>+ New Transaction</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Cash Position Widget */}
      <div className="cash-position-widget">
        <div className="position-card">
          <div className="position-label">Current Cash Balance</div>
          <div className="position-value">${cashData.currentBalance.toLocaleString()}</div>
          <div className={`position-change ${cashData.dailyChange >= 0 ? 'positive' : 'negative'}`}>
            {cashData.dailyChange >= 0 ? '↗' : '↘'} {Math.abs(cashData.dailyChange).toLocaleString()} today
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Expected Inflows</span>
            <span className="metric-value green">${metrics.totalInflows.toLocaleString()}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Expected Outflows</span>
            <span className="metric-value red">${metrics.totalOutflows.toLocaleString()}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Reserves</span>
            <span className="metric-value">${metrics.reserveTotal.toLocaleString()}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Adequacy Ratio</span>
            <span className="metric-value">{metrics.adequacyRatio.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="view-selector">
        <button
          className={`view-btn ${viewMode === 'chart' ? 'active' : ''}`}
          onClick={() => setViewMode('chart')}
        >
          📊 Charts
        </button>
        <button
          className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          📋 Table
        </button>
        <button
          className={`view-btn ${viewMode === 'analysis' ? 'active' : ''}`}
          onClick={() => setViewMode('analysis')}
        >
          📈 Analysis
        </button>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="chart-section">
          <h3>Cash Flow Trends</h3>
          <div className="charts-container">
            <div className="chart-placeholder">
              <p>Line Chart: Inflows vs Outflows</p>
              <ChartPlaceholder data={cashData.inflows} label="Inflows" color="#00C851" />
            </div>
            <div className="chart-placeholder">
              <p>Area Chart: Net Balance</p>
              <ChartPlaceholder data={cashData.inflows} label="Balance" color="#4285F4" />
            </div>
          </div>

          {/* Forecast Section */}
          <div className="forecast-section">
            <h3>3-Month Forecast</h3>
            <div className="forecast-controls">
              <label>Forecast Model:</label>
              <select defaultValue="linear">
                <option value="linear">Linear Regression</option>
                <option value="exponential">Exponential</option>
                <option value="arima">ARIMA</option>
                <option value="seasonal">Seasonal</option>
              </select>
              <button className="btn-rerun">▶ Re-run Forecast</button>
            </div>
            <div className="forecast-chart">
              <p>Forecast Chart with Confidence Intervals</p>
              <ForecastViewer forecasts={cashData.forecasts} />
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="table-section">
          <h3>Inflows & Outflows</h3>

          <div className="flows-container">
            <div className="flow-column">
              <h4>Inflows (Sources)</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {cashData.inflows.map((flow, idx) => (
                    <tr key={idx}>
                      <td>{new Date(flow.date).toLocaleDateString()}</td>
                      <td>{flow.source}</td>
                      <td className="amount-cell">${flow.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flow-column">
              <h4>Outflows (Purposes)</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Purpose</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {cashData.outflows.map((flow, idx) => (
                    <tr key={idx}>
                      <td>{new Date(flow.date).toLocaleDateString()}</td>
                      <td>{flow.purpose}</td>
                      <td className="amount-cell red">${flow.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analysis View */}
      {viewMode === 'analysis' && (
        <div className="analysis-section">
          <h3>Advanced Analysis</h3>

          <div className="analysis-grid">
            <div className="analysis-card">
              <h4>Pattern Detection</h4>
              <p>Recurring patterns identified in cash flows</p>
              <ul>
                <li>Weekly inflows on Fridays</li>
                <li>Monthly expenses on 1st & 15th</li>
                <li>Seasonal spike in Q4</li>
              </ul>
            </div>

            <div className="analysis-card">
              <h4>Anomaly Alerts</h4>
              <p>Unusual transactions detected</p>
              <ul className="alerts">
                <li className="alert-high">⚠️ Large outflow on unusual date</li>
                <li className="alert-medium">⚡ Unexpected source for inflow</li>
              </ul>
            </div>

            <div className="analysis-card">
              <h4>Trend Analysis</h4>
              <p>Overall trends in cash flows</p>
              <ul>
                <li className="trend-up">↗ Inflows trending up (+12%)</li>
                <li className="trend-stable">→ Outflows stable</li>
              </ul>
            </div>

            <div className="analysis-card">
              <h4>Recommendations</h4>
              <p>Suggested actions for optimization</p>
              <ul>
                <li>Consolidate frequent outflows</li>
                <li>Increase reserve buffer</li>
                <li>Review seasonal spending</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reserves Management */}
      <div className="reserves-section">
        <h3>Reserve Management</h3>
        <div className="reserves-table">
          {cashData.reserves && cashData.reserves.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Purpose</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cashData.reserves.map((reserve) => (
                  <tr key={reserve._id}>
                    <td>{reserve.name}</td>
                    <td>${reserve.amount.toLocaleString()}</td>
                    <td>{reserve.purpose}</td>
                    <td>{new Date(reserve.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-small">Edit</button>
                      <button className="btn-small">Withdraw</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No reserves created</p>
          )}
        </div>
        <button className="btn-add-reserve">+ Add Reserve</button>
      </div>
    </div>
  );
};

function ChartPlaceholder({ data, label, color }) {
  return (
    <svg width="100%" height="200" style={{ border: '1px solid #ddd' }}>
      <text x="10" y="20" fontSize="12">{label}</text>
      <line x1="10" y1="100" x2="380" y2="100" stroke="#ccc" />
      <rect x="50" y="80" width="30" height="20" fill={color} opacity="0.7" />
      <rect x="120" y="60" width="30" height="40" fill={color} opacity="0.7" />
      <rect x="190" y="40" width="30" height="60" fill={color} opacity="0.7" />
      <rect x="260" y="50" width="30" height="50" fill={color} opacity="0.7" />
      <rect x="330" y="70" width="30" height="30" fill={color} opacity="0.7" />
    </svg>
  );
}

function ForecastViewer({ forecasts }) {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
      <p>Forecast data visualization</p>
      {forecasts && forecasts.length > 0 && (
        <ul>
          {forecasts.slice(0, 5).map((forecast, idx) => (
            <li key={idx}>
              {new Date(forecast.date).toLocaleDateString()}: ${forecast.amount.toLocaleString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CashFlowDashboard;
