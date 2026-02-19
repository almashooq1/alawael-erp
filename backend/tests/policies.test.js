const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Policy = require('../../models/Policy');
const PolicyAcknowledgement = require('../../models/PolicyAcknowledgement');

describe('Policy Management System', () => {
  let server;
  let authToken;
  let createdPolicyId;

  before(async () => {
    // التوصل بقاعدة البيانات
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI_TEST);
    }
    server = app.listen();
    
    // محاكاة المصادقة
    authToken = 'test-auth-token';
  });

  after(async () => {
    await Policy.deleteMany({});
    await PolicyAcknowledgement.deleteMany({});
    server.close();
    await mongoose.connection.close();
  });

  describe('السياسات - CRUD', () => {
    it('إنشاء سياسة جديدة', (done) => {
      const policyData = {
        policyName: 'Test Policy',
        policyNameAr: 'سياسة الاختبار',
        description: 'Test Description',
        descriptionAr: 'وصف الاختبار',
        policyType: 'SALARY_INCENTIVES',
        content: 'Policy content here',
        contentAr: 'محتوى السياسة هنا',
        effectiveDate: new Date(),
        applicableCategories: ['ALL_EMPLOYEES'],
        createdBy: 'test-user',
        createdByName: 'Test User'
      };

      request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(policyData)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.should.have.property('policy');
          createdPolicyId = res.body.policy.policyId;
          
          done();
        });
    });

    it('الحصول على السياسة', (done) => {
      request(app)
        .get(`/api/policies/${createdPolicyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.policy.should.have.property('policyId', createdPolicyId);
          
          done();
        });
    });

    it('تحديث السياسة', (done) => {
      const updateData = {
        policyName: 'Updated Policy',
        updatedBy: 'test-user',
        updatedByName: 'Test User'
      };

      request(app)
        .put(`/api/policies/${createdPolicyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.policy.policyName.should.equal('Updated Policy');
          res.body.policy.version.should.equal(2);
          
          done();
        });
    });

    it('الحصول على جميع السياسات', (done) => {
      request(app)
        .get('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.should.have.property('data');
          res.body.should.have.property('pagination');
          
          done();
        });
    });
  });

  describe('الموافقات', () => {
    it('إرسال السياسة للموافقة', (done) => {
      const approvalData = {
        approvers: ['POLICY_MANAGER', 'COMPLIANCE_OFFICER']
      };

      request(app)
        .post(`/api/policies/${createdPolicyId}/submit-approval`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(approvalData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.policy.status.should.equal('PENDING_APPROVAL');
          res.body.policy.approvals.should.have.lengthOf(2);
          
          done();
        });
    });

    it('الموافقة على السياسة', (done) => {
      const approvalData = {
        approverRole: 'POLICY_MANAGER',
        comments: 'Approved'
      };

      request(app)
        .post(`/api/policies/${createdPolicyId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(approvalData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          
          const approval = res.body.policy.approvals.find(
            a => a.approverRole === 'POLICY_MANAGER'
          );
          approval.status.should.equal('APPROVED');
          
          done();
        });
    });

    it('رفض السياسة', (done) => {
      const policyData = {
        policyName: 'Test Policy for Rejection',
        policyNameAr: 'سياسة الاختبار للرفض',
        description: 'Test',
        descriptionAr: 'اختبار',
        policyType: 'LEAVE_VACATION',
        content: 'Test content',
        contentAr: 'محتوى اختبار',
        effectiveDate: new Date(),
        createdBy: 'test-user'
      };

      request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(policyData)
        .end((err, res1) => {
          if (err) return done(err);

          const policyId = res1.body.policy.policyId;

          request(app)
            .post(`/api/policies/${policyId}/submit-approval`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ approvers: ['POLICY_MANAGER'] })
            .end(() => {
              const rejectData = {
                approverRole: 'POLICY_MANAGER',
                reason: 'Does not meet requirements'
              };

              request(app)
                .post(`/api/policies/${policyId}/reject`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(rejectData)
                .expect(200)
                .end((err, res) => {
                  if (err) return done(err);
                  
                  res.body.should.have.property('success', true);
                  res.body.policy.status.should.equal('DRAFT');
                  
                  done();
                });
            });
        });
    });
  });

  describe('الاعترافات', () => {
    let policyIdForAck;

    before((done) => {
      const policyData = {
        policyName: 'Acknowledgement Test Policy',
        policyNameAr: 'سياسة اختبار الاعتراف',
        description: 'Test',
        descriptionAr: 'اختبار',
        policyType: 'SECURITY_COMPLIANCE',
        content: 'Test content',
        contentAr: 'محتوى اختبار',
        effectiveDate: new Date(),
        acknowledgementRequired: true,
        createdBy: 'test-user'
      };

      request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(policyData)
        .end((err, res) => {
          if (err) return done(err);
          policyIdForAck = res.body.policy._id;
          done();
        });
    });

    it('إرسال السياسة للاعتراف', (done) => {
      const ackData = {
        employees: [
          {
            employeeId: 'EMP001',
            employeeName: 'محمد علي',
            department: 'IT',
            email: 'mohammed@example.com'
          }
        ]
      };

      request(app)
        .post(`/api/policies/${policyIdForAck}/send-acknowledgement`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(ackData)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.acknowledgements.should.have.lengthOf(1);
          
          done();
        });
    });

    it('الاعتراف بالسياسات', (done) => {
      // الحصول على الاعترافات المعلقة أولاً
      request(app)
        .get('/api/acknowledgements/pending')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ employeeId: 'EMP001' })
        .end((err, res1) => {
          if (err) return done(err);

          if (res1.body.data.length === 0) {
            return done(new Error('No pending acknowledgements found'));
          }

          const policyIds = res1.body.data.map(a => a.policyId._id || a.policyId);

          const ackPayload = {
            employeeId: 'EMP001',
            policyIds
          };

          request(app)
            .post('/api/policies/acknowledge/batch')
            .set('Authorization', `Bearer ${authToken}`)
            .send(ackPayload)
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              
              res.body.should.have.property('success', true);
              res.body.results[0].should.have.property('success', true);
              
              done();
            });
        });
    });

    it('الحصول على تقرير الاعترافات', (done) => {
      request(app)
        .get(`/api/policies/${policyIdForAck}/acknowledgement-report`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.report.should.have.property('totalEmployees');
          res.body.report.should.have.property('acknowledged');
          res.body.report.should.have.property('pending');
          
          done();
        });
    });
  });

  describe('المعلومات المساعدة', () => {
    it('الحصول على أنواع السياسات', (done) => {
      request(app)
        .get('/api/policies/metadata/types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.types.should.be.an('array');
          res.body.types.length.should.be.above(0);
          
          done();
        });
    });

    it('الحصول على حالات السياسات', (done) => {
      request(app)
        .get('/api/policies/metadata/statuses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.statuses.should.be.an('array');
          
          done();
        });
    });

    it('الحصول على الإحصائيات', (done) => {
      request(app)
        .get('/api/policies/analytics/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          
          res.body.should.have.property('success', true);
          res.body.stats.should.have.property('totalPolicies');
          res.body.stats.should.have.property('activePolicies');
          
          done();
        });
    });
  });

  describe('الحذف', () => {
    it('حذف السياسة', (done) => {
      const policyData = {
        policyName: 'Policy to Delete',
        policyNameAr: 'سياسة للحذف',
        description: 'Test',
        descriptionAr: 'اختبار',
        policyType: 'HR_PROCEDURES',
        content: 'Test content',
        contentAr: 'محتوى اختبار',
        effectiveDate: new Date(),
        createdBy: 'test-user'
      };

      request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(policyData)
        .end((err, res1) => {
          if (err) return done(err);

          const policyIdToDelete = res1.body.policy.policyId;

          request(app)
            .delete(`/api/policies/${policyIdToDelete}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              
              res.body.should.have.property('success', true);
              
              // التحقق من الحذف
              request(app)
                .get(`/api/policies/${policyIdToDelete}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404)
                .end(done);
            });
        });
    });
  });
});
