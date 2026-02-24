# 🚀 Civil Defense Integration - Quick Start Guide
## دليل البدء السريع لتكامل الدفاع المدني

**Version**: 1.0.0  
**Language**: العربية | English  
**Last Updated**: February 19, 2026

---

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Create `.env` file:

```env
# API Configuration
CIVIL_DEFENSE_API_URL=https://998.gov.sa/api/v1
CIVIL_DEFENSE_API_KEY=your_api_key
CIVIL_DEFENSE_API_SECRET=your_api_secret

# Database
MONGODB_URI=mongodb://localhost:27017/civil-defense

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_app_password

# Server
PORT=3001
NODE_ENV=development
```

### Step 3: Start Server

```bash
npm start
```

### Step 4: Test the API

```bash
curl -X GET 'http://localhost:3001/api/civil-defense/health' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 📋 Common Tasks

### Request Safety Certificate

```bash
curl -X POST 'http://localhost:3001/api/civil-defense/certificates/request' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "facilityId": "FAC001",
    "buildingType": "commercial",
    "facilitySizeMeters": 5000,
    "address": {
      "street": "King Fahd Road",
      "city": "Riyadh",
      "region": "Riyadh",
      "postalCode": "12345"
    },
    "numberOfFloors": 5,
    "occupancyCapacity": 500,
    "contactPerson": {
      "name": "Ahmed Al-Saud",
      "phone": "+966541234567",
      "email": "ahmed@example.com"
    }
  }'
```

### Check Certificate Status

```bash
curl -X GET 'http://localhost:3001/api/civil-defense/certificates/CERT-2026-001/status' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Schedule an Audit

```bash
curl -X POST 'http://localhost:3001/api/civil-defense/audits/schedule' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "facilityId": "FAC001",
    "auditType": "periodic",
    "buildingType": "commercial",
    "facilitySizeMeters": 5000,
    "preferredDate": "2026-02-28",
    "contactPerson": {
      "name": "Ahmed Al-Saud",
      "phone": "+966541234567",
      "email": "ahmed@example.com"
    }
  }'
```

### Get Compliance Status

```bash
curl -X GET 'http://localhost:3001/api/civil-defense/compliance/FAC001' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### Schedule Emergency Drill

```bash
curl -X POST 'http://localhost:3001/api/civil-defense/emergency-drills/schedule' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "facilityId": "FAC001",
    "drillType": "fire_evacuation",
    "scenario": "Fire on 3rd floor",
    "expectedParticipants": 500,
    "scheduledDate": "2026-03-05",
    "scheduledTime": "10:00 AM",
    "durationMinutes": 30,
    "coordinator": {
      "name": "Ahmed Al-Saud",
      "phone": "+966541234567",
      "email": "ahmed@example.com"
    }
  }'
```

---

## 🔍 API Endpoints

### Certificates
- `POST /certificates/request` - Request new certificate
- `GET /certificates/:certificateId/status` - Get certificate status
- `POST /certificates/:certificateId/renew` - Renew certificate
- `GET /certificates/facility/:facilityId` - List facility certificates
- `GET /certificates` - List all certificates

### Audits
- `POST /audits/schedule` - Schedule audit
- `GET /audits/:auditId` - Get audit details
- `GET /audits/facility/:facilityId` - List facility audits
- `GET /audit-slots/available` - Get available slots
- `POST /audits/:auditId/complete` - Complete audit

### Compliance
- `GET /compliance/:facilityId` - Get compliance status
- `GET /compliance/:facilityId/violations` - Get violations
- `POST /compliance/:facilityId/resolve-violation` - Resolve violation
- `GET /compliance/report/:facilityId` - Generate compliance report

### Fire Safety
- `POST /fire-safety/inspections/schedule` - Schedule inspection
- `GET /fire-safety/status/:facilityId` - Get fire safety status
- `POST /fire-safety/equipment/update` - Update equipment status
- `POST /fire-safety/maintenance/log` - Log maintenance

### Emergency Management
- `POST /emergency-drills/schedule` - Schedule emergency drill
- `GET /emergency-drills/:drillId/results` - Get drill results
- `GET /emergency-drills/facility/:facilityId` - List facility drills
- `POST /emergency-drills/:drillId/complete` - Complete drill

### Documents
- `POST /documents/upload` - Upload documents
- `GET /documents/:facilityId` - Get facility documents
- `DELETE /documents/:documentId` - Delete document
- `GET /documents/requirements/:buildingType` - Get required documents

### Reports
- `GET /reports/dashboard` - Get dashboard data
- `GET /reports/facility/:facilityId` - Generate facility report
- `POST /reports/export` - Export report

---

## 📚 Integration Steps

### Step 1: Request API Access

Contact Civil Defense Authority:
- **Website**: https://998.gov.sa
- **Email**: api@998.gov.sa
- **Phone**: +966-11-XXX-XXXX

### Step 2: Get API Credentials

You'll receive:
- API Key
- API Secret
- API Documentation
- Test Environment URL

### Step 3: Add to Your Application

```javascript
// app.js
const express = require('express');
const civilDefenseRoutes = require('./routes/civilDefense.routes');

const app = express();

// Add Civil Defense routes
app.use('/api/civil-defense', civilDefenseRoutes);

// Start server
app.listen(3001, () => {
  console.log('Civil Defense Integration ready!');
});
```

### Step 4: Initialize Models

```javascript
// Database setup
const mongoose = require('mongoose');
const { SafetyCertificate, SafetyAudit, ComplianceStatus } = 
  require('./models/civilDefense.model');

mongoose.connect(process.env.MONGODB_URI);
```

### Step 5: Test Integration

```bash
npm test
```

---

## 🛠️ Configuration Options

### API Configuration

```javascript
// service initialization
const civilDefenseService = require('./services/civilDefenseIntegration.service');

// The service uses these environment variables:
// - CIVIL_DEFENSE_API_URL
// - CIVIL_DEFENSE_API_KEY
// - CIVIL_DEFENSE_API_SECRET
```

### Caching Options

The service includes built-in caching:

```javascript
// Cache TTL: 1 hour
// Cached data:
// - Certificate status
// - Audit slots
// - Compliance status
```

### Email Notifications

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

Events that trigger emails:
- Certificate approval
- Audit confirmation
- Violation notice
- Compliance alerts
- Emergency drill notification

---

## 🔐 Security Best Practices

1. **API Key Management**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Authentication**
   - Always use Bearer tokens
   - Implement rate limiting
   - Use HTTPS only

3. **Data Protection**
   - Encrypt sensitive data
   - Validate all inputs
   - Use parameterized queries

4. **Audit Logging**
   - Log all API calls
   - Track user actions
   - Monitor error rates

---

## 📊 Building Type Support

| Type | Requirements | Documents |
|------|--------------|-----------|
| **Commercial** | 5+ floors, 100+ occupancy | Floor plan, Fire plan, Evacuation plan |
| **Industrial** | Heavy equipment, chemicals | Safety assessment, Environmental report |
| **Healthcare** | Medical equipment, emergency routes | Medical gas report, Infection control |
| **Educational** | Student capacity, evacuation | Campus plan, Capacity report |
| **Residential** | Occupancy limits, exits | Floor plan, Safety equipment list |

---

## 🎯 Typical Workflow

```
1. Request Safety Certificate
   ↓
2. Monitor Certificate Status
   ↓
3. Schedule Initial Audit
   ↓
4. Review Audit Findings
   ↓
5. Schedule Compliance Follow-up
   ↓
6. Monitor Compliance Status
   ↓
7. Schedule Fire Safety Inspections
   ↓
8. Conduct Emergency Drills
   ↓
9. Generate Annual Report
   ↓
10. Renew Certificate
```

---

## ✅ Verification Checklist

Before going to production:

- [ ] All environment variables configured
- [ ] Database connected and working
- [ ] API credentials verified
- [ ] SSL/HTTPS enabled
- [ ] Monitoring set up
- [ ] Logging configured
- [ ] Backup strategy implemented
- [ ] All tests passing
- [ ] Documentation reviewed
- [ ] Team trained on system

---

## 🆘 Getting Help

### Documentation
- Full API Reference: `docs/CIVIL_DEFENSE_INTEGRATION_DOCUMENTATION.md`
- Examples: `examples/` directory
- Tests: `tests/civilDefense.test.js`

### Troubleshooting
Common issues and solutions in `docs/TROUBLESHOOTING.md`

### Support
- **Email**: support@example.com
- **Slack**: #civil-defense-integration
- **Phone**: +966-11-XXX-XXXX

---

## 📈 Monitoring & Maintenance

### Key Metrics to Monitor
- API response time
- Certificate approval rate
- Audit completion time
- Compliance percentage
- Error rate
- Uptime percentage

### Regular Maintenance
- Weekly: Review audit logs
- Monthly: Update compliance status
- Quarterly: Review violations
- Annually: Renew certificates
- Annually: Safety audit

---

## 🎓 Learning Resources

### Beginner
- Start with Quick Start Guide (this file)
- Review API endpoints
- Run example requests

### Intermediate
- Study full API documentation
- Implement in your application
- Run integration tests

### Advanced
- Customize models
- Implement caching strategy
- Add custom reports
- Extend service features

---

**Ready to get started?**

```bash
npm install
npm start
npm test
```

For more details, see the full documentation: `docs/CIVIL_DEFENSE_INTEGRATION_DOCUMENTATION.md`

---

**Support**: support@example.com | **Version**: 1.0.0 | **Updated**: February 19, 2026
