/**
 * ALAWAEL ERP - PHASE 19: Feedback Dashboard Component
 * Manage and analyze customer feedback
 */

import React, { useState, useEffect } from 'react';
import './FeedbackDashboard.css';

const FeedbackDashboard = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [newFeedback, setNewFeedback] = useState({
    customerId: '',
    content: '',
    category: 'general',
    rating: 5
  });

  useEffect(() => {
    fetchFeedback();
    fetchAnalytics();
  }, [filterStatus, filterCategory]);

  const fetchFeedback = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const response = await fetch(`/api/v1/customer-experience/feedback?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFeedbackList(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const response = await fetch(
        `/api/v1/customer-experience/feedback/analytics?startDate=${startDate}&endDate=${endDate}`
      );
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!newFeedback.customerId || !newFeedback.content) {
      alert('Please fill in customer ID and feedback content');
      return;
    }

    try {
      const response = await fetch('/api/v1/customer-experience/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback)
      });

      if (response.ok) {
        setNewFeedback({
          customerId: '',
          content: '',
          category: 'general',
          rating: 5
        });
        setShowSubmitForm(false);
        fetchFeedback();
        alert('Feedback submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleRespondToFeedback = async () => {
    if (!responseText.trim()) {
      alert('Please enter a response');
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/customer-experience/feedback/${selectedFeedback.id}/respond`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: responseText,
            status: 'acknowledged'
          })
        }
      );

      if (response.ok) {
        setResponseText('');
        setSelectedFeedback(null);
        fetchFeedback();
        alert('Response submitted!');
      }
    } catch (error) {
      console.error('Error responding to feedback:', error);
    }
  };

  const getSentimentColor = (sentiment) => {
    const colors = {
      positive: '#10b981',
      neutral: '#8b5cf6',
      negative: '#ef4444'
    };
    return colors[sentiment] || '#6b7280';
  };

  const getStatusBadge = (status) => {
    const statuses = {
      new: { label: 'New', color: '#3b82f6' },
      acknowledged: { label: 'Acknowledged', color: '#f59e0b' },
      in_progress: { label: 'In Progress', color: '#8b5cf6' },
      resolved: { label: 'Resolved', color: '#10b981' },
      closed: { label: 'Closed', color: '#6b7280' }
    };
    return statuses[status] || statuses.new;
  };

  return (
    <div className="feedback-dashboard">
      <div className="header">
        <h1>💬 Feedback Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowSubmitForm(!showSubmitForm)}
        >
          {showSubmitForm ? '✕ Cancel' : '+ New Feedback'}
        </button>
      </div>

      {showSubmitForm && (
        <div className="feedback-form">
          <h3>Submit Customer Feedback</h3>
          <div className="form-group">
            <label>Customer ID *</label>
            <input
              type="text"
              placeholder="Customer ID"
              value={newFeedback.customerId}
              onChange={(e) => setNewFeedback({...newFeedback, customerId: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Feedback Content *</label>
            <textarea
              placeholder="What is your feedback?"
              rows="4"
              value={newFeedback.content}
              onChange={(e) => setNewFeedback({...newFeedback, content: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={newFeedback.category}
                onChange={(e) => setNewFeedback({...newFeedback, category: e.target.value})}
              >
                <option value="general">General</option>
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="experience">Experience</option>
                <option value="delivery">Delivery</option>
                <option value="support">Support</option>
                <option value="pricing">Pricing</option>
                <option value="quality">Quality</option>
              </select>
            </div>

            <div className="form-group">
              <label>Rating (1-5)</label>
              <select
                value={newFeedback.rating}
                onChange={(e) => setNewFeedback({...newFeedback, rating: parseInt(e.target.value)})}
              >
                <option value="1">⭐ 1 - Poor</option>
                <option value="2">⭐⭐ 2 - Fair</option>
                <option value="3">⭐⭐⭐ 3 - Good</option>
                <option value="4">⭐⭐⭐⭐ 4 - Very Good</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 - Excellent</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSubmitFeedback}>
              ✓ Submit Feedback
            </button>
            <button className="btn-secondary" onClick={() => setShowSubmitForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {analytics && (
        <div className="analytics-section">
          <h2>Analytics (Last 30 Days)</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>Total Feedback</h4>
              <div className="value">{analytics.totalFeedback}</div>
            </div>

            <div className="analytics-card">
              <h4>Average Rating</h4>
              <div className="value">{parseFloat(analytics.averageRating).toFixed(2)} ⭐</div>
            </div>

            <div className="sentiment-cards">
              <div className="sentiment" style={{ borderLeft: `4px solid #10b981` }}>
                <span className="label">Positive</span>
                <span className="count">{analytics.bySentiment?.positive || 0}</span>
              </div>
              <div className="sentiment" style={{ borderLeft: `4px solid #8b5cf6` }}>
                <span className="label">Neutral</span>
                <span className="count">{analytics.bySentiment?.neutral || 0}</span>
              </div>
              <div className="sentiment" style={{ borderLeft: `4px solid #ef4444` }}>
                <span className="label">Negative</span>
                <span className="count">{analytics.bySentiment?.negative || 0}</span>
              </div>
            </div>
          </div>

          {analytics.topIssues && analytics.topIssues.length > 0 && (
            <div className="top-issues">
              <h4>Top Issues</h4>
              <ul>
                {analytics.topIssues.map((issue, idx) => (
                  <li key={idx}>
                    {issue.category}: <strong>{issue.count}</strong> mentions
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="product">Product</option>
          <option value="service">Service</option>
          <option value="experience">Experience</option>
          <option value="delivery">Delivery</option>
          <option value="support">Support</option>
          <option value="pricing">Pricing</option>
          <option value="quality">Quality</option>
        </select>
      </div>

      <div className="feedback-list">
        <h2>Feedback Items</h2>
        {feedbackList.length === 0 ? (
          <p className="empty-state">No feedback found</p>
        ) : (
          feedbackList.map((feedback) => (
            <div key={feedback.id} className="feedback-card">
              <div className="feedback-header">
                <div>
                  <h4>{feedback.customerId}</h4>
                  <p className="feedback-text">{feedback.content}</p>
                </div>
                <div className="badges">
                  <span 
                    className="badge sentiment"
                    style={{ backgroundColor: getSentimentColor(feedback.sentiment) }}
                  >
                    {feedback.sentiment}
                  </span>
                  <span 
                    className="badge status"
                    style={{ backgroundColor: getStatusBadge(feedback.status).color }}
                  >
                    {getStatusBadge(feedback.status).label}
                  </span>
                </div>
              </div>

              <div className="feedback-meta">
                <span>📁 {feedback.category}</span>
                <span>⭐ {feedback.rating || '—'}</span>
                <span>📅 {new Date(feedback.submittedAt).toLocaleDateString()}</span>
              </div>

              <button
                className="btn-secondary"
                onClick={() => setSelectedFeedback(feedback)}
              >
                💬 Respond
              </button>
            </div>
          ))
        )}
      </div>

      {selectedFeedback && (
        <div className="modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Respond to Feedback</h3>
            <p className="original-feedback">{selectedFeedback.content}</p>
            <textarea
              placeholder="Your response..."
              rows="5"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleRespondToFeedback}>
                ✓ Submit Response
              </button>
              <button className="btn-secondary" onClick={() => setSelectedFeedback(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackDashboard;
