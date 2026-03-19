// أمثلة على استخدام نظام إدارة التعلم الذكي
// Intelligent Learning Management System Usage Examples

import React, { useState } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Alert, Spinner, Table, ProgressBar
} from 'react-bootstrap';
import {
  useCourses,
  useEnrollments,
  useLessons,
  useQuizzes,
  useAnalytics,
  useRecommendations,
  useProgress,
  useProfile
} from '../hooks/useILMS';

// ============ مثال 1: عرض الدورات مع البحث ============

export function CoursesListExample() {
  const { courses, loading, error, searchCourses, loadCourses, clearError } = useCourses();
  const [searchTerm, setSearchTerm] = useState('');
  const [_filteredCourses, _setFilteredCourses] = useState([]);

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      await searchCourses(searchTerm);
    } else {
      await loadCourses();
    }
  };

  return (
    <Container>
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h4>🔍 البحث عن الدورات</h4>
        </Card.Header>
        <Card.Body>
          <Form className="d-flex gap-2">
            <Form.Control
              placeholder="ابحث عن دورة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '🔄 جاري البحث...' : '🔍 بحث'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={clearError}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center"><Spinner /></div>
      ) : (
        <Row>
          {courses.map(course => (
            <Col md={4} key={course.id} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <Card.Title>{course.title}</Card.Title>
                  <Card.Text>{course.description}</Card.Text>
                  <div className="mb-2">
                    <strong>المستوى:</strong> {course.level}
                  </div>
                  <ProgressBar
                    now={course.ai_quality_score}
                    label={`${course.ai_quality_score}%`}
                  />
                  <Button variant="primary" className="mt-3 w-100">
                    عرض التفاصيل
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
}

// ============ مثال 2: إدارة التسجيل في الدورات ============

export function EnrollmentManagementExample({ studentId }) {
  const {
    enrollments,
    loading,
    enrollInCourse,
    unenrollFromCourse
  } = useEnrollments(studentId);

  const [courseToEnroll, setCourseToEnroll] = useState('');
  const [courseOptions] = useState([
    { id: '1', title: 'مقدمة في البرمجة' },
    { id: '2', title: 'JavaScript متقدم' },
    { id: '3', title: 'React للمبتدئين' }
  ]);

  const handleEnroll = async () => {
    if (courseToEnroll) {
      const result = await enrollInCourse(courseToEnroll);
      if (result.success) {
        setCourseToEnroll('');
        alert('تم التسجيل بنجاح!');
      }
    }
  };

  const handleUnenroll = async (enrollmentId) => {
    const confirm = window.confirm('هل تأكد من إلغاء التسجيل؟');
    if (confirm) {
      await unenrollFromCourse(enrollmentId);
      alert('تم إلغاء التسجيل');
    }
  };

  return (
    <Container>
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header className="bg-info text-white">
              <h5>📝 التسجيل في دورة جديدة</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>اختر الدورة</Form.Label>
                <Form.Select
                  value={courseToEnroll}
                  onChange={(e) => setCourseToEnroll(e.target.value)}
                >
                  <option value="">-- اختر دورة --</option>
                  {courseOptions.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button
                variant="success"
                onClick={handleEnroll}
                disabled={loading || !courseToEnroll}
              >
                {loading ? '⏳ جاري التسجيل...' : '✅ تسجيل'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header className="bg-success text-white">
              <h5>📚 دوراتي المسجلة ({enrollments.length})</h5>
            </Card.Header>
            <Card.Body>
              {enrollments.length > 0 ? (
                <ul className="list-group">
                  {enrollments.map(enrollment => (
                    <li
                      key={enrollment.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <span>{enrollment.course_title}</span>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleUnenroll(enrollment.id)}
                      >
                        إلغاء
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">لم تسجل في أي دورة بعد</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

// ============ مثال 3: عرض الدروس والمحتوى ============

export function LessonContentExample({ enrollmentId, courseId }) {
  const { lessons, loading, getLessonContent, markLessonComplete } = useLessons(courseId);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonContent, setLessonContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);

  const handleViewLesson = async (lesson) => {
    setSelectedLesson(lesson);
    setContentLoading(true);
    const content = await getLessonContent(lesson.id);
    setLessonContent(content);
    setContentLoading(false);
  };

  const handleMarkComplete = async () => {
    await markLessonComplete(enrollmentId, selectedLesson.id);
    alert('تم تحديد الدرس كمكتمل!');
  };

  return (
    <Container>
      <Row>
        <Col md={4}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h5>📚 الدروس</h5>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <Spinner />
              ) : (
                <div className="list-group">
                  {lessons.map(lesson => (
                    <button
                      key={lesson.id}
                      className={`list-group-item list-group-item-action ${
                        selectedLesson?.id === lesson.id ? 'active' : ''
                      }`}
                      onClick={() => handleViewLesson(lesson)}
                    >
                      <div className="d-flex justify-content-between">
                        <span>{lesson.title}</span>
                        <span className="badge bg-secondary">
                          {lesson.progress}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          {selectedLesson ? (
            <Card>
              <Card.Header className="bg-success text-white">
                <h5>{selectedLesson.title}</h5>
              </Card.Header>
              <Card.Body>
                {contentLoading ? (
                  <Spinner />
                ) : lessonContent ? (
                  <>
                    <p>{lessonContent.description}</p>
                    <div className="mb-3">
                      <h6>📎 الموارد:</h6>
                      {lessonContent.resources?.map(resource => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="d-block"
                        >
                          📄 {resource.title}
                        </a>
                      ))}
                    </div>
                    <Button
                      variant="success"
                      onClick={handleMarkComplete}
                    >
                      ✅ تحديد كمكتمل
                    </Button>
                  </>
                ) : (
                  <p>لم يتم تحميل المحتوى</p>
                )}
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Body>
                <p className="text-muted text-center">اختر درسًا لعرض محتواه</p>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}

// ============ مثال 4: اختبار الدروس ============

export function QuizExample({ lessonId, _enrollmentId }) {
  const { getLessonQuiz, submitAnswers } = useQuizzes();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  React.useEffect(() => {
    loadQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const loadQuiz = async () => {
    setLoading(true);
    const quizData = await getLessonQuiz(lessonId);
    setQuiz(quizData);
    setLoading(false);
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers({
      ...answers,
      [questionId]: answer
    });
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    const result = await submitAnswers(quiz.id, answers);
    if (result.success) {
      setResult(result.data);
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (loading && !quiz) return <Spinner />;

  return (
    <Container>
      <Card>
        <Card.Header className="bg-primary text-white">
          <h5>✅ {quiz?.title || 'اختبار الدرس'}</h5>
        </Card.Header>
        <Card.Body>
          {submitted ? (
            <Alert variant={result?.passed ? 'success' : 'warning'}>
              <h5>النتيجة: {result?.score}%</h5>
              <p>
                {result?.passed
                  ? '🎉 هنيئاً! لقد نجحت في الاختبار'
                  : '📚 حاول مرة أخرى لتحسين النتيجة'}
              </p>
            </Alert>
          ) : (
            <Form>
              {quiz?.questions?.map((question, index) => (
                <Form.Group key={question.id} className="mb-4">
                  <Form.Label>
                    <strong>السؤال {index + 1}: {question.text}</strong>
                  </Form.Label>
                  {question.options?.map((option, optIndex) => (
                    <Form.Check
                      key={optIndex}
                      type="radio"
                      label={option}
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                  ))}
                </Form.Group>
              ))}
            </Form>
          )}
        </Card.Body>
        <Card.Footer>
          {!submitted && (
            <Button
              variant="success"
              onClick={handleSubmitQuiz}
              disabled={loading || Object.keys(answers).length !== quiz?.questions?.length}
            >
              {loading ? '⏳ جاري التقديم...' : '📤 تقديم الاختبار'}
            </Button>
          )}
        </Card.Footer>
      </Card>
    </Container>
  );
}

// ============ مثال 5: عرض التحليلات والإحصائيات ============

export function AnalyticsExample({ studentId }) {
  const { metrics, loading, getStudentAnalytics } = useAnalytics();

  React.useEffect(() => {
    getStudentAnalytics(studentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  if (loading) return <Spinner />;

  return (
    <Container>
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>📊</h5>
              <h6>معدل الإكمال</h6>
              <h4 className="text-primary">{metrics?.completion_rate || 0}%</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>📈</h5>
              <h6>المعدل العام</h6>
              <h4 className="text-success">{metrics?.average_score || 0}%</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>⏱️</h5>
              <h6>الساعات المنقضية</h6>
              <h4 className="text-info">{metrics?.total_hours || 0}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h5>🎯</h5>
              <h6>درجة الانشراك</h6>
              <h4 className="text-warning">{metrics?.engagement_score || 0}%</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header className="bg-primary text-white">
          <h5>📉 تفاصيل الأداء</h5>
        </Card.Header>
        <Card.Body>
          <Table striped bordered>
            <thead>
              <tr>
                <th>الدورة</th>
                <th>التقدم</th>
                <th>الدرجة</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.courses?.map(course => (
                <tr key={course.id}>
                  <td>{course.title}</td>
                  <td>
                    <ProgressBar now={course.progress} label={`${course.progress}%`} />
                  </td>
                  <td>{course.score}%</td>
                  <td>
                    <span className={`badge bg-${
                      course.status === 'completed' ? 'success' :
                      course.status === 'in_progress' ? 'info' :
                      'secondary'
                    }`}>
                      {course.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

// ============ مثال 6: عرض التوصيات الذكية ============

export function RecommendationsExample({ studentId }) {
  const {
    recommendations,
    loading,
    acceptRecommendation,
    dismissRecommendation
  } = useRecommendations(studentId);

  return (
    <Container>
      <h3>💡 التوصيات الموصى بها</h3>
      {loading ? (
        <Spinner />
      ) : recommendations.length > 0 ? (
        <Row>
          {recommendations.map(rec => (
            <Col md={6} key={rec.id} className="mb-4">
              <Card>
                <Card.Header className="bg-warning text-dark">
                  <h6>{rec.type}</h6>
                </Card.Header>
                <Card.Body>
                  <p>{rec.text}</p>
                  <div className="mb-3">
                    <span className="badge bg-success">{rec.confidence_score}% ثقة</span>
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => acceptRecommendation(rec.id)}
                  >
                    قبول
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="ms-2"
                    onClick={() => dismissRecommendation(rec.id)}
                  >
                    رفض
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Alert variant="info">لا توجد توصيات حالياً</Alert>
      )}
    </Container>
  );
}

// ============ مثال 7: عرض التقدم والإنجازات ============

export function ProgressExample({ studentId }) {
  const { progress, loading } = useProgress(studentId);

  if (loading) return <Spinner />;

  return (
    <Container>
      <Card>
        <Card.Header className="bg-primary text-white">
          <h5>📈 ملخص التقدم</h5>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={6}>
              <h6>الدورات المسجلة</h6>
              <ProgressBar
                now={progress?.enrollment_percentage || 0}
                label={`${progress?.total_enrolled || 0} دورة`}
              />
            </Col>
            <Col md={6}>
              <h6>الدورات المكتملة</h6>
              <ProgressBar
                now={progress?.completion_percentage || 0}
                label={`${progress?.total_completed || 0} دورة`}
                variant="success"
              />
            </Col>
          </Row>

          <Table>
            <thead>
              <tr>
                <th>الإحصائية</th>
                <th>القيمة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>إجمالي الساعات المنقضية</td>
                <td>{progress?.total_hours || 0} ساعة</td>
              </tr>
              <tr>
                <td>المعدل العام</td>
                <td>{progress?.overall_gpa || 0}%</td>
              </tr>
              <tr>
                <td>أيام النشاط</td>
                <td>{progress?.active_days || 0} يوم</td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

// ============ مثال 8: إدارة الملف الشخصي ============

export function ProfileExample({ userId }) {
  const { profile, loading, updateProfile } = useProfile(userId);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile(formData);
    setEditMode(false);
    alert('تم تحديث الملف الشخصي!');
  };

  if (loading) return <Spinner />;

  return (
    <Container>
      <Card className="mt-4">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h5>👤 الملف الشخصي</h5>
          <Button
            variant="light"
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'إلغاء' : '✏️ تعديل'}
          </Button>
        </Card.Header>
        <Card.Body>
          {editMode ? (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>الاسم</Form.Label>
                <Form.Control
                  value={formData.name || ''}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>البريد الإلكتروني</Form.Label>
                <Form.Control
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>أسلوب التعلم</Form.Label>
                <Form.Select
                  value={formData.learning_style || ''}
                  onChange={(e) => setFormData({...formData, learning_style: e.target.value})}
                >
                  <option>بصري</option>
                  <option>سمعي</option>
                  <option>حركي</option>
                  <option>قراءة</option>
                </Form.Select>
              </Form.Group>
              <Button
                variant="success"
                onClick={handleSave}
              >
                💾 حفظ
              </Button>
            </Form>
          ) : (
            <div>
              <p><strong>الاسم:</strong> {profile?.name}</p>
              <p><strong>البريد:</strong> {profile?.email}</p>
              <p><strong>أسلوب التعلم:</strong> {profile?.learning_style}</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

const ILMSExamples = {
  CoursesListExample,
  EnrollmentManagementExample,
  LessonContentExample,
  QuizExample,
  AnalyticsExample,
  RecommendationsExample,
  ProgressExample,
  ProfileExample
};

export default ILMSExamples;
