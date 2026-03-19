/**
 * Disability Rehabilitation Module
 * وحدة تأهيل ذوي الإعاقة الرئيسية
 *
 * @module pages/DisabilityRehabilitation
 * @description وحدة شاملة لإدارة برامج تأهيل ذوي الإعاقة
 * @version 1.0.0
 * @date 2026-01-19
 */

import React, { useState, useContext } from 'react';
import { Container, Row, Col, Nav, Navbar } from 'react-bootstrap';
import Dashboard from './Dashboard';
import CreateProgram from './CreateProgram';
import ProgramDetails from './ProgramDetails';
import { AuthContext } from '../../context/AuthContext';
import './DisabilityRehabilitation.css';

const DisabilityRehabilitation = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const { user } = useContext(AuthContext);

  // التحقق من الصلاحيات
  const hasAccess = () => {
    const allowedRoles = ['admin', 'therapist', 'case_manager', 'assessor', 'manager'];
    return user && allowedRoles.includes(user.role);
  };

  const handleCreateSuccess = program => {
    setActiveTab('dashboard');
  };

  const handleViewProgram = programId => {
    setSelectedProgramId(programId);
    setActiveTab('details');
  };

  const handleBackFromDetails = () => {
    setActiveTab('dashboard');
    setSelectedProgramId(null);
  };

  if (!hasAccess()) {
    return (
      <Container className="py-5 text-center">
        <h3 className="text-danger">عذراً، ليس لديك صلاحية للوصول إلى هذه الوحدة</h3>
        <p className="text-muted">يرجى التواصل مع المسؤول للحصول على الصلاحيات المطلوبة</p>
      </Container>
    );
  }

  return (
    <div className="disability-rehabilitation-module">
      {/* شريط التنقل العلوي */}
      <Navbar bg="primary" expand="lg" sticky="top" className="navbar-custom">
        <Container fluid>
          <Navbar.Brand href="#" className="text-white fw-bold">
            🏥 نظام تأهيل ذوي الإعاقة
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link
                onClick={() => setActiveTab('dashboard')}
                className={activeTab === 'dashboard' ? 'active' : ''}
              >
                📊 لوحة التحكم
              </Nav.Link>
              <Nav.Link
                onClick={() => setActiveTab('create')}
                className={activeTab === 'create' ? 'active' : ''}
              >
                ➕ برنامج جديد
              </Nav.Link>
              <Nav.Link
                onClick={() => setActiveTab('api')}
                className={activeTab === 'api' ? 'active' : ''}
              >
                🔌 توثيق API
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* المحتوى الرئيسي */}
      <div className="module-content">
        {/* لوحة التحكم */}
        {activeTab === 'dashboard' && <Dashboard />}

        {/* إنشاء برنامج جديد */}
        {activeTab === 'create' && (
          <Container className="py-4">
            <CreateProgram
              onSuccess={handleCreateSuccess}
              onCancel={() => setActiveTab('dashboard')}
            />
          </Container>
        )}

        {/* تفاصيل البرنامج */}
        {activeTab === 'details' && selectedProgramId && (
          <ProgramDetails programId={selectedProgramId} onBack={handleBackFromDetails} />
        )}

        {/* توثيق API */}
        {activeTab === 'api' && (
          <Container className="py-4">
            <APIDocumentation />
          </Container>
        )}
      </div>
    </div>
  );
};

/**
 * API Documentation Component
 */
const APIDocumentation = () => {
  const endpoints = [
    {
      method: 'POST',
      path: '/programs',
      description: 'إنشاء برنامج تأهيلي جديد',
      access: 'admin, therapist, case_manager',
      params: {
        program_name_ar: 'string (required)',
        beneficiary_id: 'string (required)',
        disability_info: 'object (required)',
        rehabilitation_goals: 'array (required)',
        services: 'array (required)',
        program_start_date: 'date (required)',
      },
    },
    {
      method: 'GET',
      path: '/programs',
      description: 'جلب جميع البرامج مع الفلترة',
      access: 'authenticated users',
      params: {
        status: 'string (optional)',
        disability_type: 'string (optional)',
        search: 'string (optional)',
        page: 'number (optional)',
        limit: 'number (optional)',
      },
    },
    {
      method: 'GET',
      path: '/programs/:id',
      description: 'جلب تفاصيل برنامج محدد',
      access: 'authenticated users',
      params: {},
    },
    {
      method: 'PUT',
      path: '/programs/:id',
      description: 'تحديث برنامج تأهيلي',
      access: 'admin, therapist, case_manager',
      params: {
        program_name_ar: 'string (optional)',
        program_status: 'string (optional)',
        notes: 'string (optional)',
      },
    },
    {
      method: 'DELETE',
      path: '/programs/:id',
      description: 'حذف برنامج (حذف ناعم)',
      access: 'admin only',
      params: {},
    },
    {
      method: 'POST',
      path: '/programs/:id/sessions',
      description: 'إضافة جلسة جديدة',
      access: 'admin, therapist, case_manager',
      params: {
        session_date: 'date (required)',
        service_type: 'string (required)',
        duration_minutes: 'number (required)',
        attendance: 'string (required: present, absent, cancelled)',
        notes: 'string (optional)',
      },
    },
    {
      method: 'PUT',
      path: '/programs/:id/goals/:goalId',
      description: 'تحديث حالة هدف تأهيلي',
      access: 'admin, therapist, case_manager',
      params: {
        status: 'string (required)',
        progress_percentage: 'number (required)',
        notes: 'string (optional)',
      },
    },
    {
      method: 'POST',
      path: '/programs/:id/assessments',
      description: 'إضافة تقييم جديد',
      access: 'admin, therapist, assessor, case_manager',
      params: {
        assessment_date: 'date (required)',
        assessment_type: 'string (required)',
        findings: 'string (required)',
        score: 'number (required)',
        recommendations: 'string (optional)',
      },
    },
    {
      method: 'PUT',
      path: '/programs/:id/complete',
      description: 'إكمال برنامج تأهيلي',
      access: 'admin, case_manager',
      params: {
        completion_notes: 'string (optional)',
      },
    },
    {
      method: 'GET',
      path: '/statistics',
      description: 'جلب إحصائيات النظام',
      access: 'admin, manager, case_manager',
      params: {
        disability_type: 'string (optional)',
        date_from: 'date (optional)',
        date_to: 'date (optional)',
      },
    },
    {
      method: 'GET',
      path: '/performance/:year/:month',
      description: 'جلب تقرير الأداء الشهري',
      access: 'admin, manager, case_manager',
      params: {},
    },
    {
      method: 'GET',
      path: '/beneficiary/:beneficiaryId/programs',
      description: 'جلب جميع برامج المستفيد',
      access: 'authenticated users',
      params: {},
    },
    {
      method: 'GET',
      path: '/programs/:id/report',
      description: 'جلب تقرير مفصل للبرنامج',
      access: 'authenticated users',
      params: {},
    },
    {
      method: 'GET',
      path: '/info',
      description: 'جلب معلومات النظام والكتالوجات',
      access: 'public',
      params: {},
    },
  ];

  return (
    <div className="api-documentation">
      <h2 className="mb-4">📚 توثيق API - نظام تأهيل ذوي الإعاقة</h2>

      <div className="api-intro mb-5">
        <h5>معلومات أساسية</h5>
        <ul>
          <li>
            <strong>Base URL:</strong>{' '}
            <code>http://localhost:3001/api/v1/disability-rehabilitation</code>
          </li>
          <li>
            <strong>Authentication:</strong> Bearer Token في Header
          </li>
          <li>
            <strong>Content-Type:</strong> application/json
          </li>
          <li>
            <strong>Response Format:</strong> {'{ success, data, message, pagination }'}
          </li>
        </ul>
      </div>

      <div className="endpoints">
        <h5 className="mb-4">قائمة النقاط النهائية (Endpoints)</h5>

        {endpoints.map((endpoint, index) => (
          <div key={index} className="endpoint-card mb-4">
            <div className="endpoint-header">
              <span className={`method badge bg-${getMethodColor(endpoint.method)}`}>
                {endpoint.method}
              </span>
              <code className="endpoint-path">{endpoint.path}</code>
              <span className="endpoint-access ms-auto">
                <small className="text-muted">الوصول: {endpoint.access}</small>
              </span>
            </div>

            <div className="endpoint-body">
              <p className="endpoint-description">{endpoint.description}</p>

              {Object.keys(endpoint.params).length > 0 && (
                <div className="endpoint-params">
                  <strong>المعاملات (Parameters):</strong>
                  <ul>
                    {Object.entries(endpoint.params).map(([key, type]) => (
                      <li key={key}>
                        <code>{key}</code> - <small>{type}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* أمثلة الاستخدام */}
      <div className="usage-examples mt-5">
        <h5 className="mb-4">📖 أمثلة الاستخدام</h5>

        <div className="example-card mb-4">
          <h6>مثال 1: إنشاء برنامج جديد</h6>
          <pre className="example-code">{`POST /programs
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "program_name_ar": "برنامج تأهيل حركي",
  "program_name_en": "Physical Rehabilitation Program",
  "beneficiary_id": "BEN-001",
  "beneficiary_name_ar": "أحمد علي",
  "beneficiary_date_of_birth": "2010-01-15",
  "disability_info": {
    "primary_disability": "physical",
    "severity": "moderate",
    "diagnosis_date": "2024-01-01"
  },
  "rehabilitation_goals": [
    {
      "goal_name_ar": "تحسين القدرات الحركية",
      "goal_category": "mobility",
      "priority": "high"
    }
  ],
  "services": [
    {
      "service_type": "physiotherapy",
      "frequency": "weekly",
      "duration_weeks": 12
    }
  ],
  "program_start_date": "2026-01-20"
}`}</pre>
        </div>

        <div className="example-card mb-4">
          <h6>مثال 2: جلب البرامج مع الفلترة</h6>
          <pre className="example-code">{`GET /programs?disability_type=physical&status=active&limit=50
Authorization: Bearer YOUR_TOKEN

Response:
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "program_id": "REHAB-1736238960000-abc123def",
      "program_name_ar": "برنامج تأهيل حركي",
      "beneficiary_name_ar": "أحمد علي",
      "program_status": "active",
      "completion_rate": 45,
      "sessions": [...],
      "rehabilitation_goals": [...]
    }
  ],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}`}</pre>
        </div>

        <div className="example-card">
          <h6>مثال 3: إضافة جلسة جديدة</h6>
          <pre className="example-code">{`POST /programs/:id/sessions
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "session_date": "2026-01-20",
  "session_type": "regular",
  "service_type": "physiotherapy",
  "duration_minutes": 60,
  "attendance": "present",
  "notes": "جلسة جيدة - تقدم ملحوظ"
}`}</pre>
        </div>
      </div>
    </div>
  );
};

const getMethodColor = method => {
  const colors = {
    GET: 'info',
    POST: 'success',
    PUT: 'warning',
    DELETE: 'danger',
    PATCH: 'secondary',
  };
  return colors[method] || 'secondary';
};

export default DisabilityRehabilitation;
