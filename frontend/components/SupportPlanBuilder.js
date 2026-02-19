/**
 * SupportPlanBuilder.js - Support Plan Creation & Management Component
 * Create and manage comprehensive support plans
 */

import React, { useState, useEffect } from 'react';
import './SupportPlanBuilder.css';

const SupportPlanBuilder = ({ beneficiaryId, onPlanCreated }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [expandedPlan, setExpandedPlan] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, [beneficiaryId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/support-plans?beneficiaryId=${beneficiaryId}`);

      if (!response.ok) throw new Error('Failed to fetch plans');

      const data = await response.json();
      setPlans(data.data.supportPlans || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (planData) => {
    try {
      const response = await fetch('/api/support-plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          ...planData
        })
      });

      if (!response.ok) throw new Error('Failed to create plan');

      const result = await response.json();
      setShowCreateForm(false);
      fetchPlans();
      if (onPlanCreated) onPlanCreated(result.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateGoal = async (planId, goalId, status) => {
    try {
      const response = await fetch(`/api/support-plans/${planId}/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update goal');

      fetchPlans();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScheduleReview = async (planId, reviewDate) => {
    try {
      const response = await fetch(`/api/support-plans/${planId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: reviewDate })
      });

      if (!response.ok) throw new Error('Failed to schedule review');

      fetchPlans();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading support plans...</div>;

  const activePlans = plans.filter(p => p.status === 'ACTIVE');
  const completedPlans = plans.filter(p => p.status === 'COMPLETED');

  return (
    <div className="support-plan-builder">
      <div className="builder-header">
        <h2>Support Plans</h2>
        <div className="header-stats">
          <span className="stat">Active: {activePlans.length}</span>
          <span className="stat">Completed: {completedPlans.length}</span>
          <button
            className="btn-new-plan"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            + Create New Plan
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showCreateForm && (
        <PlanCreationForm
          onSubmit={handleCreatePlan}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Active Plans */}
      <div className="plans-section">
        <h3>Active Plans</h3>
        <div className="plans-list">
          {activePlans.length > 0 ? (
            activePlans.map((plan) => (
              <div key={plan._id} className="plan-card active">
                <div className="plan-header">
                  <div className="plan-title-section">
                    <h4>{plan.planName}</h4>
                    <span className="plan-type">{plan.type.replace(/_/g, ' ')}</span>
                  </div>
                  <button
                    className="expand-btn"
                    onClick={() => setExpandedPlan(expandedPlan === plan._id ? null : plan._id)}
                  >
                    {expandedPlan === plan._id ? '▼' : '▶'}
                  </button>
                </div>

                <div className="plan-meta">
                  <span>Created: {new Date(plan.createdAt).toLocaleDateString()}</span>
                  {plan.nextReviewDate && (
                    <span>Next Review: {new Date(plan.nextReviewDate).toLocaleDateString()}</span>
                  )}
                </div>

                {expandedPlan === plan._id && (
                  <div className="plan-details">
                    <div className="plan-description">
                      <p>{plan.description}</p>
                    </div>

                    {/* Goals Section */}
                    <div className="goals-section">
                      <h5>Goals</h5>
                      <div className="goals-list">
                        {plan.goals && plan.goals.map((goal, idx) => (
                          <div key={idx} className={`goal-item goal-${goal.status}`}>
                            <div className="goal-content">
                              <p className="goal-description">{goal.description}</p>
                              <p className="goal-metrics">Target: {goal.targetMetric}</p>
                            </div>
                            <div className="goal-actions">
                              {goal.status !== 'COMPLETED' && (
                                <button
                                  className="btn-mark-complete"
                                  onClick={() => handleUpdateGoal(plan._id, goal._id || idx, 'COMPLETED')}
                                >
                                  ✓ Mark Complete
                                </button>
                              )}
                              <span className={`status-tag status-${goal.status}`}>{goal.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Interventions */}
                    {plan.interventions && plan.interventions.length > 0 && (
                      <div className="interventions-section">
                        <h5>Interventions</h5>
                        <ul className="interventions-list">
                          {plan.interventions.map((intervention, idx) => (
                            <li key={idx}>{intervention}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Review Scheduling */}
                    <div className="review-section">
                      <h5>Schedule Review</h5>
                      <div className="review-form">
                        <input
                          type="date"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleScheduleReview(plan._id, e.target.value);
                            }
                          }}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    {/* Progress Indicators */}
                    <div className="progress-section">
                      <h5>Progress</h5>
                      <div className="progress-indicators">
                        <div className="indicator">
                          <span>Completion Rate:</span>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${(plan.goals?.filter(g => g.status === 'COMPLETED').length || 0) / (plan.goals?.length || 1) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="no-data">No active plans</p>
          )}
        </div>
      </div>

      {/* Completed Plans */}
      {completedPlans.length > 0 && (
        <div className="plans-section">
          <h3>Completed Plans</h3>
          <div className="plans-list">
            {completedPlans.map((plan) => (
              <div key={plan._id} className="plan-card completed">
                <div className="plan-header">
                  <div className="plan-title-section">
                    <h4>{plan.planName}</h4>
                    <span className="plan-type">{plan.type}</span>
                  </div>
                  <span className="completion-badge">✓ Completed</span>
                </div>
                <div className="plan-meta">
                  <span>Completed: {plan.completedAt ? new Date(plan.completedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function PlanCreationForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    planName: '',
    type: 'academic_support',
    description: '',
    goals: [{ description: '', targetMetric: '', status: 'IN_PROGRESS' }],
    interventions: ['']
  });

  const handleAddGoal = () => {
    setFormData({
      ...formData,
      goals: [...formData.goals, { description: '', targetMetric: '', status: 'IN_PROGRESS' }]
    });
  };

  const handleAddIntervention = () => {
    setFormData({
      ...formData,
      interventions: [...formData.interventions, '']
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="plan-creation-form">
      <h3>Create New Support Plan</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Plan Name *</label>
          <input
            type="text"
            value={formData.planName}
            onChange={(e) => setFormData({...formData, planName: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Type *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="academic_support">Academic Support</option>
            <option value="financial_support">Financial Support</option>
            <option value="social_support">Social Support</option>
            <option value="counseling">Counseling</option>
            <option value="career_development">Career Development</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
          />
        </div>

        <div className="form-section">
          <h4>Goals</h4>
          {formData.goals.map((goal, idx) => (
            <div key={idx} className="goal-input">
              <input
                type="text"
                placeholder="Goal description"
                value={goal.description}
                onChange={(e) => {
                  const newGoals = [...formData.goals];
                  newGoals[idx].description = e.target.value;
                  setFormData({...formData, goals: newGoals});
                }}
              />
              <input
                type="text"
                placeholder="Target metric"
                value={goal.targetMetric}
                onChange={(e) => {
                  const newGoals = [...formData.goals];
                  newGoals[idx].targetMetric = e.target.value;
                  setFormData({...formData, goals: newGoals});
                }}
              />
            </div>
          ))}
          <button type="button" onClick={handleAddGoal} className="btn-add-item">+ Add Goal</button>
        </div>

        <div className="form-section">
          <h4>Interventions</h4>
          {formData.interventions.map((intervention, idx) => (
            <input
              key={idx}
              type="text"
              placeholder="Intervention strategy"
              value={intervention}
              onChange={(e) => {
                const newInterventions = [...formData.interventions];
                newInterventions[idx] = e.target.value;
                setFormData({...formData, interventions: newInterventions});
              }}
            />
          ))}
          <button type="button" onClick={handleAddIntervention} className="btn-add-item">+ Add Intervention</button>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit">Create Plan</button>
          <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default SupportPlanBuilder;
