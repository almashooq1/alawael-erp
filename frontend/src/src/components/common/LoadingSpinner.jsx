/**
 * LoadingSpinner.jsx - Loading Spinner Component
 * مكون العجلة الدوارة للتحميل
 */

import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'جاري التحميل...' }) => {
  return (
    <div className="loading-spinner-overlay">
      <div className="loading-spinner-container">
        <div className="spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
