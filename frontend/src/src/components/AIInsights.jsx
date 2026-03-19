/**
 * AIInsights Component
 * مكون رؤى الذكاء الاصطناعي
 * 
 * عرض التنبؤات والتوصيات والشذوذ والاتجاهات
 */

import React, { useState, useEffect } from 'react';
import './AIInsights.css';

const AIInsights = () => {
  const [predictions, setPredictions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [trends, setTrends] = useState({});
  const [metrics, setMetrics] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch AI insights on mount
  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const [predictionsRes, anomaliesRes, recommendationsRes, trendsRes, metricsRes] = 
        await Promise.all([
          fetch(`/api/ai/predictions?range=${timeRange}`),
          fetch(`/api/ai/anomalies?range=${timeRange}`),
          fetch(`/api/ai/recommendations?range=${timeRange}`),
          fetch(`/api/ai/trends?range=${timeRange}`),
          fetch('/api/ai/metrics')
        ]);

      const [predictionsData, anomaliesData, recommendationsData, trendsData, metricsData] = 
        await Promise.all([
          predictionsRes.json(),
          anomaliesRes.json(),
          recommendationsRes.json(),
          trendsRes.json(),
          metricsRes.json()
        ]);

      setPredictions(predictionsData.predictions || []);
      setAnomalies(anomaliesData.anomalies || []);
      setRecommendations(recommendationsData.recommendations || []);
      setTrends(trendsData.trends || {});
      setMetrics(metricsData.metrics || {});
    } catch (error) {
      setErrorMessage('Error fetching insights: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const dismissAnomaly = async (anomalyId) => {
    try {
      const response = await fetch(`/api/ai/anomalies/${anomalyId}/dismiss`, {
        method: 'POST'
      });

      if (response.ok) {
        setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
        setSuccessMessage('Anomaly dismissed ✅');
      }
    } catch (error) {
      setErrorMessage('Error dismissing anomaly: ' + error.message);
    }
  };

  const acceptRecommendation = async (recommendationId) => {
    try {
      const response = await fetch(`/api/ai/recommendations/${recommendationId}/accept`, {
        method: 'POST'
      });

      if (response.ok) {
        setRecommendations(prev =>
          prev.map(r => r.id === recommendationId ? { ...r, accepted: true } : r)
        );
        setSuccessMessage('Recommendation accepted! ✅');
      }
    } catch (error) {
      setErrorMessage('Error accepting recommendation: ' + error.message);
    }
  };

  const rejectRecommendation = async (recommendationId) => {
    try {
      const response = await fetch(`/api/ai/recommendations/${recommendationId}/reject`, {
        method: 'POST'
      });

      if (response.ok) {
        setRecommendations(prev =>
          prev.map(r => r.id === recommendationId ? { ...r, rejected: true } : r)
        );
        setSuccessMessage('Recommendation rejected');
      }
    } catch (error) {
      setErrorMessage('Error rejecting recommendation: ' + error.message);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'critical': '#e74c3c',
      'high': '#e67e22',
      'medium': '#f39c12',
      'low': '#f1c40f',
      'info': '#3498db'
    };
    return colors[severity] || '#95a5a6';
  };

  const getSeverityEmoji = (severity) => {
    const emojis = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢',
      'info': '🔵'
    };
    return emojis[severity] || '⚫';
  };

  const getPriorityEmoji = (priority) => {
    const emojis = {
      'high': '⬆️',
      'medium': '➡️',
      'low': '⬇️'
    };
    return emojis[priority] || '➖';
  };

  const filteredPredictions = selectedCategory === 'all'
    ? predictions
    : predictions.filter(p => p.category === selectedCategory);

  return (
    <div className="ai-insights">
      <h1>🤖 AI Insights & Predictions</h1>

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button onClick={() => setSuccessMessage('')}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
          <button onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            📅 Week
          </button>
          <button
            className={`range-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            📅 Month
          </button>
          <button
            className={`range-btn ${timeRange === 'year' ? 'active' : ''}`}
            onClick={() => setTimeRange('year')}
          >
            📅 Year
          </button>
        </div>

        <button
          onClick={fetchInsights}
          className="btn btn-secondary"
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="metrics-section">
        <h2>📊 Key Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Predictions Accuracy</h3>
            <p className="metric-value">{metrics.predictionAccuracy || 0}%</p>
            <p className="metric-trend">
              {metrics.accuracyTrend === 'up' ? '📈' : '📉'} vs last period
            </p>
          </div>

          <div className="metric-card">
            <h3>Anomalies Detected</h3>
            <p className="metric-value">{anomalies.length}</p>
            <p className="metric-trend">
              {anomalies.filter(a => a.severity === 'critical').length} critical
            </p>
          </div>

          <div className="metric-card">
            <h3>Recommendations</h3>
            <p className="metric-value">{recommendations.length}</p>
            <p className="metric-trend">
              {recommendations.filter(r => r.accepted).length} accepted
            </p>
          </div>

          <div className="metric-card">
            <h3>Model Health</h3>
            <p className="metric-value">{metrics.modelHealth || 0}%</p>
            <p className="metric-trend">
              {metrics.modelHealth > 80 ? '✅ Good' : '⚠️ Needs attention'}
            </p>
          </div>
        </div>
      </div>

      {/* Anomalies Section */}
      <div className="anomalies-section">
        <h2>⚠️ Detected Anomalies ({anomalies.length})</h2>
        {anomalies.length > 0 ? (
          <div className="anomalies-list">
            {anomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className="anomaly-card"
                style={{
                  borderLeftColor: getSeverityColor(anomaly.severity)
                }}
              >
                <div className="anomaly-header">
                  <span className="severity-badge" style={{
                    backgroundColor: getSeverityColor(anomaly.severity)
                  }}>
                    {getSeverityEmoji(anomaly.severity)} {anomaly.severity}
                  </span>
                  <h3>{anomaly.title}</h3>
                </div>

                <p className="anomaly-description">{anomaly.description}</p>

                <div className="anomaly-details">
                  <div className="detail">
                    <span className="label">Type:</span>
                    <span className="value">{anomaly.type}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Detected:</span>
                    <span className="value">
                      {new Date(anomaly.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="detail">
                    <span className="label">Confidence:</span>
                    <span className="value">{anomaly.confidence}%</span>
                  </div>
                </div>

                {anomaly.suggestedAction && (
                  <div className="suggested-action">
                    <strong>💡 Suggested Action:</strong>
                    <p>{anomaly.suggestedAction}</p>
                  </div>
                )}

                <button
                  onClick={() => dismissAnomaly(anomaly.id)}
                  className="btn btn-sm btn-secondary"
                >
                  ✓ Dismiss
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">✨ No anomalies detected! Everything looks good.</p>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="recommendations-section">
        <h2>💡 Smart Recommendations ({recommendations.length})</h2>
        {recommendations.length > 0 ? (
          <div className="recommendations-list">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`recommendation-card ${rec.accepted ? 'accepted' : ''} ${rec.rejected ? 'rejected' : ''}`}
              >
                <div className="recommendation-header">
                  <h3>{rec.title}</h3>
                  <span className="priority-badge">
                    {getPriorityEmoji(rec.priority)} {rec.priority}
                  </span>
                </div>

                <p className="recommendation-description">{rec.description}</p>

                <div className="recommendation-details">
                  <div className="detail">
                    <span className="label">Impact:</span>
                    <span className="value">{rec.impact}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Effort:</span>
                    <span className="value">{rec.effort}</span>
                  </div>
                  <div className="detail">
                    <span className="label">Confidence:</span>
                    <span className="value">{rec.confidence}%</span>
                  </div>
                </div>

                {rec.expectedBenefit && (
                  <div className="expected-benefit">
                    <strong>🎯 Expected Benefit:</strong>
                    <p>{rec.expectedBenefit}</p>
                  </div>
                )}

                {!rec.accepted && !rec.rejected && (
                  <div className="recommendation-actions">
                    <button
                      onClick={() => acceptRecommendation(rec.id)}
                      className="btn btn-sm btn-primary"
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => rejectRecommendation(rec.id)}
                      className="btn btn-sm btn-danger"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}

                {rec.accepted && <span className="status-tag accepted">✓ Accepted</span>}
                {rec.rejected && <span className="status-tag rejected">✕ Rejected</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">✨ No recommendations at this time.</p>
        )}
      </div>

      {/* Predictions Section */}
      <div className="predictions-section">
        <h2>🔮 Predictions ({filteredPredictions.length})</h2>

        {/* Category Filter */}
        <div className="category-filter">
          <button
            className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'attendance' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('attendance')}
          >
            👥 Attendance
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'performance' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('performance')}
          >
            📈 Performance
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'risk' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('risk')}
          >
            ⚠️ Risk
          </button>
        </div>

        {filteredPredictions.length > 0 ? (
          <div className="predictions-grid">
            {filteredPredictions.map((prediction, idx) => (
              <div key={idx} className="prediction-card">
                <div className="prediction-header">
                  <h3>{prediction.title}</h3>
                  <span className="confidence-badge">
                    🎯 {prediction.confidence}%
                  </span>
                </div>

                <p className="prediction-description">
                  {prediction.description}
                </p>

                <div className="prediction-value">
                  <span className="label">Predicted Value:</span>
                  <span className="value">{prediction.value}</span>
                </div>

                <div className="prediction-timeline">
                  <span className="label">Timeline:</span>
                  <span className="value">{prediction.timeline}</span>
                </div>

                {prediction.factors && (
                  <div className="factors">
                    <strong>Key Factors:</strong>
                    <ul>
                      {prediction.factors.slice(0, 3).map((factor, i) => (
                        <li key={i}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{ width: `${prediction.confidence}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No predictions available for this category.</p>
        )}
      </div>

      {/* Trends Section */}
      <div className="trends-section">
        <h2>📊 Trend Analysis</h2>
        <div className="trends-grid">
          {Object.entries(trends).map(([key, trend]) => (
            <div key={key} className="trend-card">
              <h3>{trend.title}</h3>
              
              <div className="trend-indicator">
                <span className={`direction ${trend.direction}`}>
                  {trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️'}
                </span>
                <span className="percentage">{trend.percentage}%</span>
              </div>

              <p className="trend-description">{trend.description}</p>

              <div className="trend-visual">
                <div className="trend-bars">
                  {trend.data?.slice(-7).map((value, idx) => (
                    <div
                      key={idx}
                      className="trend-bar"
                      style={{
                        height: `${(value / Math.max(...(trend.data || []))) * 100}%`
                      }}
                      title={value}
                    ></div>
                  ))}
                </div>
              </div>

              {trend.forecast && (
                <p className="forecast">
                  <strong>📅 Next Period:</strong> {trend.forecast}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Analyzing data...</p>
        </div>
      )}
    </div>
  );
};

export default AIInsights;
