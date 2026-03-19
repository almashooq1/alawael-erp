import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Table,
  Badge,
  Form,
  Alert,
  Spinner,
  Modal,
  Accordion
} from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const PolicyApprovals = ({ userId, userName, userRole }) => {
  const [pendingPolicies, setPendingPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [approvalAction, setApprovalAction] = useState('approve');
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/policies/approvals/pending`);
      setPendingPolicies(response.data.data || []);
    } catch (error) {
      toast.error('خطأ في تحميل السياسات المعلقة');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openPolicyModal = (policy) => {
    setSelectedPolicy(policy);
    setApprovalAction('approve');
    setComments('');
    setShowModal(true);
  };

  const handleApprovalSubmit = async () => {
    if (!selectedPolicy) return;

    setProcessing(true);
    try {
      const endpoint = approvalAction === 'approve'
        ? 'approve'
        : 'reject';

      const payload = approvalAction === 'approve'
        ? {
          approverRole: userRole,
          comments
        }
        : {
          approverRole: userRole,
          reason: comments
        };

      await axios.post(
        `${API_BASE}/policies/${selectedPolicy.policyId}/${endpoint}`,
        payload
      );

      toast.success(
        approvalAction === 'approve'
          ? 'تم الموافقة على السياسة'
          : 'تم رفض السياسة'
      );

      setShowModal(false);
      fetchPendingApprovals();
    } catch (error) {
      toast.error('خطأ في معالجة الطلب');
    } finally {
      setProcessing(false);
    }
  };

  const getPendingApprovalCount = (policy) => {
    return policy.approvals.filter(a => a.status === 'PENDING').length;
  };

  const getTotalApprovalsCount = (policy) => {
    return policy.approvals.length;
  };

  const isCurrentUserApprover = (policy) => {
    return policy.approvals.some(a => 
      a.approverRole === userRole && a.status === 'PENDING'
    );
  };

  return (
    <Container className="mt-4" dir="rtl">
      <Row className="mb-4">
        <Col>
          <h2>إدارة موافقات السياسات</h2>
          <p className="text-muted">
            مستخدم: {userName} | الدور: {userRole}
          </p>
        </Col>
      </Row>

      {/* ملخص إحصائي */}
      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h5>السياسات المعلقة</h5>
              <h2 className="text-danger">{pendingPolicies.length}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h5>تنتظر موافقتك</h5>
              <h2 className="text-warning">
                {pendingPolicies.filter(p => isCurrentUserApprover(p)).length}
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* جدول السياسات */}
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" />
        </div>
      ) : (
        <Card>
          <Card.Header>
            <h5 className="mb-0">السياسات المعلقة للموافقة</h5>
          </Card.Header>
          <Card.Body>
            {pendingPolicies.length > 0 ? (
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>اسم السياسة</th>
                      <th>النوع</th>
                      <th>التاريخ</th>
                      <th>حالة الموافقة</th>
                      <th>تنتظر موافقتك</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPolicies.map(policy => (
                      <tr key={policy._id}>
                        <td>
                          <strong>{policy.policyName}</strong>
                          <br />
                          <small className="text-muted">
                            {policy.policyNameAr}
                          </small>
                        </td>
                        <td>{policy.policyType}</td>
                        <td>
                          {new Date(policy.createdAt).toLocaleDateString('ar')}
                        </td>
                        <td>
                          <ApprovalStatusChart
                            approvals={policy.approvals}
                          />
                        </td>
                        <td className="text-center">
                          {isCurrentUserApprover(policy) ? (
                            <Badge bg="danger">نعم ⚠️</Badge>
                          ) : (
                            <Badge bg="success">لا</Badge>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openPolicyModal(policy)}
                            disabled={!isCurrentUserApprover(policy)}
                          >
                            عرض
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <Alert variant="success" className="mb-0">
                🎉 لا توجد سياسات معلقة للموافقة عليها
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}

      {/* نافذة الموافقة */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        dir="rtl"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedPolicy?.policyName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPolicy && (
            <>
              <div className="mb-4">
                <h6>محتوى السياسة:</h6>
                <div className="p-3 bg-light rounded">
                  <p>{selectedPolicy.content}</p>
                </div>
              </div>

              <div className="mb-4">
                <h6>حالة الموافقات:</h6>
                <Accordion>
                  {selectedPolicy.approvals.map((approval, idx) => (
                    <Accordion.Item
                      eventKey={idx.toString()}
                      key={idx}
                    >
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                          <span>{approval.approverRole}</span>
                          <ApprovalBadge status={approval.status} />
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        {approval.status === 'PENDING' ? (
                          <Alert variant="warning">
                            ⏳ في انتظار موافقة {approval.approverRole}
                          </Alert>
                        ) : (
                          <>
                            <p>
                              <strong>الموافق الفعلي:</strong>{' '}
                              {approval.approverName}
                            </p>
                            <p>
                              <strong>التاريخ:</strong>{' '}
                              {new Date(approval.approvalDate)
                                .toLocaleDateString('ar')}
                            </p>
                            {approval.comments && (
                              <p>
                                <strong>الملاحظات:</strong>{' '}
                                {approval.comments}
                              </p>
                            )}
                          </>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </div>

              <Form.Group>
                <Form.Label>اختر الإجراء:</Form.Label>
                <Form.Select
                  value={approvalAction}
                  onChange={(e) => setApprovalAction(e.target.value)}
                  className="mb-3"
                >
                  <option value="approve">✅ الموافقة</option>
                  <option value="reject">❌ الرفض</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>
                  {approvalAction === 'approve' ? 'ملاحظاتك:' : 'سبب الرفض:'}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="أدخل تعليقاتك هنا (اختياري)"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowModal(false)}
          >
            إغلاق
          </Button>
          <Button
            variant={approvalAction === 'approve' ? 'success' : 'danger'}
            onClick={handleApprovalSubmit}
            disabled={processing}
          >
            {processing ? (
              <>
                <Spinner animation="border" size="sm" /> جاري...
              </>
            ) : (
              approvalAction === 'approve'
                ? '✅ الموافقة'
                : '❌ الرفض'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

// مكون مساعد لحالة الموافقة
const ApprovalBadge = ({ status }) => {
  const variants = {
    'PENDING': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger'
  };
  const labels = {
    'PENDING': '⏳ قيد الانتظار',
    'APPROVED': '✅ موافق',
    'REJECTED': '❌ مرفوض'
  };

  return (
    <Badge bg={variants[status]}>
      {labels[status]}
    </Badge>
  );
};

// مكون لعرض حالة الموافقات
const ApprovalStatusChart = ({ approvals }) => {
  const approved = approvals.filter(a => a.status === 'APPROVED').length;
  const rejected = approvals.filter(a => a.status === 'REJECTED').length;
  const pending = approvals.filter(a => a.status === 'PENDING').length;
  const total = approvals.length;

  return (
    <div style={{ width: '200px' }}>
      <div style={{ fontSize: '12px', marginBottom: '5px' }}>
        {approved}/{total} موافق
      </div>
      <div style={{
        display: 'flex',
        height: '20px',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #ddd'
      }}>
        <div
          style={{
            width: `${(approved / total) * 100}%`,
            backgroundColor: '#28a745'
          }}
          title="موافق"
        />
        <div
          style={{
            width: `${(pending / total) * 100}%`,
            backgroundColor: '#ffc107'
          }}
          title="قيد الانتظار"
        />
        <div
          style={{
            width: `${(rejected / total) * 100}%`,
            backgroundColor: '#dc3545'
          }}
          title="مرفوض"
        />
      </div>
    </div>
  );
};

export default PolicyApprovals;
