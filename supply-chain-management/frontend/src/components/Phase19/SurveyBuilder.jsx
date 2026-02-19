/**
 * ALAWAEL ERP - PHASE 19: Survey Builder Component
 * Create, manage, and track customer satisfaction surveys
 */

import React, { useState } from 'react';
import './SurveyBuilder.css';

const SurveyBuilder = () => {
  const [surveys, setSurveys] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    questions: [{ id: 1, text: '', type: 'rating' }],
    targetAudience: [],
    type: 'general'
  });
  const [newQuestion, setNewQuestion] = useState('');

  const questionTypes = [
    { value: 'rating', label: '⭐ Rating (1-5)' },
    { value: 'yesno', label: '✓ Yes/No' },
    { value: 'text', label: '📝 Text' },
    { value: 'multiselect', label: '☑️ Multiple Choice' }
  ];

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      const newQ = {
        id: Math.max(...formData.questions.map(q => q.id), 0) + 1,
        text: newQuestion,
        type: 'rating'
      };
      setFormData({
        ...formData,
        questions: [...formData.questions, newQ]
      });
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (id) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter(q => q.id !== id)
    });
  };

  const handleCreateSurvey = async () => {
    if (!formData.title.trim()) {
      alert('Survey title is required');
      return;
    }

    try {
      const response = await fetch('/api/v1/customer-experience/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newSurvey = await response.json();
        setSurveys([...surveys, newSurvey.data]);
        setFormData({
          title: '',
          description: '',
          questions: [{ id: 1, text: '', type: 'rating' }],
          targetAudience: [],
          type: 'general'
        });
        setShowForm(false);
        alert('Survey created successfully!');
      }
    } catch (error) {
      console.error('Error creating survey:', error);
    }
  };

  return (
    <div className="survey-builder">
      <div className="header">
        <h1>📊 Survey Manager</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ New Survey'}
        </button>
      </div>

      {showForm && (
        <div className="survey-form">
          <div className="form-group">
            <label>Survey Title *</label>
            <input
              type="text"
              placeholder="e.g., Customer Satisfaction Survey"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Survey description and instructions"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="general">General Feedback</option>
              <option value="nps">NPS Survey</option>
              <option value="satisfaction">Satisfaction</option>
              <option value="csat">CSAT</option>
            </select>
          </div>

          <div className="questions-section">
            <h3>Questions</h3>
            {formData.questions.map((q) => (
              <div key={q.id} className="question-item">
                <select
                  value={q.type}
                  onChange={(e) => {
                    const updated = formData.questions.map(qu =>
                      qu.id === q.id ? {...qu, type: e.target.value} : qu
                    );
                    setFormData({...formData, questions: updated});
                  }}
                >
                  {questionTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Question text"
                  value={q.text}
                  onChange={(e) => {
                    const updated = formData.questions.map(qu =>
                      qu.id === q.id ? {...qu, text: e.target.value} : qu
                    );
                    setFormData({...formData, questions: updated});
                  }}
                />
                <button
                  className="btn-danger"
                  onClick={() => handleRemoveQuestion(q.id)}
                >
                  🗑️
                </button>
              </div>
            ))}

            <div className="add-question">
              <input
                type="text"
                placeholder="New question..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
              />
              <button className="btn-secondary" onClick={handleAddQuestion}>
                + Add Question
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreateSurvey}>
              ✓ Create Survey
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="surveys-list">
        <h2>Active Surveys ({surveys.length})</h2>
        {surveys.length === 0 ? (
          <p className="empty-state">No surveys yet. Create one to get started!</p>
        ) : (
          surveys.map(survey => (
            <div key={survey.id} className="survey-card">
              <div className="survey-header">
                <h3>{survey.title}</h3>
                <span className="status active">Active</span>
              </div>
              <p className="survey-type">{survey.type.toUpperCase()}</p>
              <div className="survey-stats">
                <span>📋 {survey.questions.length} Questions</span>
                <span>👥 {survey.targetAudience.length} Target Audience</span>
                <span>📊 {survey.responseCount} Responses ({survey.completionRate}%)</span>
              </div>
              <div className="survey-actions">
                <button className="btn-secondary">📊 View Results</button>
                <button className="btn-secondary">📤 Share Survey</button>
                <button className="btn-danger">🗑️ Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SurveyBuilder;
