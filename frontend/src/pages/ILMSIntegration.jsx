// دمج نظام إدارة التعلم الذكي مع التطبيق الرئيسي
// Intelligent Learning Management System Integration

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, Row, Col, Navbar, Nav, Badge, Dropdown, DropdownButton,
  Alert, Spinner, Modal, Button
} from 'react-bootstrap';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// استيراد المكونات
import IntelligentLMSDashboard from './components/ILMSComponents';
import { ILMSProvider, useNotifications } from './hooks/useILMS';

// ================ شريط الملاحة ================

const NavigationBar = ({ user, token, unreadNotifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <Navbar bg="dark" variant="dark" sticky="top" className="mb-4 shadow-sm">
      <Container fluid>
        <Navbar.Brand as={Link} to="/ilms">
          📚 نظام إدارة التعلم الذكي
        </Navbar.Brand>

        <Nav className="ms-auto align-items-center">
          <Nav.Link as={Link} to="/ilms">
            الرئيسية
          </Nav.Link>

          <Nav.Link as={Link} to="/ilms/courses">
            الدورات
          </Nav.Link>

          <Nav.Link as={Link} to="/ilms/my-learning">
            تعليمي
          </Nav.Link>

          <Nav.Link as={Link} to="/ilms/analytics">
            التحليلات
          </Nav.Link>

          {/* الإشعارات */}
          <div className="ms-3 position-relative">
            <button
              className="btn btn-outline-light position-relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔 الإشعارات
              {unreadNotifications > 0 && (
                <Badge
                  bg="danger"
                  className="position-absolute top-0 start-100 translate-middle"
                >
                  {unreadNotifications}
                </Badge>
              )}
            </button>

            {showNotifications && <NotificationsDropdown />}
          </div>

          {/* قائمة المستخدم */}
          {user && (
            <div className="ms-3">
              <DropdownButton
                id="user-menu"
                title={`👤 ${user.name || 'المستخدم'}`}
                variant="outline-light"
              >
                <Dropdown.Item as={Link} to="/ilms/profile">
                  الملف الشخصي
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/ilms/settings">
                  الإعدادات
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => logout()}>
                  تسجيل الخروج
                </Dropdown.Item>
              </DropdownButton>
            </div>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
};

// ================ قائمة الإشعارات ================

const NotificationsDropdown = () => {
  const { notifications, markAsRead } = useNotifications();

  return (
    <div className="notifications-dropdown position-absolute top-100 end-0 mt-2 bg-white rounded shadow-lg p-3" style={{ width: '300px', maxHeight: '400px', overflowY: 'auto', zIndex: 1000 }}>
      {notifications && notifications.length > 0 ? (
        <>
          {notifications.slice(0, 5).map((notification) => (
            <div
              key={notification.id}
              className={`p-2 mb-2 border-bottom cursor-pointer ${!notification.read ? 'bg-light' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <small className="d-block text-muted">{notification.title}</small>
              <small className="d-block">{notification.message}</small>
              <small className="text-muted">{new Date(notification.created_at).toLocaleString('ar-EG')}</small>
            </div>
          ))}
          <Link to="/ilms/notifications" className="btn btn-sm btn-primary w-100 mt-2">
            عرض جميع الإشعارات
          </Link>
        </>
      ) : (
        <p className="text-center text-muted m-0">لا توجد إشعارات</p>
      )}
    </div>
  );
};

// ================ الصفحة الرئيسية ================

const HomePage = () => {
  return (
    <Container className="mt-5">
      <Row>
        <Col md={8} className="mx-auto">
          <div className="jumbotron bg-light p-5 rounded">
            <h1 className="display-4">🎓 نظام إدارة التعلم الذكي</h1>
            <p className="lead">
              منصة تعليمية ذكية تجمع بين تقنيات الذكاء الاصطناعي والتعلم المخصص
            </p>
            <hr className="my-4" />
            <p>استكشف دوراتك الموصى بها وتتبع تقدمك</p>
            <Link to="/ilms/courses" className="btn btn-primary btn-lg">
              ابدأ الآن
            </Link>
          </div>

          <Row className="mt-5">
            <Col md={6} className="mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">📚 الدورات الذكية</h5>
                  <p className="card-text">
                    دورات مخصصة تتكيف مع سرعة تعلمك واحتياجاتك
                  </p>
                </div>
              </div>
            </Col>

            <Col md={6} className="mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">📊 التحليلات المتقدمة</h5>
                  <p className="card-text">
                    تتبع تقدمك بتفاصيل شاملة ورؤى قيمة
                  </p>
                </div>
              </div>
            </Col>

            <Col md={6} className="mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">💡 التوصيات الذكية</h5>
                  <p className="card-text">
                    احصل على توصيات شخصية تحسن تعلمك
                  </p>
                </div>
              </div>
            </Col>

            <Col md={6} className="mb-3">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">🎯 أسلوب التعلم</h5>
                  <p className="card-text">
                    محتوى يتناسب مع أسلوب تعلمك الفريد
                  </p>
                </div>
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

// ================ صفحة الملف الشخصي ================

const ProfilePage = ({ userId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/${userId}/profile`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setProfile(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('فشل تحميل الملف الشخصي:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/users/${userId}/profile`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setProfile(response.data);
      setEditMode(false);
    } catch (error) {
      console.error('فشل تحديث الملف الشخصي:', error);
    }
  };

  if (loading) return <Spinner />;

  return (
    <Container className="mt-4">
      <Row>
        <Col md={8} className="mx-auto">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4>👤 الملف الشخصي</h4>
            </div>
            <div className="card-body">
              {editMode ? (
                <form>
                  <div className="mb-3">
                    <label className="form-label">الاسم</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">البريد الإلكتروني</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">السيرة الذاتية</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">أسلوب التعلم المفضل</label>
                    <select
                      className="form-control"
                      value={formData.learning_style || ''}
                      onChange={(e) => setFormData({ ...formData, learning_style: e.target.value })}
                    >
                      <option value="">اختر أسلوب التعلم</option>
                      <option value="visual">بصري</option>
                      <option value="auditory">سمعي</option>
                      <option value="kinesthetic">حركي</option>
                      <option value="reading">قراءة/كتابة</option>
                    </select>
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleSaveProfile}
                    >
                      حفظ
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditMode(false)}
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-3">
                    <strong>الاسم:</strong> {profile?.name}
                  </div>
                  <div className="mb-3">
                    <strong>البريد الإلكتروني:</strong> {profile?.email}
                  </div>
                  <div className="mb-3">
                    <strong>السيرة الذاتية:</strong> {profile?.bio || 'لم يتم إدخال السيرة'}
                  </div>
                  <div className="mb-3">
                    <strong>أسلوب التعلم:</strong> {profile?.learning_style || 'لم يتم تحديده'}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setEditMode(true)}
                  >
                    ✏️ تعديل
                  </button>
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

// ================ صفحة الإعدادات ================

const SettingsPage = ({ userId }) => {
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    email_notifications: true,
    theme: 'light',
    language: 'ar'
  });

  const handleSettingChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const saveSettings = async () => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/users/${userId}/settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('فشل حفظ الإعدادات:', error);
    }
  };

  return (
    <Container className="mt-4">
      <Row>
        <Col md={8} className="mx-auto">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4>⚙️ الإعدادات</h4>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="notificationsToggle"
                    checked={settings.notifications_enabled}
                    onChange={(e) => handleSettingChange('notifications_enabled', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="notificationsToggle">
                    تفعيل الإشعارات
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="emailToggle"
                    checked={settings.email_notifications}
                    onChange={(e) => handleSettingChange('email_notifications', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="emailToggle">
                    استقبال إشعارات البريد الإلكتروني
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">المظهر</label>
                <select
                  className="form-control"
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                >
                  <option value="light">فاتح</option>
                  <option value="dark">مظلم</option>
                  <option value="auto">تلقائي</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">اللغة</label>
                <select
                  className="form-control"
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                >
                  <option value="ar">العربية</option>
                  <option value="en">الإنجليزية</option>
                </select>
              </div>

              <button
                className="btn btn-success"
                onClick={saveSettings}
              >
                💾 حفظ الإعدادات
              </button>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

// ================ التطبيق الرئيسي ================

export const ILMSApp = ({ token, userId }) => {
  const { notifications } = useNotifications(userId);

  return (
    <Router>
      <NavigationBar
        user={{ name: 'الطالب' }}
        token={token}
        unreadNotifications={notifications.filter(n => !n.read).length}
      />

      <Routes>
        <Route path="/ilms" element={<HomePage />} />
        <Route
          path="/ilms/dashboard"
          element={<IntelligentLMSDashboard token={token} userId={userId} />}
        />
        <Route path="/ilms/profile" element={<ProfilePage userId={userId} />} />
        <Route path="/ilms/settings" element={<SettingsPage userId={userId} />} />
        <Route path="/ilms/*" element={<IntelligentLMSDashboard token={token} userId={userId} />} />
      </Routes>
    </Router>
  );
};

// ================ التصدير النهائي ================

export const ILMSIntegration = ({ token, userId }) => {
  return (
    <ILMSProvider token={token} userId={userId}>
      <ILMSApp token={token} userId={userId} />
    </ILMSProvider>
  );
};

export default ILMSIntegration;
