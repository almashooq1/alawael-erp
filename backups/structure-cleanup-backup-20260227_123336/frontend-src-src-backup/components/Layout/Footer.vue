<template>
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-section">
        <h4>عن النظام</h4>
        <p>نظام الأوائل - حل متكامل لإدارة مراكز التدريب والعلم</p>
      </div>

      <div class="footer-section">
        <h4>الروابط السريعة</h4>
        <ul class="footer-links">
          <li>
            <router-link to="/about">حول النظام</router-link>
          </li>
          <li>
            <router-link to="/support">الدعم الفني</router-link>
          </li>
          <li>
            <router-link to="/privacy">سياسة الخصوصية</router-link>
          </li>
          <li>
            <router-link to="/terms">شروط الاستخدام</router-link>
          </li>
        </ul>
      </div>

      <div class="footer-section">
        <h4>التواصل</h4>
        <ul class="footer-contact">
          <li>
            <span class="icon">📧</span>
            <a href="mailto:info@alawael.com">info@alawael.com</a>
          </li>
          <li>
            <span class="icon">📱</span>
            <a href="tel:+201234567890">+20 123 456 7890</a>
          </li>
          <li>
            <span class="icon">📍</span>
            <span>القاهرة، مصر</span>
          </li>
        </ul>
      </div>

      <div class="footer-section">
        <h4>شبكات التواصل</h4>
        <div class="social-links">
          <a href="#" title="Facebook" aria-label="فيس بوك">
            <span class="social-icon">f</span>
          </a>
          <a href="#" title="Twitter" aria-label="تويتر">
            <span class="social-icon">𝕏</span>
          </a>
          <a href="#" title="Instagram" aria-label="إنستجرام">
            <span class="social-icon">📷</span>
          </a>
          <a href="#" title="LinkedIn" aria-label="لينكد إن">
            <span class="social-icon">in</span>
          </a>
        </div>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="footer-copyright">
        <p>
          © {{ currentYear }} نظام الأوائل.
          <span class="separator">|</span>
          جميع الحقوق محفوظة
        </p>
      </div>
      <div class="footer-meta">
        <span class="version">الإصدار {{ version }}</span>
        <span class="separator">|</span>
        <span class="updated">آخر تحديث: {{ lastUpdated }}</span>
      </div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
  data() {
    return {
      version: '1.0.0',
      currentYear: new Date().getFullYear(),
      lastUpdated: this.formatDate(new Date()),
    }
  },
  methods: {
    formatDate(date) {
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date)
    },
  },
}
</script>

<style scoped>
.footer {
  background: var(--color-gray-900);
  color: var(--color-gray-200);
  padding: var(--spacing-2xl) var(--spacing-xl);
  border-top: 1px solid var(--color-gray-800);
  margin-top: auto;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
}

.footer-section h4 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--text-base);
  color: var(--color-white);
  font-weight: 700;
}

.footer-section p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-gray-300);
}

.footer-links,
.footer-contact {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.footer-links li,
.footer-contact li {
  font-size: var(--text-sm);
}

.footer-links a {
  color: var(--color-gray-300);
  text-decoration: none;
  transition: all var(--transition-base);
}

.footer-links a:hover {
  color: var(--color-primary-400);
}

.footer-contact .icon {
  margin-left: var(--spacing-sm);
}

.footer-contact a {
  color: var(--color-gray-300);
  text-decoration: none;
  transition: all var(--transition-base);
}

.footer-contact a:hover {
  color: var(--color-primary-400);
}

.social-links {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-md);
}

.social-links a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-gray-800);
  border-radius: var(--radius-sm);
  color: var(--color-gray-300);
  text-decoration: none;
  font-weight: 700;
  transition: all var(--transition-base);
}

.social-links a:hover {
  background: var(--color-primary-600);
  color: white;
}

.footer-bottom {
  border-top: 1px solid var(--color-gray-800);
  padding-top: var(--spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.footer-copyright,
.footer-meta {
  font-size: var(--text-sm);
  color: var(--color-gray-400);
}

.footer-copyright p,
.footer-meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.separator {
  opacity: 0.5;
}

.version,
.updated {
  white-space: nowrap;
}

/* الاستجابة */
@media (max-width: 768px) {
  .footer {
    padding: var(--spacing-xl) var(--spacing-lg);
  }

  .footer-content {
    gap: var(--spacing-xl);
  }

  .footer-bottom {
    flex-direction: column;
    text-align: center;
  }

  .footer-copyright p,
  .footer-meta {
    justify-content: center;
  }
}

/* الوضع الليلي */
:global(.dark) .footer {
  background: var(--color-gray-950);
  border-top-color: var(--color-gray-700);
}

:global(.dark) .footer-bottom {
  border-top-color: var(--color-gray-700);
}

:global(.dark) .social-links a {
  background: var(--color-gray-700);
}
</style>
