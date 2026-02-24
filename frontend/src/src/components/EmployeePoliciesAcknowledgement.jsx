import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Badge,
  ListGroup,
  Modal,
  Accordion,
  Spinner,
  ProgressBar
} from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const EmployeePoliciesAcknowledgement = ({ employeeId, employeeName }) => {
  const [pendingAcknowledgements, setPendingAcknowledgements] = useState([]);
  const [acknowledgedPolicies, setAcknowledgedPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedPolicies, setSelectedPolicies] = useState([]);
  const [acknowledging, setAcknowledging] = useState(false);

  // تحميل الاعترافات المعلقة
  useEffect(() => {
    fetchPendingAcknowledgements();
    fetchAcknowledgedPolicies();
  }, []);

  const fetchPendingAcknowledgements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/acknowledgements/pending`, {
        params: { employeeId }
      });
      setPendingAcknowledgements(response.data.data || []);
    } catch (error) {
      toast.error('خطأ في تحميل السياسات المعلقة');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcknowledgedPolicies = async () => {
    try {
      // هذا سيتم إضافته لاحقاً
      setAcknowledgedPolicies([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAcknowledge = async () => {
    if (selectedPolicies.length === 0) {
      toast.warning('اختر سياسة واحدة على الأقل');
      return;
    }

    setAcknowledging(true);
    try {
      await axios.post(`${API_BASE}/policies/acknowledge/batch`, {
        employeeId,
        policyIds: selectedPolicies
      });

      toast.success('تم الاعتراف بالسياسات بنجاح');
      setSelectedPolicies([]);
      fetchPendingAcknowledgements();
    } catch (error) {
      toast.error('خطأ في الاعتراف بالسياسات');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleSelectPolicy = (acknowledgementId) => {
    setSelectedPolicies(prev => {
      if (prev.includes(acknowledgementId)) {
        return prev.filter(id => id !== acknowledgementId);
      } else {
        return [...prev, acknowledgementId];
      }
    });
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Container className="mt-4" dir="rtl">
      {/* رسالة ترحيب */}
      <Row className="mb-4">
        <Col>
          <h3>مرحباً بك، {employeeName}</h3>
          <p className="text-muted">
            هنا يمكنك مراجعة والاعتراف بالسياسات المطلوبة
          </p>
        </Col>
      </Row>

      {/* ملخص إحصائي */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h5>السياسات المعلقة</h5>
              <h2 className="text-danger">
                {pendingAcknowledgements.length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h5>المعترف به</h5>
              <h2 className="text-success">
                {acknowledgedPolicies.length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center">
            <Card.Body>
              <h5>نسبة الاعتراف</h5>
              <h2 className="text-info">
                {pendingAcknowledgements.length === 0
                  ? '100%'
                  : (
                    (acknowledgedPolicies.length /
                      (pendingAcknowledgements.length + acknowledgedPolicies.length) * 100)
                      .toFixed(0) + '%'
                  )}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* السياسات المعلقة */}
      <Card className="mb-4">
        <Card.Header className="bg-warning">
          <h5 className="mb-0">السياسات المعلقة للاعتراف</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center">
              <Spinner animation="border" />
            </div>
          ) : pendingAcknowledgements.length > 0 ? (
            <>
              <ListGroup className="mb-3">
                {pendingAcknowledgements.map((ack) => {
                  const overdue = isOverdue(ack.dueDate);
                  const daysLeft = getDaysUntilDue(ack.dueDate);

                  return (
                    <ListGroup.Item
                      key={ack._id}
                      className={`d-flex justify-content-between align-items-start ${
                        overdue ? 'border-danger' : ''
                      }`}
                    >
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selectedPolicies.includes(ack._id)}
                          onChange={() => handleSelectPolicy(ack._id)}
                          id={ack._id}
                        />
                        <label className="form-check-label" htmlFor={ack._id}>
                          <div className="mb-1">
                            <strong>{ack.policyName}</strong>
                          </div>
                          <small className="text-muted">
                            تاريخ الاستحقاق:{' '}
                            {new Date(ack.dueDate).toLocaleDateString('ar')}
                          </small>
                        </label>
                      </div>
                      <div>
                        {overdue ? (
                          <Badge bg="danger">منتهية الصلاحية</Badge>
                        ) : daysLeft <= 3 ? (
                          <Badge bg="warning">قريب جداً ({daysLeft} أيام)</Badge>
                        ) : (
                          <Badge bg="info">{daysLeft} أيام</Badge>
                        )}
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                          setSelectedPolicy(ack);
                          setShowPolicyModal(true);
                        }}
                      >
                        عرض التفاصيل
                      </Button>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>

              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  disabled={selectedPolicies.length === 0 || acknowledging}
                  onClick={handleAcknowledge}
                >
                  {acknowledging ? (
                    <>
                      <Spinner animation="border" size="sm" /> جاري الحفظ...
                    </>
                  ) : (
                    `الاعتراف بـ ${selectedPolicies.length} سياسة`
                  )}
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => setSelectedPolicies([])}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </>
          ) : (
            <Alert variant="success" className="mb-0">
              ✅ لا توجد سياسات معلقة - لقد وافقت على جميع السياسات المطلوبة
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* السياسات المعترف بها */}
      {acknowledgedPolicies.length > 0 && (
        <Card>
          <Card.Header className="bg-success text-white">
            <h5 className="mb-0">السياسات المعترف بها</h5>
          </Card.Header>
          <Card.Body>
            <ListGroup>
              {acknowledgedPolicies.map((policy) => (
                <ListGroup.Item key={policy._id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{policy.policyName}</strong>
                      <br />
                      <small className="text-muted">
                        تم الاعتراف بتاريخ:{' '}
                        {new Date(policy.acknowledgedDate).toLocaleDateString('ar')}
                      </small>
                    </div>
                    <Badge bg="success">معترف به</Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      )}

      {/* نافذة عرض تفاصيل السياسة */}
      <Modal
        show={showPolicyModal}
        onHide={() => setShowPolicyModal(false)}
        size="lg"
        dir="rtl"
      >
        <Modal.Header closeButton>
          <Modal.Title>{selectedPolicy?.policyName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPolicy && (
            <>
              <div className="mb-3">
                <h6>الوصف:</h6>
                <p>{selectedPolicy.policyName}</p>
              </div>

              <div className="mb-3">
                <h6>تاريخ الاستحقاق:</h6>
                <p>
                  {new Date(selectedPolicy.dueDate).toLocaleDateString('ar')}
                </p>
              </div>

              {selectedPolicy.trainingRequired && (
                <Alert variant="info">
                  ⚠️ هذه السياسة تتطلب تدريب إلزامي
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPolicyModal(false)}
          >
            إغلاق
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              handleSelectPolicy(selectedPolicy._id);
              setShowPolicyModal(false);
            }}
          >
            الاعتراف بهذه السياسة
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeePoliciesAcknowledgement;
