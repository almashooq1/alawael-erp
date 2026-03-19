/**
 * AchievementTracker.js - Achievement and Skills Tracking Component
 * Track achievements, badges, and skill development
 */

import React, { useState, useEffect } from 'react';
import './AchievementTracker.css';

const AchievementTracker = ({ beneficiaryId }) => {
  const [achievements, setAchievements] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalAchievements: 0,
    skillsCount: 0,
    badgesEarned: 0
  });

  useEffect(() => {
    fetchData();
  }, [beneficiaryId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [achRes, skillRes] = await Promise.all([
        fetch(`/api/achievements?beneficiaryId=${beneficiaryId}`),
        fetch(`/api/skills?beneficiaryId=${beneficiaryId}`)
      ]);

      if (!achRes.ok || !skillRes.ok) throw new Error('Failed to fetch data');

      const achData = await achRes.json();
      const skillData = await skillRes.json();

      setAchievements(achData.data.achievements || []);
      setSkills(skillData.data.skills || []);

      // Calculate stats
      const totalPoints = (achData.data.achievements || []).reduce((sum, a) => sum + (a.points || 0), 0);
      const badgesEarned = (achData.data.achievements || []).filter(a => a.badge).length;

      setStats({
        totalPoints,
        totalAchievements: (achData.data.achievements || []).length,
        skillsCount: (skillData.data.skills || []).length,
        badgesEarned
      });

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAchievement = async (formData) => {
    try {
      const response = await fetch('/api/achievements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to add achievement');

      setShowAddForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateSkill = async (skillId, proficiencyLevel) => {
    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proficiencyLevel })
      });

      if (!response.ok) throw new Error('Failed to update skill');

      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getSortedAchievements = () => {
    const sorted = [...achievements];
    if (sortBy === 'recent') {
      return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === 'points') {
      return sorted.sort((a, b) => (b.points || 0) - (a.points || 0));
    }
    return sorted;
  };

  const getSkillColor = (level) => {
    const levels = { 'beginner': '#ff6b6b', 'intermediate': '#ffd93d', 'advanced': '#6bcf7f' };
    return levels[level] || '#999';
  };

  if (loading) return <div className="loading">Loading achievements...</div>;

  return (
    <div className="achievement-tracker">
      <div className="tracker-header">
        <h2>Achievements & Skills</h2>
        <button
          className="btn-add"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + Record Achievement
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalPoints}</div>
          <div className="stat-label">Total Points</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAchievements}</div>
          <div className="stat-label">Achievements</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.badgesEarned}</div>
          <div className="stat-label">Badges Earned</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.skillsCount}</div>
          <div className="stat-label">Skills Tracked</div>
        </div>
      </div>

      {showAddForm && (
        <AchievementForm
          onSubmit={handleAddAchievement}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Achievements Section */}
      <div className="section">
        <div className="section-header">
          <h3>Recent Achievements</h3>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Most Recent</option>
            <option value="points">Highest Points</option>
          </select>
        </div>

        <div className="achievements-grid">
          {getSortedAchievements().length > 0 ? (
            getSortedAchievements().map((achievement) => (
              <div key={achievement._id} className="achievement-card">
                <div className="achievement-icon">
                  {achievement.badge && <span className="badge-icon">🏆</span>}
                  {achievement.icon && <span>{achievement.icon}</span>}
                </div>
                <div className="achievement-content">
                  <h4>{achievement.title}</h4>
                  <p className="description">{achievement.description}</p>
                  {achievement.points && (
                    <span className="points-badge">+{achievement.points} pts</span>
                  )}
                </div>
                <div className="achievement-date">
                  {new Date(achievement.date).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No achievements yet</p>
          )}
        </div>
      </div>

      {/* Skills Section */}
      <div className="section">
        <h3>Skills Development</h3>
        <div className="skills-container">
          {skills.length > 0 ? (
            skills.map((skill) => (
              <div key={skill._id} className="skill-item">
                <div className="skill-header">
                  <h4>{skill.skillName}</h4>
                  <span className="proficiency-badge" style={{ backgroundColor: getSkillColor(skill.proficiencyLevel) }}>
                    {skill.proficiencyLevel.toUpperCase()}
                  </span>
                </div>
                <div className="skill-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${skill.proficiencyLevel === 'beginner' ? 33 : skill.proficiencyLevel === 'intermediate' ? 66 : 100}%`,
                        backgroundColor: getSkillColor(skill.proficiencyLevel)
                      }}
                    ></div>
                  </div>
                </div>
                <div className="skill-meta">
                  <p className="skill-category">{skill.category}</p>
                  {skill.lastAssessed && (
                    <p className="last-assessed">
                      Last assessed: {new Date(skill.lastAssessed).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="skill-actions">
                  <button
                    className="btn-upgrade"
                    onClick={() => {
                      const nextLevel = skill.proficiencyLevel === 'beginner' ? 'intermediate' : 'advanced';
                      handleUpdateSkill(skill._id, nextLevel);
                    }}
                    disabled={skill.proficiencyLevel === 'advanced'}
                  >
                    Upgrade Skills
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No skills tracked yet</p>
          )}
        </div>
      </div>

      {/* Gamification Panel */}
      <div className="gamification-panel">
        <h3>🎮 Gamification</h3>
        <div className="leaderboard-preview">
          <p>Your rank in cohort: <strong>Top 15%</strong></p>
          <p>Next milestone: <strong>500 points (Current: {stats.totalPoints})</strong></p>
          <div className="milestone-progress">
            <div
              className="milestone-bar"
              style={{ width: `${Math.min((stats.totalPoints / 500) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

function AchievementForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'academic',
    points: 10,
    badge: false,
    icon: '⭐'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="achievement-form">
      <h3>Record New Achievement</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="community">Community</option>
              <option value="leadership">Leadership</option>
              <option value="skills">Skills</option>
            </select>
          </div>
          <div className="form-group">
            <label>Points</label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({...formData, points: parseInt(e.target.value)})}
            />
          </div>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={formData.badge}
              onChange={(e) => setFormData({...formData, badge: e.target.checked})}
            />
            Award Badge
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-submit">Record Achievement</button>
          <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default AchievementTracker;
