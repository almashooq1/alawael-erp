/**
 * ProjectTracker Component
 * مكون متتبع المشاريع
 * 
 * تتبع المشاريع والمراحل والمهام والموارد والميزانيات
 */

import React, { useState, useEffect } from 'react';
import './ProjectTracker.css';

const ProjectTracker = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // list, gantt, analytics
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: 0,
    status: 'planning'
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/list');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      setErrorMessage('Error fetching projects: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name || !newProject.startDate || !newProject.endDate) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Project created successfully! ✅');
        setNewProject({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          budget: 0,
          status: 'planning'
        });
        fetchProjects();
      } else {
        setErrorMessage('Failed to create project!');
      }
    } catch (error) {
      setErrorMessage('Error creating project: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProjectStatus = async (projectId, newStatus) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setSuccessMessage('Project status updated! ✅');
        fetchProjects();
      }
    } catch (error) {
      setErrorMessage('Error updating status: ' + error.message);
    }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccessMessage('Project deleted! ✅');
        setSelectedProject(null);
        fetchProjects();
      }
    } catch (error) {
      setErrorMessage('Error deleting project: ' + error.message);
    }
  };

  const getProgressPercentage = (project) => {
    if (!project.tasks) return 0;
    const completedTasks = project.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  const getStatusColor = (status) => {
    const colors = {
      'planning': '#95a5a6',
      'in-progress': '#3498db',
      'on-hold': '#f39c12',
      'completed': '#27ae60',
      'cancelled': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusEmoji = (status) => {
    const emojis = {
      'planning': '📋',
      'in-progress': '⚙️',
      'on-hold': '⏸️',
      'completed': '✅',
      'cancelled': '❌'
    };
    return emojis[status] || '❓';
  };

  return (
    <div className="project-tracker">
      <h1>📊 Project Tracker</h1>

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

      {/* View Mode Selector */}
      <div className="view-selector">
        <button
          className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          📋 List View
        </button>
        <button
          className={`view-btn ${viewMode === 'gantt' ? 'active' : ''}`}
          onClick={() => setViewMode('gantt')}
        >
          📈 Gantt Chart
        </button>
        <button
          className={`view-btn ${viewMode === 'analytics' ? 'active' : ''}`}
          onClick={() => setViewMode('analytics')}
        >
          📊 Analytics
        </button>
      </div>

      {/* Create New Project Section */}
      <div className="create-project-panel">
        <h2>➕ Create New Project</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Project Name:</label>
            <input
              type="text"
              placeholder="Enter project name"
              value={newProject.name}
              onChange={(e) =>
                setNewProject(prev => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={newProject.startDate}
              onChange={(e) =>
                setNewProject(prev => ({ ...prev, startDate: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label>End Date:</label>
            <input
              type="date"
              value={newProject.endDate}
              onChange={(e) =>
                setNewProject(prev => ({ ...prev, endDate: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label>Budget:</label>
            <input
              type="number"
              placeholder="0"
              value={newProject.budget}
              onChange={(e) =>
                setNewProject(prev => ({
                  ...prev,
                  budget: parseFloat(e.target.value)
                }))
              }
            />
          </div>

          <div className="form-group full-width">
            <label>Description:</label>
            <textarea
              placeholder="Project description"
              value={newProject.description}
              onChange={(e) =>
                setNewProject(prev => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label>Status:</label>
            <select
              value={newProject.status}
              onChange={(e) =>
                setNewProject(prev => ({ ...prev, status: e.target.value }))
              }
            >
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>

        <button
          onClick={createProject}
          className="btn btn-primary"
          disabled={loading}
        >
          🚀 Create Project
        </button>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="projects-section">
          <h2>All Projects ({projects.length})</h2>
          <div className="projects-grid">
            {projects.length > 0 ? (
              projects.map(project => (
                <div
                  key={project.id}
                  className={`project-card ${selectedProject?.id === project.id ? 'selected' : ''}`}
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="project-header">
                    <h3>{project.name}</h3>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(project.status) }}>
                      {getStatusEmoji(project.status)} {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="description">{project.description}</p>
                  )}

                  <div className="project-meta">
                    <div className="meta-item">
                      <span className="label">Start:</span>
                      <span className="value">
                        {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="label">End:</span>
                      <span className="value">
                        {new Date(project.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="progress-section">
                    <div className="progress-header">
                      <span>Progress</span>
                      <span className="progress-percent">
                        {getProgressPercentage(project)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${getProgressPercentage(project)}%`,
                          backgroundColor: getStatusColor(project.status)
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Budget Info */}
                  {project.budget > 0 && (
                    <div className="budget-info">
                      <span>💰 Budget:</span>
                      <span>${project.budget.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="project-stats">
                    {project.tasks && (
                      <div className="stat">
                        <span className="stat-value">{project.tasks.length}</span>
                        <span className="stat-label">Tasks</span>
                      </div>
                    )}
                    {project.team && (
                      <div className="stat">
                        <span className="stat-value">{project.team.length}</span>
                        <span className="stat-label">Team Members</span>
                      </div>
                    )}
                    {project.risks && (
                      <div className="stat">
                        <span className="stat-value">{project.risks.length}</span>
                        <span className="stat-label">Risks</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="project-actions">
                    <select
                      value={project.status}
                      onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="planning">Planning</option>
                      <option value="in-progress">In Progress</option>
                      <option value="on-hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="btn btn-danger btn-sm"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No projects yet. Create one to get started! 🚀</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gantt Chart View */}
      {viewMode === 'gantt' && (
        <div className="gantt-section">
          <h2>Gantt Chart View</h2>
          <div className="gantt-chart">
            {projects.length > 0 ? (
              <div className="gantt-container">
                <div className="gantt-labels">
                  {projects.slice(0, 10).map(project => (
                    <div key={project.id} className="gantt-label">
                      {project.name}
                    </div>
                  ))}
                </div>
                <div className="gantt-bars">
                  {projects.slice(0, 10).map(project => {
                    const start = new Date(project.startDate);
                    const end = new Date(project.endDate);
                    const startPos = (start - new Date(projects[0].startDate)) / (1000 * 60 * 60 * 24) * 20;
                    const barWidth = (end - start) / (1000 * 60 * 60 * 24) * 20;

                    return (
                      <div key={project.id} className="gantt-row">
                        <div
                          className="gantt-bar"
                          style={{
                            marginLeft: `${startPos}px`,
                            width: `${barWidth}px`,
                            backgroundColor: getStatusColor(project.status)
                          }}
                          title={project.name}
                        >
                          <span className="bar-label">{getProgressPercentage(project)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="empty-state">No projects to display in Gantt chart.</p>
            )}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="analytics-section">
          <h2>Project Analytics</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>📊 Total Projects</h3>
              <p className="big-number">{projects.length}</p>
            </div>

            <div className="analytics-card">
              <h3>✅ Completed</h3>
              <p className="big-number">
                {projects.filter(p => p.status === 'completed').length}
              </p>
            </div>

            <div className="analytics-card">
              <h3>⚙️ In Progress</h3>
              <p className="big-number">
                {projects.filter(p => p.status === 'in-progress').length}
              </p>
            </div>

            <div className="analytics-card">
              <h3>💰 Total Budget</h3>
              <p className="big-number">
                ${projects.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
              </p>
            </div>

            <div className="analytics-card">
              <h3>👥 Team Members</h3>
              <p className="big-number">
                {new Set(projects.flatMap(p => p.team || [])).size}
              </p>
            </div>

            <div className="analytics-card">
              <h3>⚠️ Active Risks</h3>
              <p className="big-number">
                {projects.reduce((sum, p) => sum + (p.risks?.length || 0), 0)}
              </p>
            </div>

            <div className="analytics-card full-width">
              <h3>📈 Average Progress</h3>
              <p className="big-number">
                {projects.length > 0
                  ? Math.round(
                      projects.reduce((sum, p) => sum + getProgressPercentage(p), 0) /
                      projects.length
                    )
                  : 0}%
              </p>
            </div>

            <div className="analytics-card full-width">
              <h3>🎯 Status Distribution</h3>
              <div className="status-distribution">
                {['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'].map(status => (
                  <div key={status} className="status-item">
                    <span>{status}</span>
                    <span className="count">
                      {projects.filter(p => p.status === status).length}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Panel */}
      {selectedProject && (
        <div className="project-details-panel">
          <h2>{selectedProject.name}</h2>

          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                {getStatusEmoji(selectedProject.status)} {selectedProject.status}
              </span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Duration:</span>
              <span className="detail-value">
                {selectedProject.startDate} to {selectedProject.endDate}
              </span>
            </div>

            {selectedProject.description && (
              <div className="detail-item full-width">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{selectedProject.description}</span>
              </div>
            )}

            {selectedProject.budget > 0 && (
              <div className="detail-item">
                <span className="detail-label">Budget:</span>
                <span className="detail-value">${selectedProject.budget.toLocaleString()}</span>
              </div>
            )}

            {selectedProject.tasks && selectedProject.tasks.length > 0 && (
              <div className="detail-item full-width">
                <span className="detail-label">Tasks ({selectedProject.tasks.length}):</span>
                <div className="tasks-list">
                  {selectedProject.tasks.slice(0, 5).map((task, idx) => (
                    <div key={idx} className="task-item">
                      <span className="task-status" style={{
                        color: task.status === 'completed' ? '#27ae60' : '#3498db'
                      }}>
                        {task.status === 'completed' ? '✅' : '⏳'}
                      </span>
                      <span>{task.name}</span>
                    </div>
                  ))}
                  {selectedProject.tasks.length > 5 && (
                    <p className="more-items">+{selectedProject.tasks.length - 5} more tasks</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedProject(null)}
            className="btn btn-secondary"
          >
            Close Details
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectTracker;
