# Security Policy | سياسة الأمان

## Supported Versions | الإصدارات المدعومة

We release patches for security vulnerabilities for the following versions:

ندعم إصلاحات الثغرات الأمنية للإصدارات التالية:

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability | الإبلاغ عن ثغرة أمنية

### English

If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public issue
2. Email us at: [INSERT SECURITY EMAIL]
3. Include detailed information:
   - Type of vulnerability
   - Location of the affected code
   - Step-by-step instructions to reproduce
   - Potential impact
   - Suggested fix (if any)

**Response Time:**
- Initial response: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity (Critical: 72h, High: 2 weeks, Medium: 1 month)

### العربية

إذا اكتشفت ثغرة أمنية، يرجى اتباع الخطوات التالية:

1. **لا تفتح** مشكلة عامة
2. راسلنا عبر البريد الإلكتروني: [أدخل بريد الأمان]
3. قم بتضمين معلومات مفصلة:
   - نوع الثغرة
   - موقع الكود المتأثر
   - تعليمات خطوة بخطوة للتكرار
   - التأثير المحتمل
   - الإصلاح المقترح (إن وجد)

**وقت الاستجابة:**
- الرد الأولي: خلال 48 ساعة
- تحديث الحالة: خلال 7 أيام
- جدول الإصلاح: يعتمد على الخطورة (حرج: 72 ساعة، عالي: أسبوعين، متوسط: شهر)

## Security Best Practices | أفضل ممارسات الأمان

### For Developers | للمطورين

- Always use environment variables for sensitive data
- Never commit `.env` files
- Use parameterized queries to prevent SQL injection
- Validate and sanitize all user inputs
- Keep dependencies up to date
- Use HTTPS for all external communications
- Implement rate limiting on APIs
- Use JWT with short expiration times

### For Administrators | للمسؤولين

- Keep the server and dependencies updated
- Use strong, unique passwords
- Enable two-factor authentication where possible
- Regularly backup the database
- Monitor logs for suspicious activity
- Implement firewall rules
- Use SSL/TLS certificates

## Known Security Features | ميزات الأمان المعروفة

✅ JWT Authentication with refresh tokens  
✅ Password hashing with bcrypt  
✅ Role-based access control (RBAC)  
✅ Input validation and sanitization  
✅ Rate limiting on API endpoints  
✅ Helmet.js for HTTP headers security  
✅ CORS configuration  
✅ SQL injection prevention  
✅ XSS protection  
✅ CSRF tokens (where applicable)

## Security Audits | عمليات تدقيق الأمان

Last security audit: January 2026  
Next scheduled audit: June 2026

---

**Last Updated:** January 18, 2026  
**Security Contact:** [INSERT EMAIL]
