/**
 * ALAWAEL ERP - PHASE 19: NPS Tracker Component
 * Track and analyze Net Promoter Score
 */

import React, { useState, useEffect } from 'react';
import './NPSTracker.css';

const NPSTracker = () => {
  const [npsData, setNpsData] = useState({
    npsScore: 0,
    totalResponses: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
    trend: 'stable'
  });
  const [selectedScore, setSelectedScore] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchNPSData();
  }, []);

  const fetchNPSData = async () => {
    try {
      const response = await fetch('/api/v1/customer-experience/nps/calculate');
      if (response.ok) {
        const data = await response.json();
        setNpsData(data.data);
      }
    } catch (error) {
      console.error('Error fetching NPS data:', error);
    }
  };

  const handleSubmitNPS = async () => {
    if (!customerId || selectedScore === null) {
      alert('Please provide customer ID and NPS score');
      return;
    }

    try {
      const response = await fetch('/api/v1/customer-experience/nps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          score: selectedScore,
          feedback
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setSelectedScore(null);
        setFeedback('');
        setCustomerId('');
        setTimeout(() => {
          setSubmitted(false);
          fetchNPSData();
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting NPS:', error);
    }
  };

  const getNpsCategory = (score) => {
    if (score >= 9) return { label: 'PROMOTER', color: '#10b981', icon: '😍' };
    if (score >= 7) return { label: 'PASSIVE', color: '#f59e0b', icon: '😐' };
    return { label: 'DETRACTOR', color: '#ef4444', icon: '😞' };
  };

  const getCategoryPercentage = (value) => {
    if (npsData.totalResponses === 0) return 0;
    return ((value / npsData.totalResponses) * 100).toFixed(1);
  };

  return (
    <div className="nps-tracker">
      <div className="header">
        <h1>⭐ Net Promoter Score (NPS)</h1>
        <button className="btn-refresh" onClick={fetchNPSData}>🔄 Refresh</button>
      </div>

      <div className="nps-input-section">
        <h2>Record NPS Score</h2>
        <div className="input-fields">
          <input
            type="text"
            placeholder="Customer ID"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
          <textarea
            placeholder="Additional feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows="3"
          />
        </div>

        <div className="score-selector">
          <p>How likely are you to recommend us? (0-10)</p>
          <div className="score-buttons">
            {Array.from({length: 11}, (_, i) => (
              <button
                key={i}
                className={`score-btn ${selectedScore === i ? 'selected' : ''}`}
                onClick={() => setSelectedScore(i)}
                style={{
                  backgroundColor: selectedScore === i ? getNpsCategory(i).color : '#f3f4f6',
                  color: selectedScore === i ? 'white' : '#374151'
                }}
              >
                {i}
              </button>
            ))}
          </div>
          {selectedScore !== null && (
            <p className="category-label">
              {getNpsCategory(selectedScore).icon} {getNpsCategory(selectedScore).label}
            </p>
          )}
        </div>

        <button className="btn-primary" onClick={handleSubmitNPS}>
          ✓ Submit NPS Score
        </button>

        {submitted && (
          <div className="success-message">✅ NPS score recorded successfully!</div>
        )}
      </div>

      <div className="nps-dashboard">
        <div className="nps-score-card">
          <div className="score-display">
            <h3>NPS Score</h3>
            <div className="score-value">
              {parseFloat(npsData.npsScore).toFixed(2)}
            </div>
            <div className={`trend ${npsData.trend}`}>
              {npsData.trend === 'improving' && '📈 Improving'}
              {npsData.trend === 'declining' && '📉 Declining'}
              {npsData.trend === 'stable' && '➡️ Stable'}
            </div>
          </div>
        </div>

        <div className="categories-breakdown">
          <div className="category-card promoter">
            <div className="category-header">
              <span className="icon">😍</span>
              <h4>Promoters</h4>
            </div>
            <div className="count">{npsData.promoters}</div>
            <div className="percentage">{getCategoryPercentage(npsData.promoters)}%</div>
            <div className="bar">
              <div style={{ width: `${getCategoryPercentage(npsData.promoters)}%` }}></div>
            </div>
          </div>

          <div className="category-card passive">
            <div className="category-header">
              <span className="icon">😐</span>
              <h4>Passives</h4>
            </div>
            <div className="count">{npsData.passives}</div>
            <div className="percentage">{getCategoryPercentage(npsData.passives)}%</div>
            <div className="bar">
              <div style={{ width: `${getCategoryPercentage(npsData.passives)}%` }}></div>
            </div>
          </div>

          <div className="category-card detractor">
            <div className="category-header">
              <span className="icon">😞</span>
              <h4>Detractors</h4>
            </div>
            <div className="count">{npsData.detractors}</div>
            <div className="percentage">{getCategoryPercentage(npsData.detractors)}%</div>
            <div className="bar">
              <div style={{ width: `${getCategoryPercentage(npsData.detractors)}%` }}></div>
            </div>
          </div>
        </div>

        <div className="stats-summary">
          <div className="stat">
            <label>Total Responses</label>
            <value>{npsData.totalResponses}</value>
          </div>
          <div className="stat">
            <label>Response Rate</label>
            <value>{npsData.totalResponses > 0 ? ((npsData.promoters + npsData.passives + npsData.detractors) / npsData.totalResponses * 100).toFixed(1) : 0}%</value>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NPSTracker;
