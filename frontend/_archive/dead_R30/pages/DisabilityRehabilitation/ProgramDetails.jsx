/**
 * Program Details & Management
 * عرض وإدارة تفاصيل البرنامج التأهيلي
 *
 * @component
 * @version 1.0.0
 * @date 2026-01-19
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab, Badge, Alert, Modal, Form, ListGroup, ProgressBar, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaPlus, FaEdit, FaClock, FaChartLine, FaUser, FaHeartbeat } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { getToken } from '../../utils/tokenStorage';
import './ProgramDetails.css';

const ProgramDetails = ({ programId, onBack }) => {
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState(null);
  const [_report, setReport] = useState(null);
  const [_sessions, _setSessions] = useState([]);
  const [_assessments, _setAssessments] = useState([]);
  const [progressData, setProgressData] = useState([]);

  // حالات Modals
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddAssessment, setShowAddAssessment] = useState(false);
  const [showUpdateGoal, setShowUpdateGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // بيانات النموذج
  const [sessionData, setSessionData] = useState({
    session_date: new Date().toISOString().split('T')[0],
    session_type: 'regular',
    service_type: 'physiotherapy',
    duration_minutes: 60,
    attendance: 'present',
    notes: ''
  });

  const [assessmentData, setAssessmentData] = useState({
    assessment_date: new Date().toISOString().split('T')[0],
    assessment_type: 'periodic',
    findings: '',
    recommendations: '',
    score: 0
  });

  const [goalUpdate, setGoalUpdate] = useState({
    status: 'in_progress',
    progress_percentage: 0,
    notes: ''
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
  const API_ENDPOINT = `${API_BASE}/disability-rehabilitation`;

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchProgramData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const fetchProgramData = async () => {
    try {
      setLoading(true);
      const token = getToken();

      // جلب تفاصيل البرنامج
      const programResponse = await axios.get(
        `${API_ENDPOINT}/programs/${programId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProgram(programResponse.data.data);

      // جلب التقرير المفصل
      const reportResponse = await axios.get(
        `${API_ENDPOINT}/programs/${programId}/report`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReport(reportResponse.data.data);

      // معالجة بيانات التقدم للرسم البياني
      if (reportResponse.data.data?.progress_history) {
        const chartData = reportResponse.data.data.progress_history.map(p => ({
          date: new Date(p.date).toLocaleDateString('ar-SA'),
          progress: p.completion_rate
        }));
        setProgressData(chartData);
      }

      setError(null);
    } catch (err) {
      setError('خطأ في جلب البيانات: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching program:', err);
    } finally {
      setLoading(false);
    }
  };

  // إضافة جلسة جديدة
  const handleAddSession = async () => {
    try {
      const token = getToken();

      await axios.post(
        `${API_ENDPOINT}/programs/${programId}/sessions`,
        sessionData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowAddSession(false);
      setSessionData({
        session_date: new Date().toISOString().split('T')[0],
        session_type: 'regular',
        service_type: 'physiotherapy',
        duration_minutes: 60,
        attendance: 'present',
        notes: ''
      });

      fetchProgramData();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.message || err.message));
    }
  };

  // إضافة تقييم جديد
  const handleAddAssessment = async () => {
    try {
      const token = getToken();

      await axios.post(
        `${API_ENDPOINT}/programs/${programId}/assessments`,
        assessmentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowAddAssessment(false);
      setAssessmentData({
        assessment_date: new Date().toISOString().split('T')[0],
        assessment_type: 'periodic',
        findings: '',
        recommendations: '',
        score: 0
      });

      fetchProgramData();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.message || err.message));
    }
  };

  // تحديث حالة الهدف
  const handleUpdateGoal = async () => {
    if (!selectedGoal) return;

    try {
      const token = getToken();

      await axios.put(
        `${API_ENDPOINT}/programs/${programId}/goals/${selectedGoal._id}`,
        goalUpdate,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowUpdateGoal(false);
      setSelectedGoal(null);
      setGoalUpdate({ status: 'in_progress', progress_percentage: 0, notes: '' });

      fetchProgramData();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.message || err.message));
    }
  };

  // تحديث حالة البرنامج
  const updateProgramStatus = async (newStatus) => {
    try {
      const token = getToken();

      await axios.put(
        `${API_ENDPOINT}/programs/${programId}`,
        { program_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchProgramData();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.message || err.message));
    }
  };

  // إكمال البرنامج
  const completeProgram = async () => {
    if (!window.confirm('هل تريد بالفعل إكمال هذا البرنامج؟')) return;

    try {
      const token = getToken();

      await axios.put(
        `${API_ENDPOINT}/programs/${programId}/complete`,
        { completion_notes: 'تم إكمال البرنامج بنجاح' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchProgramData();
    } catch (err) {
      alert('خطأ: ' + (err.response?.data?.message || err.message));
    }
  };

  // ترجمة الحالات
  const translateStatus = (status) => {
    const translations = {
      active: 'نشط',
      paused: 'موقوف',
      completed: 'مكتمل',
      cancelled: 'ملغى',
      in_progress: 'قيد التقدم',
      achieved: 'محقق',
      partially_achieved: 'محقق جزئياً',
      not_started: 'لم يبدأ'
    };
    return translations[status] || status;
  };

  const getStatusBadgeVariant = (status) => {
    const variants = {
      active: 'success',
      paused: 'warning',
      completed: 'info',
      cancelled: 'danger',
      in_progress: 'primary',
      achieved: 'success',
      partially_achieved: 'warning',
      not_started: 'secondary'
    };
    return variants[status] || 'secondary';
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  if (!program) {
    return (
      <Alert variant="danger">
        البرنامج غير موجود
      </Alert>
    );
  }

  return (
    <Container fluid className="program-details py-4">
      {/* رأس الصفحة */}
      <div className="page-header mb-4">
        <Button variant="secondary" onClick={onBack} className="mb-3">
          <FaArrowLeft /> العودة
        </Button>

        <Row className="align-items-center">
          <Col md={6}>
            <h2 className="mb-2">{program.program_name_ar}</h2>
            <p className="text-muted mb-0">
              معرف البرنامج: <code>{program.program_id}</code>
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <Badge bg={getStatusBadgeVariant(program.program_status)} className="me-2">
              {translateStatus(program.program_status)}
            </Badge>
            <div className="mt-2">
              {program.program_status === 'active' && (
                <>
                  <Button size="sm" variant="warning" onClick={() => updateProgramStatus('paused')} className="me-2">
                    ⏸️ إيقاف مؤقت
                  </Button>
                  <Button size="sm" variant="success" onClick={completeProgram} className="me-2">
                    ✅ إكمال
                  </Button>
                </>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* البيانات الأساسية */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="icon-box bg-primary text-white">
                  <FaUser size={20} />
                </div>
                <div className="ms-3">
                  <small className="text-muted">المستفيد</small>
                  <p className="mb-0 fw-bold">{program.beneficiary_name_ar}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="icon-box bg-success text-white">
                  <FaHeartbeat size={20} />
                </div>
                <div className="ms-3">
                  <small className="text-muted">نوع الإعاقة</small>
                  <p className="mb-0 fw-bold">{program.disability_info?.primary_disability}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="icon-box bg-info text-white">
                  <FaChartLine size={20} />
                </div>
                <div className="ms-3">
                  <small className="text-muted">معدل التقدم</small>
                  <p className="mb-0 fw-bold">{program.completion_rate}%</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} sm={6} className="mb-3">
          <Card className="stat-card">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="icon-box bg-warning text-white">
                  <FaClock size={20} />
                </div>
                <div className="ms-3">
                  <small className="text-muted">عدد الجلسات</small>
                  <p className="mb-0 fw-bold">{program.sessions?.length || 0}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* شريط التقدم */}
      <Card className="mb-4">
        <Card.Body>
          <h6 className="mb-3">معدل التقدم العام</h6>
          <ProgressBar
            now={program.completion_rate}
            label={`${program.completion_rate}%`}
            animated
          />
        </Card.Body>
      </Card>

      {/* رسم بياني للتقدم */}
      {progressData.length > 0 && (
        <Card className="mb-4">
          <Card.Header>
            <Card.Title className="mb-0">📈 رسم بياني للتقدم</Card.Title>
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="progress" stroke="#8884d8" name="التقدم (%)" />
              </LineChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      )}

      {/* التفاصيل والإجراءات */}
      <Tabs defaultActiveKey="goals" className="mb-4">
        {/* الأهداف */}
        <Tab eventKey="goals" title={`🎯 الأهداف (${program.rehabilitation_goals?.length || 0})`}>
          <Card>
            <Card.Body>
              <Button variant="success" onClick={() => alert('قريباً')} className="mb-3">
                <FaPlus /> هدف جديد
              </Button>

              {program.rehabilitation_goals && program.rehabilitation_goals.length > 0 ? (
                <ListGroup>
                  {program.rehabilitation_goals.map((goal, index) => (
                    <ListGroup.Item key={index}>
                      <Row className="align-items-center">
                        <Col md={6}>
                          <h6 className="mb-1">{goal.goal_name_ar}</h6>
                          <small className="text-muted">
                            الفئة: {goal.goal_category} | الأولوية: {goal.priority}
                          </small>
                        </Col>
                        <Col md={3}>
                          <Badge bg={getStatusBadgeVariant(goal.status)}>
                            {translateStatus(goal.status)}
                          </Badge>
                          {goal.progress_percentage !== undefined && (
                            <div className="mt-2">
                              <ProgressBar now={goal.progress_percentage} label={`${goal.progress_percentage}%`} />
                            </div>
                          )}
                        </Col>
                        <Col md={3} className="text-md-end">
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => {
                              setSelectedGoal(goal);
                              setGoalUpdate({
                                status: goal.status,
                                progress_percentage: goal.progress_percentage || 0,
                                notes: ''
                              });
                              setShowUpdateGoal(true);
                            }}
                            className="me-2"
                          >
                            <FaEdit /> تحديث
                          </Button>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center">لا توجد أهداف</p>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* الجلسات */}
        <Tab eventKey="sessions" title={`💼 الجلسات (${program.sessions?.length || 0})`}>
          <Card>
            <Card.Body>
              <Button variant="success" onClick={() => setShowAddSession(true)} className="mb-3">
                <FaPlus /> جلسة جديدة
              </Button>

              {program.sessions && program.sessions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>النوع</th>
                        <th>المدة</th>
                        <th>الحضور</th>
                        <th>ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {program.sessions.map((session, index) => (
                        <tr key={index}>
                          <td>{new Date(session.session_date).toLocaleDateString('ar-SA')}</td>
                          <td>{session.service_type}</td>
                          <td>{session.duration_minutes} دقيقة</td>
                          <td>
                            <Badge bg={session.attendance === 'present' ? 'success' : 'danger'}>
                              {session.attendance === 'present' ? 'حاضر' : 'غائب'}
                            </Badge>
                          </td>
                          <td>{session.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center">لا توجد جلسات</p>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* التقييمات */}
        <Tab eventKey="assessments" title={`📋 التقييمات (${program.assessments?.length || 0})`}>
          <Card>
            <Card.Body>
              <Button variant="success" onClick={() => setShowAddAssessment(true)} className="mb-3">
                <FaPlus /> تقييم جديد
              </Button>

              {program.assessments && program.assessments.length > 0 ? (
                <ListGroup>
                  {program.assessments.map((assessment, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={4}>
                          <h6 className="mb-1">{assessment.assessment_type}</h6>
                          <small className="text-muted">
                            {new Date(assessment.assessment_date).toLocaleDateString('ar-SA')}
                          </small>
                        </Col>
                        <Col md={4}>
                          <strong>النتائج:</strong>
                          <p className="mb-0">{assessment.findings}</p>
                        </Col>
                        <Col md={4}>
                          <Badge bg="info" className="me-2">{assessment.score}/100</Badge>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center">لا توجد تقييمات</p>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* الخدمات */}
        <Tab eventKey="services" title={`🏥 الخدمات (${program.services?.length || 0})`}>
          <Card>
            <Card.Body>
              {program.services && program.services.length > 0 ? (
                <ListGroup>
                  {program.services.map((service, index) => (
                    <ListGroup.Item key={index}>
                      <Row>
                        <Col md={4}>
                          <strong>{service.service_type}</strong>
                        </Col>
                        <Col md={4}>
                          <small>التكرار: {service.frequency}</small>
                          <br />
                          <small>المدة: {service.duration_weeks} أسبوع</small>
                        </Col>
                        <Col md={4}>
                          <Badge bg="primary">{service.status || 'نشط'}</Badge>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <p className="text-muted text-center">لا توجد خدمات</p>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modals */}

      {/* إضافة جلسة */}
      <Modal show={showAddSession} onHide={() => setShowAddSession(false)}>
        <Modal.Header closeButton>
          <Modal.Title>➕ إضافة جلسة جديدة</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>التاريخ</Form.Label>
              <Form.Control
                type="date"
                value={sessionData.session_date}
                onChange={(e) => setSessionData({...sessionData, session_date: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>نوع الخدمة</Form.Label>
              <Form.Select
                value={sessionData.service_type}
                onChange={(e) => setSessionData({...sessionData, service_type: e.target.value})}
              >
                <option value="physiotherapy">العلاج الطبيعي</option>
                <option value="occupational">العلاج الوظيفي</option>
                <option value="speech">العلاج النطقي</option>
                <option value="psychological">الدعم النفسي</option>
                <option value="educational">التعليم الخاص</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>المدة (دقائق)</Form.Label>
              <Form.Control
                type="number"
                value={sessionData.duration_minutes}
                onChange={(e) => setSessionData({...sessionData, duration_minutes: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>الحضور</Form.Label>
              <Form.Select
                value={sessionData.attendance}
                onChange={(e) => setSessionData({...sessionData, attendance: e.target.value})}
              >
                <option value="present">حاضر</option>
                <option value="absent">غائب</option>
                <option value="cancelled">ملغى</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>ملاحظات</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={sessionData.notes}
                onChange={(e) => setSessionData({...sessionData, notes: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddSession(false)}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleAddSession}>
            حفظ الجلسة
          </Button>
        </Modal.Footer>
      </Modal>

      {/* إضافة تقييم */}
      <Modal show={showAddAssessment} onHide={() => setShowAddAssessment(false)}>
        <Modal.Header closeButton>
          <Modal.Title>➕ إضافة تقييم جديد</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>التاريخ</Form.Label>
              <Form.Control
                type="date"
                value={assessmentData.assessment_date}
                onChange={(e) => setAssessmentData({...assessmentData, assessment_date: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>نوع التقييم</Form.Label>
              <Form.Select
                value={assessmentData.assessment_type}
                onChange={(e) => setAssessmentData({...assessmentData, assessment_type: e.target.value})}
              >
                <option value="initial">ابتدائي</option>
                <option value="periodic">دوري</option>
                <option value="final">نهائي</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>الدرجة</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                value={assessmentData.score}
                onChange={(e) => setAssessmentData({...assessmentData, score: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>النتائج</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={assessmentData.findings}
                onChange={(e) => setAssessmentData({...assessmentData, findings: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>التوصيات</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={assessmentData.recommendations}
                onChange={(e) => setAssessmentData({...assessmentData, recommendations: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddAssessment(false)}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleAddAssessment}>
            حفظ التقييم
          </Button>
        </Modal.Footer>
      </Modal>

      {/* تحديث الهدف */}
      <Modal show={showUpdateGoal} onHide={() => setShowUpdateGoal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>✏️ تحديث الهدف</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>الحالة</Form.Label>
              <Form.Select
                value={goalUpdate.status}
                onChange={(e) => setGoalUpdate({...goalUpdate, status: e.target.value})}
              >
                <option value="not_started">لم يبدأ</option>
                <option value="in_progress">قيد التقدم</option>
                <option value="partially_achieved">محقق جزئياً</option>
                <option value="achieved">محقق</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>نسبة التقدم (%)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                max="100"
                value={goalUpdate.progress_percentage}
                onChange={(e) => setGoalUpdate({...goalUpdate, progress_percentage: e.target.value})}
              />
              <Form.Range
                min="0"
                max="100"
                value={goalUpdate.progress_percentage}
                onChange={(e) => setGoalUpdate({...goalUpdate, progress_percentage: e.target.value})}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>ملاحظات</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={goalUpdate.notes}
                onChange={(e) => setGoalUpdate({...goalUpdate, notes: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateGoal(false)}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={handleUpdateGoal}>
            حفظ التحديث
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProgramDetails;
