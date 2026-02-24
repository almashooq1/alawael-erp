import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
  Tabs,
  Tab
} from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const PolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: ''
  });
  const [policyTypes, setPolicyTypes] = useState([]);
  const [policyStatuses, setPolicyStatuses] = useState([]);

  // النموذج
  const [formData, setFormData] = useState({
    policyName: '',
    policyNameAr: '',
    description: '',
    descriptionAr: '',
    policyType: '',
    content: '',
    contentAr: '',
    effectiveDate: '',
    expiryDate: '',
    applicableCategories: [],
    applicableDepartments: [],
    acknowledgementRequired: true,
    trainingRequired: false,
    trainingDuration: 0,
    keyPoints: [],
    keyPointsAr: []
  });

  // تحميل البيانات عند التحميل
  useEffect(() => {
    fetchPolicies();
    fetchMetadata();
  }, [filters]);

  // جلب السياسات
  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(`${API_BASE}/policies?${params}`);
      setPolicies(response.data.data);
    } catch (error) {
      toast.error('خطأ في تحميل السياسات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // جلب معلومات مساعدة
  const fetchMetadata = async () => {
    try {
      const [typesRes, statusesRes] = await Promise.all([
        axios.get(`${API_BASE}/policies/metadata/types`),
        axios.get(`${API_BASE}/policies/metadata/statuses`)
      ]);
      setPolicyTypes(typesRes.data.types);
      setPolicyStatuses(statusesRes.data.statuses);
    } catch (error) {
      console.error('خطأ في تحميل البيانات الوصفية', error);
    }
  };

  // إضافة أو تحديث السياسة
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingPolicy) {
        await axios.put(`${API_BASE}/policies/${editingPolicy.policyId}`, formData);
        toast.success('تم تحديث السياسة بنجاح');
      } else {
        await axios.post(`${API_BASE}/policies`, formData);
        toast.success('تم إنشاء السياسة بنجاح');
      }
      setShowModal(false);
      setFormData({
        policyName: '',
        policyNameAr: '',
        description: '',
        descriptionAr: '',
        policyType: '',
        content: '',
        contentAr: '',
        effectiveDate: '',
        expiryDate: '',
        applicableCategories: [],
        applicableDepartments: [],
        acknowledgementRequired: true,
        trainingRequired: false,
        trainingDuration: 0,
        keyPoints: [],
        keyPointsAr: []
      });
      fetchPolicies();
    } catch (error) {
      toast.error(error.response?.data?.error || 'خطأ في حفظ السياسة');
    } finally {
      setLoading(false);
    }
  };

  // حذف السياسة
  const handleDelete = async (policyId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) {
      try {
        await axios.delete(`${API_BASE}/policies/${policyId}`);
        toast.success('تم حذف السياسة');
        fetchPolicies();
      } catch (error) {
        toast.error('خطأ في حذف السياسة');
      }
    }
  };

  // فتح نافذة الإضافة/التعديل
  const openModal = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        policyName: policy.policyName,
        policyNameAr: policy.policyNameAr,
        description: policy.description,
        descriptionAr: policy.descriptionAr,
        policyType: policy.policyType,
        content: policy.content,
        contentAr: policy.contentAr,
        effectiveDate: policy.effectiveDate?.split('T')[0],
        expiryDate: policy.expiryDate?.split('T')[0] || '',
        applicableCategories: policy.applicableCategories,
        applicableDepartments: policy.applicableDepartments,
        acknowledgementRequired: policy.acknowledgementRequired,
        trainingRequired: policy.trainingRequired,
        trainingDuration: policy.trainingDuration,
        keyPoints: policy.keyPoints,
        keyPointsAr: policy.keyPointsAr
      });
    } else {
      setEditingPolicy(null);
    }
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = {
      'DRAFT': 'secondary',
      'ACTIVE': 'success',
      'PENDING_APPROVAL': 'warning',
      'ARCHIVED': 'dark',
      'SUSPENDED': 'danger'
    };
    const labels = {
      'DRAFT': 'مسودة',
      'ACTIVE': 'نشطة',
      'PENDING_APPROVAL': 'قيد الموافقة',
      'ARCHIVED': 'مؤرشفة',
      'SUSPENDED': 'معلقة'
    };
    return <Badge bg={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <Container className="mt-4" dir="rtl">
      <Row className="mb-4">
        <Col>
          <h2>إدارة السياسات</h2>
        </Col>
        <Col className="text-end">
          <Button
            variant="primary"
            onClick={() => openModal()}
            className="ms-2"
          >
            ➕ إضافة سياسة جديدة
          </Button>
        </Col>
      </Row>

      {/* الفلاتر */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>البحث</Form.Label>
                <Form.Control
                  placeholder="ابحث عن السياسات..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>النوع</Form.Label>
                <Form.Select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="">الكل</option>
                  {policyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>الحالة</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">الكل</option>
                  {policyStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* الجدول */}
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <Card>
          <Table hover responsive>
            <thead>
              <tr>
                <th>اسم السياسة</th>
                <th>النوع</th>
                <th>الحالة</th>
                <th>تاريخ البدء</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {policies.length > 0 ? (
                policies.map(policy => (
                  <tr key={policy._id}>
                    <td>{policy.policyName}</td>
                    <td>{policy.policyType}</td>
                    <td>{getStatusBadge(policy.status)}</td>
                    <td>
                      {new Date(policy.effectiveDate).toLocaleDateString('ar')}
                    </td>
                    <td>
                      <Button
                        variant="info"
                        size="sm"
                        onClick={() => openModal(policy)}
                        className="ms-2"
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(policy.policyId)}
                      >
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    لا توجد سياسات
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      )}

      {/* نافذة الإضافة/التعديل */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingPolicy ? 'تعديل السياسة' : 'إضافة سياسة جديدة'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم السياسة (英文)</Form.Label>
                  <Form.Control
                    required
                    value={formData.policyName}
                    onChange={(e) => setFormData({
                      ...formData,
                      policyName: e.target.value
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>اسم السياسة (العربية)</Form.Label>
                  <Form.Control
                    required
                    value={formData.policyNameAr}
                    onChange={(e) => setFormData({
                      ...formData,
                      policyNameAr: e.target.value
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>نوع السياسة</Form.Label>
              <Form.Select
                required
                value={formData.policyType}
                onChange={(e) => setFormData({
                  ...formData,
                  policyType: e.target.value
                })}
              >
                <option value="">اختر النوع</option>
                {policyTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>الوصف</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                required
                value={formData.description}
                onChange={(e) => setFormData({
                  ...formData,
                  description: e.target.value
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>محتوى السياسة</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                required
                value={formData.content}
                onChange={(e) => setFormData({
                  ...formData,
                  content: e.target.value
                })}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ البدء</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      effectiveDate: e.target.value
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>تاريخ الانتهاء (اختياري)</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      expiryDate: e.target.value
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="مطلوب الاعتراف به"
                checked={formData.acknowledgementRequired}
                onChange={(e) => setFormData({
                  ...formData,
                  acknowledgementRequired: e.target.checked
                })}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="مطلوب تدريب"
                checked={formData.trainingRequired}
                onChange={(e) => setFormData({
                  ...formData,
                  trainingRequired: e.target.checked
                })}
              />
            </Form.Group>

            {formData.trainingRequired && (
              <Form.Group className="mb-3">
                <Form.Label>مدة التدريب (بالساعات)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.trainingDuration}
                  onChange={(e) => setFormData({
                    ...formData,
                    trainingDuration: parseInt(e.target.value)
                  })}
                />
              </Form.Group>
            )}

            <div className="d-flex gap-2">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'حفظ'}
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                إلغاء
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default PolicyManagement;
