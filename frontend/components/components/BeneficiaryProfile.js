/**
 * BeneficiaryProfile.js - Beneficiary Profile Component
 * View and manage beneficiary information
 */

import React, { useState, useEffect } from 'react';
import './BeneficiaryProfile.css';

const BeneficiaryProfile = ({ beneficiaryId }) => {
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchBeneficiaryData();
  }, [beneficiaryId]);

  const fetchBeneficiaryData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/beneficiary/${beneficiaryId}`);

      if (!response.ok) throw new Error('Failed to fetch beneficiary data');

      const data = await response.json();
      setBeneficiary(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching beneficiary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async (updatedData) => {
    try {
      const response = await fetch(`/api/beneficiary/${beneficiaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) throw new Error('Failed to update beneficiary');

      const data = await response.json();
      setBeneficiary(data.data);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading beneficiary profile...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={fetchBeneficiaryData}>Retry</button>
      </div>
    );
  }

  if (!beneficiary) {
    return <div className="not-found">Beneficiary not found</div>;
  }

  return (
    <div className="beneficiary-profile">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <img
            src={`https://ui-avatars.com/api/?name=${beneficiary.firstName}+${beneficiary.lastName}`}
            alt="Profile"
          />
        </div>
        <div className="profile-info">
          <h1>{beneficiary.firstName} {beneficiary.lastName}</h1>
          <p className="email">{beneficiary.emailAddress}</p>
          <div className="status-badges">
            <span className={`status-badge status-${beneficiary.academicStatus}`}>
              {beneficiary.academicStatus}
            </span>
            <span className={`benefit-badge benefit-${beneficiary.beneficiaryType}`}>
              {beneficiary.beneficiaryType.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <div className="profile-actions">
          <button
            className="btn-edit"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
          <button className="btn-contact">Contact</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'academic' ? 'active' : ''}`}
          onClick={() => setActiveTab('academic')}
        >
          Academic
        </button>
        <button
          className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          Financial
        </button>
        <button
          className={`tab ${activeTab === 'support' ? 'active' : ''}`}
          onClick={() => setActiveTab('support')}
        >
          Support
        </button>
      </div>

      {/* Content */}
      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="info-grid">
              <div className="info-item">
                <label>National ID</label>
                <p>{beneficiary.nationalIdNumber}</p>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <p>{beneficiary.phoneNumber}</p>
              </div>
              <div className="info-item">
                <label>Date of Birth</label>
                <p>{new Date(beneficiary.dateOfBirth).toLocaleDateString()}</p>
              </div>
              <div className="info-item">
                <label>Gender</label>
                <p>{beneficiary.gender}</p>
              </div>
              <div className="info-item">
                <label>Program</label>
                <p>{beneficiary.program}</p>
              </div>
              <div className="info-item">
                <label>Enrollment Date</label>
                <p>{new Date(beneficiary.enrollmentDate).toLocaleDateString()}</p>
              </div>
              <div className="info-item">
                <label>Current Level</label>
                <p>{beneficiary.currentLevel}</p>
              </div>
              <div className="info-item">
                <label>Gamification Level</label>
                <p>{beneficiary.gamificationLevel}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'academic' && (
          <div className="tab-content">
            <h3>Academic Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Current GPA</label>
                <p className="gpa-value">{beneficiary.currentGPA.toFixed(2)}</p>
              </div>
              <div className="info-item">
                <label>Academic Status</label>
                <p>{beneficiary.academicStatus}</p>
              </div>
              <div className="info-item">
                <label>GPA History</label>
                <div className="gpa-history">
                  {beneficiary.gpaHistory && beneficiary.gpaHistory.map((record, idx) => (
                    <span key={idx} className="gpa-record">
                      {record.semester}: {record.gpa.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="tab-content">
            <h3>Financial & Gamification</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Total Points</label>
                <p className="points-value">{beneficiary.totalPoints}</p>
              </div>
              <div className="info-item">
                <label>Gamification Level</label>
                <p className="level-value">{beneficiary.gamificationLevel}</p>
              </div>
              <div className="info-item">
                <label>Account Status</label>
                <p className={`status-${beneficiary.accountStatus}`}>
                  {beneficiary.accountStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="tab-content">
            <h3>Support Information</h3>
            <div className="info-grid">
              {beneficiary.hasActiveSupportPlan ? (
                <>
                  <div className="info-item">
                    <label>Active Support Plan</label>
                    <p>Yes</p>
                  </div>
                  <div className="info-item">
                    <label>Plan ID</label>
                    <p>{beneficiary.activeSupportPlanId}</p>
                  </div>
                  <button className="btn-view-plan">View Support Plan</button>
                </>
              ) : (
                <p className="no-support">No active support plan</p>
              )}
              {beneficiary.guardian && (
                <div className="guardian-info">
                  <h4>Guardian Information</h4>
                  <p><strong>Name:</strong> {beneficiary.guardian.name}</p>
                  <p><strong>Relationship:</strong> {beneficiary.guardian.relationship}</p>
                  <p><strong>Contact:</strong> {beneficiary.guardian.contact}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiaryProfile;
