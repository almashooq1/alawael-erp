/**
 * Disability Rehabilitation Dashboard
 * لوحة التحكم الرئيسية لنظام تأهيل ذوي الإعاقة
 *
 * @component
 * @version 1.0.0
 * @date 2026-01-19
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FaUsers, FaChartLine, FaCheckCircle, FaClock, FaPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [programs, setPrograms] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [filter, setFilter] = useState({
    status: 'all',
    disability_type: 'all',
    search: ''
  });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
  const API_ENDPOINT = `${API_BASE}/disability-rehabilitation`;

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchData();
  }, [filter]);

  // جلب البرامج والإحصائيات
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // جلب البرامج
      const programsResponse = await axios.get(
        `${API_ENDPOINT}/programs`,
        {
          params: {
            status: filter.status !== 'all' ? filter.status : undefined,
            disability_type: filter.disability_type !== 'all' ? filter.disability_type : undefined,
            search: filter.search || undefined,
            limit: 50
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // جلب الإحصائيات
      const statsResponse = await axios.get(
        `${API_ENDPOINT}/statistics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setPrograms(programsResponse.data.data || []);
      setStatistics(statsResponse.data.data);

      // معالجة البيانات للرسم البياني
      if (statsResponse.data.data?.by_disability_type) {
        const chartData = Object.entries(statsResponse.data.data.by_disability_type).map(([type, count]) => ({
          name: translateDisabilityType(type),
          value: count
        }));
        setPerformanceData(chartData);
      }

      setError(null);
    } catch (err) {
      setError('خطأ في جلب البيانات: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ترجمة أنواع الإعاقات
  const translateDisabilityType = (type) => {
    const translations = {
      physical: 'إعاقة حركية',
      visual: 'إعاقة بصرية',
      hearing: 'إعاقة سمعية',
      intellectual: 'إعاقة ذهنية',
      autism: 'اضطراب طيف التوحد',
      learning: 'صعوبات تعلم',
      multiple: 'إعاقة متعددة',
      speech: 'إعاقة نطق ولغة',
      behavioral: 'اضطرابات سلوكية',
      developmental: 'تأخر نمائي'
    };
    return translations[type] || type;
  };

  // ترجمة حالة البرنامج
  const translateStatus = (status) => {
    const translations = {
      active: 'نشط',
      paused: 'موقوف',
      completed: 'مكتمل',
      cancelled: 'ملغى'
    };
    return translations[status] || status;
  };

  // ترجمة شدة الإعاقة
  const translateSeverity = (severity) => {
    const translations = {
      mild: 'بسيط',
      moderate: 'متوسط',
      severe: 'شديد',
      profound: 'عميق'
    };
    return translations[severity] || severity;
  };

  // ألوان للحالات
  const getStatusBadgeVariant = (status) => {
    const variants = {
      active: 'success',
      paused: 'warning',
      completed: 'info',
      cancelled: 'danger'
    };
    return variants[status] || 'secondary';
  };

  // ألوان الرسم البياني
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#82d982', '#ffa502', '#ff85c0', '#8b8b8b'];

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">جاري التحميل...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container fluid className="disability-rehabilitation-dashboard py-4">
      {/* رؤوس البيانات */}
      <div className="dashboard-header mb-4">
        <h1 className="text-primary mb-3">📊 لوحة التحكم - نظام تأهيل ذوي الإعاقة</h1>
        <Button variant="primary" size="lg" className="mb-3">
          <FaPlus /> برنامج جديد
        </Button>
      </div>

      {/* الرسائل */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* البطاقات الإحصائية */}
      {statistics && (
        <Row className="mb-4">
          <Col md={3} sm={6} className="mb-3">
            <Card className="stat-card">
              <Card.Body>
                <div className="d-flex align-items-center">
                  <div className="icon-box bg-primary text-white">
                    <FaUsers size={24} />
                  </div>
                  <div className="ms-3">
                    <h6 className="text-muted mb-1">إجمالي البرامج</h6>
                    <h3 className="text-primary">{statistics.total_programs || 0}</h3>
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
                    <FaCheckCircle size={24} />
                  </div>
                  <div className="ms-3">
                    <h6 className="text-muted mb-1">برامج نشطة</h6>
                    <h3 className="text-success">{statistics.active_programs || 0}</h3>
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
                    <FaClock size={24} />
                  </div>
                  <div className="ms-3">
                    <h6 className="text-muted mb-1">برامج مكتملة</h6>
                    <h3 className="text-info">{statistics.completed_programs || 0}</h3>
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
                    <FaChartLine size={24} />
                  </div>
                  <div className="ms-3">
                    <h6 className="text-muted mb-1">معدل النجاح</h6>
                    <h3 className="text-warning">{statistics.success_rate?.toFixed(1) || 0}%</h3>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* الرسوم البيانية */}
      <Row className="mb-4">
        <Col lg={6} md={12} className="mb-3">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">توزيع البرامج حسب نوع الإعاقة</Card.Title>
            </Card.Header>
            <Card.Body>
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center">لا توجد بيانات</p>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} md={12} className="mb-3">
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">إحصائيات حالة البرامج</Card.Title>
            </Card.Header>
            <Card.Body>
              {statistics?.by_status && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(statistics.by_status).map(([status, count]) => ({
                    name: translateStatus(status),
                    count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted text-center">لا توجد بيانات</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* قائمة البرامج */}
      <Card className="mb-4">
        <Card.Header>
          <Card.Title className="mb-0">
            📋 قائمة البرامج ({programs.length})
          </Card.Title>
        </Card.Header>
        <Card.Body>
          {/* الفلاتر */}
          <Row className="mb-3">
            <Col md={4}>
              <input
                type="text"
                className="form-control"
                placeholder="بحث..."
                value={filter.search}
                onChange={(e) => setFilter({...filter, search: e.target.value})}
              />
            </Col>
            <Col md={4}>
              <select
                className="form-select"
                value={filter.status}
                onChange={(e) => setFilter({...filter, status: e.target.value})}
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="paused">موقوف</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغى</option>
              </select>
            </Col>
            <Col md={4}>
              <select
                className="form-select"
                value={filter.disability_type}
                onChange={(e) => setFilter({...filter, disability_type: e.target.value})}
              >
                <option value="all">جميع أنواع الإعاقات</option>
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
              </select>
            </Col>
          </Row>

          {/* جدول البرامج */}
          {programs.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>معرف البرنامج</th>
                    <th>اسم المستفيد</th>
                    <th>نوع الإعاقة</th>
                    <th>الحالة</th>
                    <th>التقدم</th>
                    <th>تاريخ البداية</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr key={program._id}>
                      <td>
                        <code className="text-primary">{program.program_id}</code>
                      </td>
                      <td>{program.beneficiary_name_ar}</td>
                      <td>{translateDisabilityType(program.disability_info?.primary_disability)}</td>
                      <td>
                        <Badge bg={getStatusBadgeVariant(program.program_status)}>
                          {translateStatus(program.program_status)}
                        </Badge>
                      </td>
                      <td>
                        <div className="progress" style={{ height: '20px' }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${program.completion_rate || 0}%` }}
                          >
                            {program.completion_rate || 0}%
                          </div>
                        </div>
                      </td>
                      <td>{new Date(program.start_date).toLocaleDateString('ar-SA')}</td>
                      <td>
                        <Button variant="info" size="sm" title="عرض">
                          <FaEye />
                        </Button>{' '}
                        <Button variant="warning" size="sm" title="تعديل">
                          <FaEdit />
                        </Button>{' '}
                        <Button variant="danger" size="sm" title="حذف">
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted text-center py-4">لا توجد برامج</p>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Dashboard;
