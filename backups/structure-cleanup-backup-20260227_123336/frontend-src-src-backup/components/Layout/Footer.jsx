/**
 * Footer.jsx - Application Footer Component
 * مكون التذييل
 */

import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>عن النظام</h3>
          <ul>
            <li>
              <a href="#about">حول النظام</a>
            </li>
            <li>
              <a href="#features">المميزات</a>
            </li>
            <li>
              <a href="#version">النسخة</a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>الدعم والمساعدة</h3>
          <ul>
            <li>
              <a href="#help">مركز المساعدة</a>
            </li>
            <li>
              <a href="#contact">تواصل معنا</a>
            </li>
            <li>
              <a href="#documentation">التوثيق</a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>شروط الاستخدام</h3>
          <ul>
            <li>
              <a href="#privacy">سياسة الخصوصية</a>
            </li>
            <li>
              <a href="#terms">شروط الخدمة</a>
            </li>
            <li>
              <a href="#security">الأمان</a>
            </li>
          </ul>
        </div>

        <div className="footer-section contact-info">
          <h3>معلومات الاتصال</h3>
          <div className="contact-details">
            <p>📧 support@company.com</p>
            <p>📞 +966-11-4500000</p>
            <p>🏢 الرياض، المملكة العربية السعودية</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-stats">
          <span>النسخة 2.1.0</span>
          <span>|</span>
          <span>آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</span>
          <span>|</span>
          <span>الحالة: 🟢 تشغيل عادي</span>
        </div>
        <div className="footer-copyright">
          <p>&copy; {currentYear} جميع الحقوق محفوظة. نظام إدارة الموارد البشرية</p>
        </div>
        <div className="footer-social">
          <a href="#twitter">🐦</a>
          <a href="#linkedin">💼</a>
          <a href="#facebook">📘</a>
          <a href="#youtube">📺</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
