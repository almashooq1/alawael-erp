/**
 * Phase 9 React Components
 * UI components for advanced features
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  AlertCircle,
  Shield,
  Workflow,
  TrendingUp,
  Lock,
  Zap
} from 'lucide-react';

// ==================== SECURITY COMPONENTS ====================

export const MFASetupComponent = () => {
  const [qrCode, setQrCode] = useState(null);
  const [error, setError] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [step, setStep] = useState('setup'); // setup, verify, success

  const setupMFA = async () => {
    try {
      const response = await fetch('/api/security/mfa/setup');
      const data = await response.json();
      setQrCode(data.data.qrCode);
      setBackupCodes(data.data.backupCodes);
    } catch (err) {
      setError('Failed to setup MFA');
    }
  };

  const verifyMFA = async (token) => {
    try {
      const response = await fetch('/api/security/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, secret: 'temp-secret' })
      });

      if (response.ok) {
        setStep('success');
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Verification failed');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold">Multi-Factor Authentication</h2>
      </div>

      {step === 'setup' && (
        <div>
          <p className="text-gray-600 mb-4">
            Enable two-factor authentication for enhanced security
          </p>
          <button
            onClick={setupMFA}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Generate QR Code
          </button>
        </div>
      )}

      {step === 'verify' && qrCode && (
        <div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Scan with Authenticator App:
            </p>
            <img
              src={qrCode}
              alt="MFA QR Code"
              className="w-64 h-64"
            />
          </div>

          <input
            type="text"
            placeholder="Enter 6-digit code"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value.length === 6) {
                verifyMFA(e.target.value);
              }
            }}
            className="w-full border rounded px-3 py-2 mb-4"
          />
        </div>
      )}

      {step === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-semibold mb-2">
            ✓ MFA Enabled Successfully
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Save these backup codes in a secure location:
          </p>
          <div className="bg-white rounded p-3 font-mono text-xs space-y-1">
            {backupCodes.map((code, idx) => (
              <div key={idx} className="text-gray-600">
                {code}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

// ==================== WORKFLOW COMPONENTS ====================

export const WorkflowDashboard = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed

  useEffect(() => {
    fetchTasks();
  }, [userId]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/workflows/my-tasks');
      const data = await response.json();
      setTasks(data.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (workflowId, taskId, approval) => {
    try {
      await fetch(`/api/workflows/${workflowId}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval })
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Workflow className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">My Workflow Tasks</h2>
        <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          {tasks.length} pending
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No pending tasks
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{task.name}</h3>
                  <p className="text-sm text-gray-600">
                    {task.description}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    task.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {task.priority}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm text-gray-600">
                  Due:{' '}
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      completeTask(task.workflowId, task.id, true)
                    }
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      completeTask(task.workflowId, task.id, false)
                    }
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== ANALYTICS COMPONENTS ====================

export const AnalyticsDashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [turnoverData, setTurnoverData] = useState([]);
  const [perfData, setPerfData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [kpiRes, turnoverRes, perfRes] = await Promise.all([
        fetch('/api/analytics/kpis'),
        fetch('/api/analytics/turnover-risk'),
        fetch('/api/analytics/performance')
      ]);

      const kpiData = await kpiRes.json();
      const turnoverRiskData = await turnoverRes.json();
      const perfMetrics = await perfRes.json();

      setKpis(kpiData.data);
      setTurnoverData(
        turnoverRiskData.data.highRiskEmployees || []
      );
      setPerfData(perfMetrics.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Employees</p>
          <p className="text-3xl font-bold mt-2">
            {kpis?.summary?.totalEmployees || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Active Employees</p>
          <p className="text-3xl font-bold mt-2 text-green-600">
            {kpis?.summary?.activeEmployees || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Avg Salary</p>
          <p className="text-3xl font-bold mt-2">
            ${(kpis?.hr?.averageSalary || 0).toFixed(0)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Turnover Risk</p>
          <p className="text-3xl font-bold mt-2 text-red-600">
            {turnoverData.length}
          </p>
        </div>
      </div>

      {/* Turnover Risk Alert */}
      {turnoverData.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-900">
                High Turnover Risk Detected
              </h3>
              <p className="text-red-800 text-sm mt-1">
                {turnoverData.length} employees have high turnover risk and
                require management attention
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Distribution Chart */}
      {perfData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">
            Performance Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={perfData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ==================== AI/ML COMPONENTS ====================

export const AIRecommendations = ({ employeeId }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [employeeId]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(
        `/api/ai/recommend-training/${employeeId}`
      );
      const data = await response.json();
      setRecommendations(data.data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading recommendations...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-bold">AI Recommendations</h2>
      </div>

      {!recommendations || recommendations.length === 0 ? (
        <p className="text-gray-600">
          No recommendations at this time
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded"
            >
              <p className="font-semibold text-gray-900">
                {rec.course}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Type: {rec.type}
              </p>
              <span
                className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                  rec.priority === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {rec.priority}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== TURNOVER RISK COMPONENT ====================

export const TurnoverRiskAnalysis = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    try {
      const response = await fetch(
        '/api/analytics/turnover-risk'
      );
      const data = await response.json();
      setRiskData(data.data);
    } catch (err) {
      console.error('Failed to fetch risk data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-red-600" />
        <h2 className="text-xl font-bold">Turnover Risk Analysis</h2>
      </div>

      {riskData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded p-4 border border-red-200">
              <p className="text-red-800 text-sm">HIGH RISK</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {riskData.highRiskEmployees?.length || 0}
              </p>
            </div>

            <div className="bg-orange-50 rounded p-4 border border-orange-200">
              <p className="text-orange-800 text-sm">CRITICAL RISK</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {riskData.criticalRiskEmployees?.length || 0}
              </p>
            </div>
          </div>

          {riskData.highRiskEmployees &&
            riskData.highRiskEmployees.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">At-Risk Employees</h3>
                <div className="space-y-2">
                  {riskData.highRiskEmployees.slice(0, 5).map((emp) => (
                    <div
                      key={emp.employeeId}
                      className="border rounded p-3 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">{emp.name}</p>
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                          {emp.probability}% risk
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {emp.recommendations[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default {
  MFASetupComponent,
  WorkflowDashboard,
  AnalyticsDashboard,
  AIRecommendations,
  TurnoverRiskAnalysis
};
