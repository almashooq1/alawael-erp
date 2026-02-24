import React, { useState } from 'react';
import axios from 'axios';
import { FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import './Validation.css';

/**
 * Phase 12 - Validation Component
 * Integrates Phase 10 Validator Service with Frontend
 */
const Validation = () => {
  const [validationType, setValidationType] = useState('email');
  const [inputValue, setInputValue] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const validationTypes = [
    { value: 'email', label: '📧 Email', placeholder: 'user@example.com' },
    { value: 'phone', label: '📱 Phone', placeholder: '+20101234567' },
    { value: 'url', label: '🌐 URL', placeholder: 'https://example.com' },
    { value: 'schema', label: '📋 Schema', placeholder: 'Paste JSON object' },
  ];

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setLoading(true);
    setValidationResult(null);

    try {
      let endpoint = `/api/validate/${validationType}`;
      let data = {};

      switch (validationType) {
        case 'email':
          data = { email: inputValue };
          break;
        case 'phone':
          data = { phone: inputValue };
          break;
        case 'url':
          data = { url: inputValue };
          break;
        case 'schema':
          data = JSON.parse(inputValue);
          break;
        default:
          data = { value: inputValue };
      }

      const res = await axios.post(endpoint, data);
      setValidationResult(res.data.data);
    } catch (err) {
      setValidationResult({
        valid: false,
        error: err.response?.data?.message || err.message,
        details: 'Validation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const currentType = validationTypes.find(t => t.value === validationType);

  return (
    <div className="validation-container">
      <header className="validation-header">
        <h1>✔️ Data Validation</h1>
        <p>Validate emails, phone numbers, URLs, and JSON schemas in real-time</p>
      </header>

      {/* Validation Type Selector */}
      <section className="type-selector">
        <div className="type-buttons">
          {validationTypes.map(type => (
            <button
              key={type.value}
              className={`type-btn ${validationType === type.value ? 'active' : ''}`}
              onClick={() => {
                setValidationType(type.value);
                setInputValue('');
                setValidationResult(null);
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {/* Input Form */}
      <section className="validation-form-section">
        <form onSubmit={handleValidate} className="validation-form">
          {validationType === 'schema' ? (
            <textarea
              placeholder={currentType.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="validation-textarea"
              rows="6"
            />
          ) : (
            <input
              type="text"
              placeholder={currentType.placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="validation-input"
            />
          )}

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={loading || !inputValue.trim()}
          >
            {loading ? '⏳ Validating...' : '✔️ Validate'}
          </button>
        </form>
      </section>

      {/* Validation Result */}
      {validationResult && (
        <section className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
          <div className="result-header">
            {validationResult.valid ? (
              <>
                <FiCheckCircle className="result-icon success" />
                <h2>✅ Valid</h2>
              </>
            ) : (
              <>
                <FiXCircle className="result-icon error" />
                <h2>❌ Invalid</h2>
              </>
            )}
          </div>

          {validationResult.error && (
            <div className="error-message">
              <FiAlertCircle />
              <p>{validationResult.error}</p>
            </div>
          )}

          {validationResult.details && (
            <div className="result-details">
              <h3>Details:</h3>
              <div className="details-content">
                {typeof validationResult.details === 'object' ? (
                  <pre>{JSON.stringify(validationResult.details, null, 2)}</pre>
                ) : (
                  <p>{validationResult.details}</p>
                )}
              </div>
            </div>
          )}

          {validationResult.format && (
            <div className="result-info">
              <p><strong>Format:</strong> {validationResult.format}</p>
            </div>
          )}

          {validationResult.confidence && (
            <div className="confidence-meter">
              <label>Confidence</label>
              <div className="meter">
                <div
                  className="meter-fill"
                  style={{ width: `${validationResult.confidence * 100}%` }}
                ></div>
              </div>
              <span>{Math.round(validationResult.confidence * 100)}%</span>
            </div>
          )}
        </section>
      )}

      {/* Quick Tips */}
      <section className="validation-tips">
        <h3>💡 Quick Tips</h3>
        <div className="tips-grid">
          <div className="tip">
            <h4>📧 Email</h4>
            <p>Enter a valid email address. Checks for proper format and common domains.</p>
          </div>
          <div className="tip">
            <h4>📱 Phone</h4>
            <p>Enter phone with country code. Supports international formats (+20, +966, etc.).</p>
          </div>
          <div className="tip">
            <h4>🌐 URL</h4>
            <p>Enter a complete URL including protocol (http:// or https://).</p>
          </div>
          <div className="tip">
            <h4>📋 Schema</h4>
            <p>Validate JSON objects against predefined schemas. Checks structure and types.</p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="validation-stats">
        <h3>📊 Validation Statistics</h3>
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-label">Total Validations</span>
            <span className="stat-value">--</span>
          </div>
          <div className="stat">
            <span className="stat-label">Success Rate</span>
            <span className="stat-value">98%</span>
          </div>
          <div className="stat">
            <span className="stat-label">Avg Time</span>
            <span className="stat-value">5ms</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Validation;
