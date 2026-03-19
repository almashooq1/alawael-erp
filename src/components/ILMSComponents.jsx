// مكونات نظام إدارة التعلم الذكي المتقدمة
// Intelligent Learning Management System Components

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Tab,
  Tabs,
  Form,
  ProgressBar,
  Alert,
  Badge,
  Table,
  Modal,
  Tooltip,
  OverlayTrigger,
  ListGroup,
  Dropdown,
  DropdownButton,
  Accordion,
  Spinner,
  Nav,
  Navbar,
} from 'react-bootstrap';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import './ILMSComponents.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/intelligent-lms';

// ================ المكون الرئيسي ================

export const IntelligentLMSDashboard = ({ token, userId }) => {
  const [activeTab, setActiveTab] = useState('courses');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    loadCourses();
  }, [token]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(response.data.courses || []);
    } catch (err) {
      setError('فشل في تحميل الدورات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="ilms-dashboard mt-4">
      <Navbar bg="dark" variant="dark" className="mb-4">
        <Navbar.Brand>📚 نظام إدارة التعلم الذكي المتكامل</Navbar.Brand>
      </Navbar>

      {error && <Alert variant="danger">{error}</Alert>}

      <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">
        <Tab eventKey="courses" title="🎓 الدورات">
          <CoursesManagement courses={courses} onSelectCourse={setSelectedCourse} token={token} />
        </Tab>

        <Tab eventKey="my-learning" title="📖 تعليمي">
          <MyLearningTab token={token} userId={userId} />
        </Tab>

        <Tab eventKey="analytics" title="📊 التحليلات">
          <AnalyticsTab token={token} selectedCourse={selectedCourse} />
        </Tab>

        <Tab eventKey="recommendations" title="💡 التوصيات">
          <RecommendationsTab token={token} userId={userId} />
        </Tab>

        <Tab eventKey="progress" title="📈 التقدم">
          <ProgressTab token={token} userId={userId} />
        </Tab>
      </Tabs>
    </Container>
  );
};

// ================ مكون إدارة الدورات ================

const CoursesManagement = ({ courses, onSelectCourse, token }) => {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleSelectCourse = course => {
    setSelectedCourse(course);
    onSelectCourse(course);
    setShowDetails(true);
  };

  return (
    <div className="courses-management">
      <Row className="mb-4">
        <Col md={8}>
          <h4>🎓 الدورات المتاحة</h4>
        </Col>
        <Col md={4}>
          <Button variant="success" className="w-100">
            إنشاء دورة جديدة +
          </Button>
        </Col>
      </Row>

      <Row>
        {courses &&
          courses.map(course => (
            <Col md={4} key={course.id} className="mb-4">
              <Card className="course-card h-100 shadow-sm">
                <Card.Header className="bg-primary text-white">
                  <h5>{course.title}</h5>
                </Card.Header>
                <Card.Body>
                  <p>{course.description || 'وصف الدورة'}</p>

                  <div className="mb-3">
                    <span className="badge bg-info">المستوى: {course.level}</span>
                    <span className="badge bg-success ms-2">
                      جودة AI: {course.ai_quality_score}%
                    </span>
                  </div>

                  <ProgressBar
                    now={course.ai_quality_score || 0}
                    label={`${course.ai_quality_score}%`}
                    className="mb-3"
                  />

                  <div className="course-stats mb-3">
                    <small>
                      <div>📊 الطلاب المسجلون: {course.enrollment_count}</div>
                      <div>⏱️ المدة: {course.duration_hours} ساعة</div>
                      <div>🤖 محتوى متكيف: {'نعم'}</div>
                    </small>
                  </div>

                  <Button
                    variant="primary"
                    className="w-100"
                    onClick={() => handleSelectCourse(course)}
                  >
                    عرض التفاصيل
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
      </Row>

      {selectedCourse && (
        <CourseDetailsModal
          course={selectedCourse}
          show={showDetails}
          onHide={() => setShowDetails(false)}
          token={token}
        />
      )}
    </div>
  );
};

// ================ تفاصيل الدورة ================

const CourseDetailsModal = ({ course, show, onHide, token }) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && course) {
      loadModules();
    }
  }, [show, course]);

  const loadModules = async () => {
    try {
      setLoading(true);
      // تحميل الوحدات
      // const response = await axios.get(`${API_BASE_URL}/courses/${course.id}/modules`, ...);
      // setModules(response.data.modules);
    } catch (err) {
      console.error('فشل تحميل الوحدات', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{course.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <Spinner />
        ) : (
          <>
            <Alert variant="info">
              <h5>📋 معلومات الدورة</h5>
              <p>{course.description}</p>
              <div className="mt-3">
                <div>
                  <strong>المستوى:</strong> {course.level}
                </div>
                <div>
                  <strong>درجة جودة AI:</strong> {course.ai_quality_score}%
                </div>
                <div>
                  <strong>المدة:</strong> {course.duration_hours} ساعة
                </div>
                <div>
                  <strong>محتوى متكيف:</strong> نعم
                </div>
              </div>
            </Alert>

            <h5 className="mt-4">📚 الوحدات</h5>
            <ListGroup>
              {modules.map(module => (
                <ListGroup.Item key={module.id}>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{module.title}</span>
                    <Badge bg="secondary">{module.lesson_count} درس</Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>

            <Button variant="success" className="w-100 mt-4">
              التسجيل في الدورة
            </Button>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

// ================ تعليمي ================

const MyLearningTab = ({ token, userId }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEnrollments();
  }, [token]);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      // تحميل التسجيلات
      // const response = await axios.get(`${API_BASE_URL}/students/${userId}/enrollments`, ...);
    } catch (err) {
      console.error('فشل تحميل التسجيلات', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-learning">
      <h4>📖 دوراتي</h4>
      {loading ? (
        <Spinner />
      ) : (
        <Row>
          {enrollments.length > 0 ? (
            enrollments.map(enrollment => (
              <Col md={6} key={enrollment.id} className="mb-3">
                <EnrollmentCard
                  enrollment={enrollment}
                  onSelect={() => setSelectedEnrollment(enrollment)}
                  token={token}
                />
              </Col>
            ))
          ) : (
            <Alert variant="warning">لم تسجل في أي دورة بعد</Alert>
          )}
        </Row>
      )}

      {selectedEnrollment && (
        <EnrollmentDetailsPanel enrollment={selectedEnrollment} token={token} />
      )}
    </div>
  );
};

// ================ بطاقة التسجيل ================

const EnrollmentCard = ({ enrollment, onSelect, token }) => {
  return (
    <Card className="enrollment-card shadow-sm" onClick={onSelect} style={{ cursor: 'pointer' }}>
      <Card.Header className="bg-info text-white">
        <h6>{enrollment.course_title || 'الدورة'}</h6>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <span>📊 التقدم:</span>
            <strong>{enrollment.progress_percentage}%</strong>
          </div>
          <ProgressBar
            now={enrollment.progress_percentage || 0}
            variant={
              enrollment.progress_percentage >= 75
                ? 'success'
                : enrollment.progress_percentage >= 50
                  ? 'info'
                  : 'warning'
            }
          />
        </div>

        <div className="enrollment-stats">
          <small>
            <div>📈 الدرجة الحالية: {enrollment.current_score || 'لم تقيم بعد'}</div>
            <div>🎯 الحالة: {enrollment.status}</div>
            <div>⏱️ الساعات: {enrollment.total_hours_spent} ساعة</div>
            <div>🎯 أسلوب التعلم: {enrollment.learning_style}</div>
          </small>
        </div>

        <Button variant="primary" size="sm" className="w-100 mt-2">
          المتابعة
        </Button>
      </Card.Body>
    </Card>
  );
};

// ================ لوحة التفاصيل ================

const EnrollmentDetailsPanel = ({ enrollment, token }) => {
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLessons();
  }, [enrollment.id]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      // تحميل الدروس
    } catch (err) {
      console.error('فشل تحميل الدروس', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4 shadow-sm">
      <Card.Header className="bg-secondary text-white">
        <h5>📚 محتوى الدورة - {enrollment.course_title}</h5>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <Spinner />
        ) : (
          <Accordion>
            {lessons.map((lesson, index) => (
              <Accordion.Item eventKey={index} key={lesson.id}>
                <Accordion.Header>
                  <div className="d-flex justify-content-between w-100">
                    <span>{lesson.title}</span>
                    <Badge bg={lesson.completed ? 'success' : 'secondary'}>
                      {lesson.progress}%
                    </Badge>
                  </div>
                </Accordion.Header>
                <Accordion.Body>
                  <LessonContent lesson={lesson} token={token} />
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Card.Body>
    </Card>
  );
};

// ================ محتوى الدرس ================

const LessonContent = ({ lesson, token }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    loadLessonContent();
  }, [lesson.id]);

  const loadLessonContent = async () => {
    try {
      setLoading(true);
      // تحميل محتوى الدرس
      // const response = await axios.get(`${API_BASE_URL}/lessons/${lesson.id}/content`, ...);
      // setContent(response.data);
    } catch (err) {
      console.error('فشل تحميل المحتوى', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lesson-content">
      {loading ? (
        <Spinner />
      ) : (
        <>
          <p>{lesson.description}</p>

          <div className="lesson-resources mb-3">
            <h6>📎 الموارد:</h6>
            <ListGroup>
              {lesson.resources &&
                lesson.resources.map(resource => (
                  <ListGroup.Item key={resource.id}>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                      📄 {resource.title} ({resource.type})
                    </a>
                  </ListGroup.Item>
                ))}
            </ListGroup>
          </div>

          {lesson.has_quiz && (
            <Button variant="success" onClick={() => setShowQuiz(true)} className="w-100 mb-2">
              ✅ اختبار الدرس
            </Button>
          )}

          <Button variant="primary" className="w-100">
            وضع علامة كمكتمل
          </Button>

          {showQuiz && (
            <QuizComponent lesson={lesson} token={token} onClose={() => setShowQuiz(false)} />
          )}
        </>
      )}
    </div>
  );
};

// ================ الاختبار ================

const QuizComponent = ({ lesson, token, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [lesson.id]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      // تحميل الاختبار
      // const response = await axios.get(`${API_BASE_URL}/lessons/${lesson.id}/quiz`, ...);
      // setQuestions(response.data.questions);
    } catch (err) {
      console.error('فشل تحميل الاختبار', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      // إرسال الإجابات
      // const response = await axios.post(`${API_BASE_URL}/quiz/${quiz.id}/submit`,
      //   { answers },
      //   { headers: { Authorization: `Bearer ${token}` } }
      // );
      setSubmitted(true);
    } catch (err) {
      console.error('فشل إرسال الاختبار', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={true} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>✅ اختبار الدرس</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <Spinner />
        ) : submitted ? (
          <Alert variant="success">تم تقديم الاختبار بنجاح!</Alert>
        ) : (
          <Form>
            {questions.map((question, index) => (
              <Form.Group key={question.id} className="mb-3">
                <Form.Label>
                  <strong>السؤال {index + 1}:</strong> {question.text}
                </Form.Label>
                {question.options &&
                  question.options.map((option, optIndex) => (
                    <Form.Check
                      key={optIndex}
                      type="radio"
                      label={option}
                      name={`question-${question.id}`}
                      value={option}
                      onChange={e => setAnswers({ ...answers, [question.id]: e.target.value })}
                    />
                  ))}
              </Form.Group>
            ))}
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
        {!submitted && (
          <Button variant="success" onClick={handleSubmitQuiz} disabled={loading}>
            تقديم الاختبار
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

// ================ التحليلات ================

const AnalyticsTab = ({ token, selectedCourse }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCourse) {
      loadMetrics();
    }
  }, [selectedCourse]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      // تحميل المقاييس
    } catch (err) {
      console.error('فشل تحميل المقاييس', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics-tab">
      <h4>📊 تحليلات الأداء</h4>
      {loading ? (
        <Spinner />
      ) : (
        <Row className="mt-4">
          <Col md={6}>
            <Card>
              <Card.Header className="bg-success text-white">📈 معدل الإكمال</Card.Header>
              <Card.Body>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics?.trend_data || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completion_rate" stroke="#8884d8" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card>
              <Card.Header className="bg-info text-white">📊 توزيع الدرجات</Card.Header>
              <Card.Body>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics?.score_distribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#0dcaf0" />
                        <Cell fill="#0d6efd" />
                        <Cell fill="#6f42c1" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

// ================ التوصيات ================

const RecommendationsTab = ({ token, userId }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [token]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      // تحميل التوصيات
    } catch (err) {
      console.error('فشل تحميل التوصيات', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recommendations-tab">
      <h4>💡 التوصيات الذكية</h4>
      {loading ? (
        <Spinner />
      ) : (
        <Row className="mt-4">
          {recommendations.map(rec => (
            <Col md={4} key={rec.id} className="mb-3">
              <Card className="recommendation-card shadow-sm">
                <Card.Header className="bg-warning text-dark">
                  <h6>{rec.type}</h6>
                </Card.Header>
                <Card.Body>
                  <p>{rec.text}</p>
                  <div className="mb-3">
                    <Badge bg="success">{rec.confidence_score}% ثقة</Badge>
                  </div>
                  {rec.actions && (
                    <div>
                      <h6>الخطوات الموصى بها:</h6>
                      <ul>
                        {rec.actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button variant="primary" className="w-100">
                    تنفيذ التوصية
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

// ================ التقدم ================

const ProgressTab = ({ token, userId }) => {
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [token]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      // تحميل بيانات التقدم
    } catch (err) {
      console.error('فشل تحميل التقدم', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="progress-tab">
      <h4>📈 إحصائيات التقدم الشاملة</h4>
      {loading ? (
        <Spinner />
      ) : (
        <Row className="mt-4">
          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <h5>🎓</h5>
                <h6>الدورات المسجلة</h6>
                <h4>{progressData?.enrolled_courses || 0}</h4>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <h5>✅</h5>
                <h6>الدورات المكتملة</h6>
                <h4>{progressData?.completed_courses || 0}</h4>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <h5>📊</h5>
                <h6>المعدل العام</h6>
                <h4>{progressData?.overall_gpa || 0}%</h4>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="stat-card text-center">
              <Card.Body>
                <h5>⏱️</h5>
                <h6>الساعات المكتملة</h6>
                <h4>{progressData?.total_hours || 0}</h4>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default IntelligentLMSDashboard;
