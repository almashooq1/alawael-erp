/**
 * Create Rehabilitation Program Form
 * نموذج إنشاء برنامج تأهيلي جديد
 *
 * @component
 * @version 1.0.0
 * @date 2026-01-19
 */

import React, { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { FaSave, FaTimesCircle, FaPlus, FaMinus } from 'react-icons/fa';
import axios from 'axios';
import './CreateProgram.css';

const CreateProgram = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    program_name_ar: '',
    program_name_en: '',
    beneficiary_id: '',
    beneficiary_name_ar: '',
    beneficiary_name_en: '',
    beneficiary_date_of_birth: '',
    disability_info: {
      primary_disability: 'physical',
      secondary_disabilities: [],
      severity: 'moderate',
      diagnosis_date: '',
      assessment_results: '',
    },
    rehabilitation_goals: [
      {
        goal_name_ar: '',
        goal_name_en: '',
        goal_category: 'mobility',
        target_date: '',
        priority: 'high',
      },
    ],
    services: [
      {
        service_type: 'physiotherapy',
        frequency: 'weekly',
        duration_weeks: 12,
      },
    ],
    program_start_date: '',
    expected_end_date: '',
    case_manager_id: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
  const API_ENDPOINT = `${API_BASE}/disability-rehabilitation`;

  // معالج تغيير الحقول
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // معالج تغيير حقول الإعاقة
  const handleDisabilityChange = e => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      disability_info: {
        ...formData.disability_info,
        [name]: value,
      },
    });
  };

  // معالج تغيير الأهداف
  const handleGoalChange = (index, field, value) => {
    const newGoals = [...formData.rehabilitation_goals];
    newGoals[index][field] = value;
    setFormData({
      ...formData,
      rehabilitation_goals: newGoals,
    });
  };

  // إضافة هدف جديد
  const addGoal = () => {
    setFormData({
      ...formData,
      rehabilitation_goals: [
        ...formData.rehabilitation_goals,
        {
          goal_name_ar: '',
          goal_name_en: '',
          goal_category: 'mobility',
          target_date: '',
          priority: 'high',
        },
      ],
    });
  };

  // حذف هدف
  const removeGoal = index => {
    const newGoals = formData.rehabilitation_goals.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      rehabilitation_goals: newGoals,
    });
  };

  // معالج تغيير الخدمات
  const handleServiceChange = (index, field, value) => {
    const newServices = [...formData.services];
    newServices[index][field] = value;
    setFormData({
      ...formData,
      services: newServices,
    });
  };

  // إضافة خدمة جديدة
  const addService = () => {
    setFormData({
      ...formData,
      services: [
        ...formData.services,
        {
          service_type: 'physiotherapy',
          frequency: 'weekly',
          duration_weeks: 12,
        },
      ],
    });
  };

  // حذف خدمة
  const removeService = index => {
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      services: newServices,
    });
  };

  // إرسال النموذج
  const handleSubmit = async e => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const response = await axios.post(`${API_ENDPOINT}/programs`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      }, 1500);
    } catch (err) {
      setError('خطأ في حفظ البرنامج: ' + (err.response?.data?.message || err.message));
      console.error('Error creating program:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="create-program-form">
      <Card.Header className="bg-primary text-white">
        <Card.Title className="mb-0">➕ إنشاء برنامج تأهيلي جديد</Card.Title>
      </Card.Header>

      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">✅ تم حفظ البرنامج بنجاح!</Alert>}

        <Form onSubmit={handleSubmit}>
          {/* معلومات البرنامج الأساسية */}
          <section className="form-section mb-4">
            <h5 className="section-title">📋 معلومات البرنامج</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم البرنامج (العربية) *</Form.Label>
                  <Form.Control
                    type="text"
                    name="program_name_ar"
                    value={formData.program_name_ar}
                    onChange={handleInputChange}
                    required
                    placeholder="مثال: برنامج تأهيل حركي شامل"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم البرنامج (English)</Form.Label>
                  <Form.Control
                    type="text"
                    name="program_name_en"
                    value={formData.program_name_en}
                    onChange={handleInputChange}
                    placeholder="e.g., Comprehensive Mobility Rehabilitation Program"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ البداية *</Form.Label>
                  <Form.Control
                    type="date"
                    name="program_start_date"
                    value={formData.program_start_date}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>التاريخ المتوقع للانتهاء</Form.Label>
                  <Form.Control
                    type="date"
                    name="expected_end_date"
                    value={formData.expected_end_date}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
          </section>

          {/* معلومات المستفيد */}
          <section className="form-section mb-4">
            <h5 className="section-title">👤 معلومات المستفيد</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>معرف المستفيد *</Form.Label>
                  <Form.Control
                    type="text"
                    name="beneficiary_id"
                    value={formData.beneficiary_id}
                    onChange={handleInputChange}
                    required
                    placeholder="مثال: BEN-001"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ الميلاد</Form.Label>
                  <Form.Control
                    type="date"
                    name="beneficiary_date_of_birth"
                    value={formData.beneficiary_date_of_birth}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم المستفيد (العربية) *</Form.Label>
                  <Form.Control
                    type="text"
                    name="beneficiary_name_ar"
                    value={formData.beneficiary_name_ar}
                    onChange={handleInputChange}
                    required
                    placeholder="الاسم بالعربية"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم المستفيد (English)</Form.Label>
                  <Form.Control
                    type="text"
                    name="beneficiary_name_en"
                    value={formData.beneficiary_name_en}
                    onChange={handleInputChange}
                    placeholder="Name in English"
                  />
                </Form.Group>
              </Col>
            </Row>
          </section>

          {/* معلومات الإعاقة */}
          <section className="form-section mb-4">
            <h5 className="section-title">♿ معلومات الإعاقة</h5>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>نوع الإعاقة الأساسية *</Form.Label>
                  <Form.Select
                    name="primary_disability"
                    value={formData.disability_info.primary_disability}
                    onChange={handleDisabilityChange}
                  >
                    <option value="physical">إعاقة حركية</option>
                    <option value="visual">إعاقة بصرية</option>
                    <option value="hearing">إعاقة سمعية</option>
                    <option value="intellectual">إعاقة ذهنية</option>
                    <option value="autism">اضطراب طيف التوحد</option>
                    <option value="learning">صعوبات تعلم</option>
                    <option value="multiple">إعاقة متعددة</option>
                    <option value="speech">إعاقة نطق ولغة</option>
                    <option value="behavioral">اضطرابات سلوكية</option>
                    <option value="developmental">تأخر نمائي</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>شدة الإعاقة</Form.Label>
                  <Form.Select
                    name="severity"
                    value={formData.disability_info.severity}
                    onChange={handleDisabilityChange}
                  >
                    <option value="mild">بسيط</option>
                    <option value="moderate">متوسط</option>
                    <option value="severe">شديد</option>
                    <option value="profound">عميق</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ التشخيص</Form.Label>
                  <Form.Control
                    type="date"
                    name="diagnosis_date"
                    value={formData.disability_info.diagnosis_date}
                    onChange={handleDisabilityChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>نتائج التقييم الأولي</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="assessment_results"
                    value={formData.disability_info.assessment_results}
                    onChange={handleDisabilityChange}
                    placeholder="نتائج التقييم الأولي للمستفيد"
                  />
                </Form.Group>
              </Col>
            </Row>
          </section>

          {/* الأهداف التأهيلية */}
          <section className="form-section mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="section-title mb-0">🎯 الأهداف التأهيلية</h5>
              <Button variant="success" size="sm" onClick={addGoal}>
                <FaPlus /> إضافة هدف
              </Button>
            </div>

            {formData.rehabilitation_goals.map((goal, index) => (
              <Card key={index} className="mb-3 bg-light">
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>اسم الهدف (العربية)</Form.Label>
                        <Form.Control
                          type="text"
                          value={goal.goal_name_ar}
                          onChange={e => handleGoalChange(index, 'goal_name_ar', e.target.value)}
                          placeholder="مثال: تحسين القدرات الحركية"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>اسم الهدف (English)</Form.Label>
                        <Form.Control
                          type="text"
                          value={goal.goal_name_en}
                          onChange={e => handleGoalChange(index, 'goal_name_en', e.target.value)}
                          placeholder="e.g., Improve motor skills"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>فئة الهدف</Form.Label>
                        <Form.Select
                          value={goal.goal_category}
                          onChange={e => handleGoalChange(index, 'goal_category', e.target.value)}
                        >
                          <option value="mobility">حركة</option>
                          <option value="communication">التواصل</option>
                          <option value="self_care">العناية الشخصية</option>
                          <option value="cognitive">معرفي</option>
                          <option value="social">اجتماعي</option>
                          <option value="academic">أكاديمي</option>
                          <option value="vocational">مهني</option>
                          <option value="behavioral">سلوكي</option>
                          <option value="emotional">عاطفي</option>
                          <option value="adaptive">تكيفي</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>الأولوية</Form.Label>
                        <Form.Select
                          value={goal.priority}
                          onChange={e => handleGoalChange(index, 'priority', e.target.value)}
                        >
                          <option value="high">عالية</option>
                          <option value="medium">متوسطة</option>
                          <option value="low">منخفضة</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>التاريخ المستهدف</Form.Label>
                        <Form.Control
                          type="date"
                          value={goal.target_date}
                          onChange={e => handleGoalChange(index, 'target_date', e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {formData.rehabilitation_goals.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeGoal(index)}
                      className="mt-2"
                    >
                      <FaMinus /> حذف هذا الهدف
                    </Button>
                  )}
                </Card.Body>
              </Card>
            ))}
          </section>

          {/* الخدمات */}
          <section className="form-section mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="section-title mb-0">🏥 الخدمات التأهيلية</h5>
              <Button variant="success" size="sm" onClick={addService}>
                <FaPlus /> إضافة خدمة
              </Button>
            </div>

            {formData.services.map((service, index) => (
              <Card key={index} className="mb-3 bg-light">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>نوع الخدمة</Form.Label>
                        <Form.Select
                          value={service.service_type}
                          onChange={e => handleServiceChange(index, 'service_type', e.target.value)}
                        >
                          <option value="physiotherapy">العلاج الطبيعي</option>
                          <option value="occupational">العلاج الوظيفي</option>
                          <option value="speech">العلاج النطقي</option>
                          <option value="psychological">الدعم النفسي</option>
                          <option value="educational">التعليم الخاص</option>
                          <option value="social">العمل الاجتماعي</option>
                          <option value="nursing">التمريض</option>
                          <option value="assistive_tech">التكنولوجيا المساعدة</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>التكرار</Form.Label>
                        <Form.Select
                          value={service.frequency}
                          onChange={e => handleServiceChange(index, 'frequency', e.target.value)}
                        >
                          <option value="daily">يومي</option>
                          <option value="tri_weekly">ثلاثة مرات أسبوعياً</option>
                          <option value="weekly">أسبوعي</option>
                          <option value="bi_weekly">مرتين شهرياً</option>
                          <option value="monthly">شهري</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>مدة الخدمة (بالأسابيع)</Form.Label>
                        <Form.Control
                          type="number"
                          value={service.duration_weeks}
                          onChange={e =>
                            handleServiceChange(index, 'duration_weeks', e.target.value)
                          }
                          min="1"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {formData.services.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeService(index)}
                      className="mt-2"
                    >
                      <FaMinus /> حذف هذه الخدمة
                    </Button>
                  )}
                </Card.Body>
              </Card>
            ))}
          </section>

          {/* ملاحظات عامة */}
          <section className="form-section mb-4">
            <Form.Group className="mb-3">
              <Form.Label>ملاحظات عامة</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="أي معلومات إضافية أو ملاحظات مهمة"
              />
            </Form.Group>
          </section>

          {/* أزرار العمل */}
          <div className="form-actions">
            <Button variant="primary" size="lg" type="submit" disabled={loading} className="me-2">
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <FaSave className="me-2" />
                  حفظ البرنامج
                </>
              )}
            </Button>
            <Button variant="secondary" size="lg" onClick={onCancel} disabled={loading}>
              <FaTimesCircle className="me-2" />
              إلغاء
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default CreateProgram;
