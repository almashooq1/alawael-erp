import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('🔄 Loading...');
  const [predictions, setPredictions] = useState(null);
  const [report, setReport] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const res = await fetch('http://localhost:3005/health');
      const data = await res.json();
      setStatus(`✅ Connected - ${data.status}`);
    } catch (err) {
      setStatus('❌ Backend Not Connected');
    }
  };

  const testPrediction = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3005/api/predictions/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historicalData: { jan: 50000, feb: 52000, mar: 54000, apr: 56000 },
        }),
      });
      const data = await res.json();
      setPredictions(data);
    } catch (err) {
      console.error(err);
      setPredictions({ error: err.message });
    }
    setLoading(false);
  };

  const testReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3005/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Q1 Performance Report',
          type: 'performance',
        }),
      });
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error(err);
      setReport({ error: err.message });
    }
    setLoading(false);
  };

  const testNotification = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3005/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_demo',
          notification: {
            title: 'Test Notification',
            message: 'This is a test from the frontend!',
            channels: ['email', 'in-app', 'push'],
          },
        }),
      });
      const data = await res.json();
      setNotification(data);
    } catch (err) {
      console.error(err);
      setNotification({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 ERP System</h1>
        <p className="status">
          Backend Status: <strong>{status}</strong>
        </p>

        <div className="button-group">
          <button onClick={testPrediction} disabled={loading}>
            🤖 Test AI Prediction
          </button>
          <button onClick={testReport} disabled={loading}>
            📊 Test Report Generation
          </button>
          <button onClick={testNotification} disabled={loading}>
            🔔 Test Notification
          </button>
        </div>

        {loading && <div className="loader">⏳ Loading...</div>}

        {predictions && (
          <div className="result-box">
            <h3>🤖 AI Prediction Result:</h3>
            <pre>{JSON.stringify(predictions, null, 2)}</pre>
          </div>
        )}

        {report && (
          <div className="result-box">
            <h3>📊 Report Result:</h3>
            <pre>{JSON.stringify(report, null, 2)}</pre>
          </div>
        )}

        {notification && (
          <div className="result-box">
            <h3>🔔 Notification Result:</h3>
            <pre>{JSON.stringify(notification, null, 2)}</pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
