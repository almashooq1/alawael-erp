/**
 * نظام الخطط التعليمية الفردية الذكية - المكونات الأمامية
 * Intelligent IEP System - Frontend React Components
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Table, Alert, Progress, Badge, Tab, Tabs } from 'react-bootstrap';
import axios from 'axios';
import { getToken } from '../utils/tokenStorage';

// ============================================
// 1. IEP GENERATOR COMPONENT
// ============================================

export const IEPGenerator = ({ studentId, onGenerate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studentProfile, setStudentProfile] = useState({
    name: '',
    learning_style: 'visual',
    learning_pace: 'average',
    strengths: [],
    challenges: [],
    preferred_activities: [],
    motivation_factors: [],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/intelligent-iep/generate',
        {
          student_id: studentId,
          student_profile: studentProfile,
          assessments: []
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      if (response.data.success) {
        onGenerate(response.data.iep);
        setError(null);
      }
    } catch (err) {
      setError('خطأ في توليد الخطة: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="iep-generator mb-4">
      <Card.Header className="bg-primary text-white">
        <Card.Title className="mb-0">
          🔧 مولد الخطط التعليمية الذكية
        </Card.Title>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>أسلوب التعلم</Form.Label>
            <Form.Select
              value={studentProfile.learning_style}
              onChange={(e) =>
                setStudentProfile({
                  ...studentProfile,
                  learning_style: e.target.value
                })
              }
            >
              <option value="visual">بصري</option>
              <option value="auditory">سمعي</option>
              <option value="kinesthetic">حركي</option>
              <option value="reading_writing">قراءة وكتابة</option>
              <option value="mixed">متعدد الحواس</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>وتيرة التعلم</Form.Label>
            <Form.Select
              value={studentProfile.learning_pace}
              onChange={(e) =>
                setStudentProfile({
                  ...studentProfile,
                  learning_pace: e.target.value
                })
              }
            >
              <option value="slow">بطيئة</option>
              <option value="average">متوسطة</option>
              <option value="fast">سريعة</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>نقاط القوة (فاصل بفواصل)</Form.Label>
            <Form.Control
              as="textarea"
              placeholder="مثال: الرياضيات، الذاكرة البصرية"
              onChange={(e) =>
                setStudentProfile({
                  ...studentProfile,
                  strengths: e.target.value.split(',').map(s => s.trim())
                })
              }
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>التحديات (فاصل بفواصل)</Form.Label>
            <Form.Control
              as="textarea"
              placeholder="مثال: القراءة، التفاعل الاجتماعي"
              onChange={(e) =>
                setStudentProfile({
                  ...studentProfile,
                  challenges: e.target.value.split(',').map(c => c.trim())
                })
              }
            />
          </Form.Group>

          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="w-100"
          >
            {loading ? '⏳ جاري التوليد...' : '✨ توليد الخطة الذكية'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

// ============================================
// 2. IEP GOALS MANAGER COMPONENT
// ============================================

export const IEPGoalsManager = ({ iepId, goals = [], onUpdate }) => {
  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_statement: '',
    priority: 'MEDIUM',
    goal_type: 'academic'
  });

  const handleAddGoal = async () => {
    try {
      const response = await axios.post(
        `/api/intelligent-iep/${iepId}/goals`,
        newGoal,
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      if (response.data.success) {
        setShowModal(false);
        setNewGoal({ goal_statement: '', priority: 'MEDIUM', goal_type: 'academic' });
        onUpdate();
      }
    } catch (err) {
      console.error('خطأ في إضافة الهدف:', err);
    }
  };

  const priorityColors = {
    LOW: 'secondary',
    MEDIUM: 'info',
    HIGH: 'warning',
    CRITICAL: 'danger'
  };

  return (
    <Card className="goals-manager mb-4">
      <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
        <Card.Title className="mb-0">📍 إدارة الأهداف</Card.Title>
        <Button
          size="sm"
          variant="light"
          onClick={() => setShowModal(true)}
        >
          ➕ إضافة هدف
        </Button>
      </Card.Header>
      <Card.Body>
        {goals.length === 0 ? (
          <Alert variant="info">لا توجد أهداف حالياً</Alert>
        ) : (
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>الهدف</th>
                <th>النوع</th>
                <th>الأولوية</th>
                <th>التقدم</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => (
                <tr key={goal.id}>
                  <td>{goal.goal_statement}</td>
                  <td>{goal.goal_type}</td>
                  <td>
                    <Badge bg={priorityColors[goal.priority] || 'secondary'}>
                      {goal.priority}
                    </Badge>
                  </td>
                  <td>
                    <div className="progress-bar-container">
                      <Progress
                        now={goal.progress_percentage || 0}
                        label={`${goal.progress_percentage || 0}%`}
                        className="mb-0"
                      />
                    </div>
                  </td>
                  <td>
                    <Button size="sm" variant="outline-primary">
                      تحديث
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>

      {/* Modal لإضافة هدف جديد */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>إضافة هدف جديد</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>نص الهدف</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newGoal.goal_statement}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, goal_statement: e.target.value })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>نوع الهدف</Form.Label>
              <Form.Select
                value={newGoal.goal_type}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, goal_type: e.target.value })
                }
              >
                <option value="academic">أكاديمي</option>
                <option value="behavioral">سلوكي</option>
                <option value="social">اجتماعي</option>
                <option value="motor">حركي</option>
                <option value="communication">تواصلي</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>الأولوية</Form.Label>
              <Form.Select
                value={newGoal.priority}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, priority: e.target.value })
                }
              >
                <option value="LOW">منخفضة</option>
                <option value="MEDIUM">متوسطة</option>
                <option value="HIGH">عالية</option>
                <option value="CRITICAL">حرجة</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            إغلاق
          </Button>
          <Button variant="primary" onClick={handleAddGoal}>
            إضافة الهدف
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

// ============================================
// 3. PROGRESS TRACKER COMPONENT
// ============================================

export const ProgressTracker = ({ iepId, goals = [] }) => {
  const [_progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/intelligent-iep/${iepId}/progress`,
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );
      setProgressData(response.data.progress_report);
    } catch (err) {
      console.error('خطأ في جلب البيانات:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iepId]);

  const overallProgress = goals.length > 0
    ? (goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length)
    : 0;

  return (
    <Card className="progress-tracker mb-4">
      <Card.Header className="bg-success text-white">
        <Card.Title className="mb-0">📊 تتبع التقدم</Card.Title>
      </Card.Header>
      <Card.Body>
        <div className="overall-progress mb-4">
          <h5>التقدم الإجمالي</h5>
          <Progress
            now={overallProgress}
            label={`${overallProgress.toFixed(1)}%`}
            striped
            animated
            className="mb-3"
          />
        </div>

        <Tabs defaultActiveKey="goals" className="mb-3">
          <Tab eventKey="goals" title="تقدم الأهداف">
            <Table striped hover responsive className="mt-3">
              <thead>
                <tr>
                  <th>الهدف</th>
                  <th>الخط الأساسي</th>
                  <th>الهدف</th>
                  <th>الأداء الحالي</th>
                  <th>التقدم</th>
                  <th>الاتجاه</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <tr key={goal.id}>
                    <td>{goal.goal_statement?.substring(0, 30)}...</td>
                    <td>{goal.baseline_measurement || '-'}</td>
                    <td>{goal.target_measurement || '-'}</td>
                    <td>{goal.current_performance || '-'}</td>
                    <td>
                      <Progress
                        now={goal.progress_percentage || 0}
                        label={`${goal.progress_percentage || 0}%`}
                        className="mb-0"
                      />
                    </td>
                    <td>
                      {goal.progress_status === 'ACHIEVED' && <Badge bg="success">✓</Badge>}
                      {goal.progress_status === 'IN_PROGRESS' && <Badge bg="info">→</Badge>}
                      {goal.progress_status === 'NOT_MET' && <Badge bg="danger">✗</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>

          <Tab eventKey="interventions" title="فعالية التدخلات">
            <div className="mt-3">
              <Alert variant="info">
                قيد التطوير - سيتم عرض تقييم فعالية التدخلات هنا
              </Alert>
            </div>
          </Tab>
        </Tabs>

        <Button
          variant="outline-primary"
          onClick={fetchProgress}
          disabled={loading}
          className="mt-3"
        >
          {loading ? '⏳' : '🔄'} تحديث البيانات
        </Button>
      </Card.Body>
    </Card>
  );
};

// ============================================
// 4. AI RECOMMENDATIONS COMPONENT
// ============================================

export const AIRecommendations = ({ iepId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iepId]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/intelligent-iep/${iepId}/ai-recommendations`,
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );
      setRecommendations(response.data.recommendations || []);
    } catch (err) {
      console.error('خطأ في جلب التوصيات:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (recId) => {
    try {
      const response = await axios.post(
        `/api/intelligent-iep/${iepId}/ai-recommendations/${recId}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      if (response.data.success) {
        fetchRecommendations();
      }
    } catch (err) {
      console.error('خطأ في الموافقة:', err);
    }
  };

  if (loading) {
    return <div className="text-center p-4">جاري التحميل...</div>;
  }

  return (
    <Card className="ai-recommendations mb-4">
      <Card.Header className="bg-warning text-dark">
        <Card.Title className="mb-0">✨ التوصيات الذكية</Card.Title>
      </Card.Header>
      <Card.Body>
        {recommendations.length === 0 ? (
          <Alert variant="info">لا توجد توصيات حالياً</Alert>
        ) : (
          <div>
            {recommendations.map((rec, idx) => (
              <Card key={idx} className="mb-3 border-left">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1">{rec.title}</h6>
                      <small className="text-muted">{rec.description}</small>
                    </div>
                    <Badge bg="primary">{rec.confidence_score}%</Badge>
                  </div>

                  <div className="mt-3">
                    <small className="text-muted">خطوات التنفيذ:</small>
                    <ul className="mt-2 mb-3 ps-4">
                      {rec.implementation_steps?.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {!rec.approved && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleApprove(rec.id)}
                    >
                      ✓ الموافقة
                    </Button>
                  )}
                  {rec.approved && (
                    <Badge bg="success">موافق عليه</Badge>
                  )}
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

// ============================================
// 5. MAIN IEP DASHBOARD
// ============================================

export const IEPDashboard = ({ studentId }) => {
  const [iepId, setIepId] = useState(null);
  const [iepData, setIepData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleIEPGenerated = (iep) => {
    setIepData(iep);
    setIepId(iep.id);
  };

  return (
    <div className="iep-dashboard">
      <div className="container-fluid p-4">
        <h1 className="mb-4">📚 نظام الخطط التعليمية الفردية الذكية</h1>

        {!iepId ? (
          <IEPGenerator
            studentId={studentId}
            onGenerate={handleIEPGenerated}
          />
        ) : (
          <div>
            <Alert variant="success" className="mb-4">
              ✓ تم إنشاء الخطة بنجاح
              <br />
              <strong>درجة الذكاء:</strong> {iepData?.intelligence_score}
              <br />
              <strong>مستوى التخصيص:</strong> {iepData?.personalization_level}
            </Alert>

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
            >
              <Tab eventKey="overview" title="نظرة عامة">
                <div className="mt-4">
                  <IEPGoalsManager
                    iepId={iepId}
                    goals={iepData?.goals}
                    onUpdate={() => {}}
                  />
                </div>
              </Tab>

              <Tab eventKey="progress" title="التقدم">
                <div className="mt-4">
                  <ProgressTracker
                    iepId={iepId}
                    goals={iepData?.goals}
                  />
                </div>
              </Tab>

              <Tab eventKey="recommendations" title="التوصيات">
                <div className="mt-4">
                  <AIRecommendations iepId={iepId} />
                </div>
              </Tab>

              <Tab eventKey="interventions" title="التدخلات">
                <div className="mt-4">
                  <Card>
                    <Card.Body>
                      <p>قيد التطوير</p>
                    </Card.Body>
                  </Card>
                </div>
              </Tab>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default IEPDashboard;
