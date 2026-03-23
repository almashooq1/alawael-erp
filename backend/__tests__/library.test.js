/**
 * Library & Resources — backend integration tests
 *
 * Tests the /api/library endpoints:
 *  - Dashboard & Statistics
 *  - Resource Types
 *  - Categories CRUD
 *  - Resources CRUD + Search + Barcode + Bulk Import
 *  - Loans: Checkout, Return, Renew, Overdue
 *  - Reservations: Create, Cancel
 *  - Members CRUD
 *  - Reviews
 *  - Suppliers
 *  - Maintenance Records
 *  - Full Workflow: Checkout → Renew → Return
 */

const request = require('supertest');
const express = require('express');

// ── Minimal auth mock ──
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', name: 'Test Admin', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const router = require('../routes/library.routes');
  app.use('/api/library', router);
});

// ══════════════════════════════════════════════════════════
//  1. Dashboard & KPIs
// ══════════════════════════════════════════════════════════

describe('Library — Dashboard', () => {
  test('GET /dashboard → returns KPIs and charts', async () => {
    const res = await request(app).get('/api/library/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpis, byType, byCategory, mostBorrowed, topRated, recentLoans, monthlyLoans } =
      res.body.data;
    expect(kpis).toHaveProperty('totalResources');
    expect(kpis).toHaveProperty('totalQuantity');
    expect(kpis).toHaveProperty('availableQuantity');
    expect(kpis).toHaveProperty('activeLoans');
    expect(kpis).toHaveProperty('overdueLoans');
    expect(kpis).toHaveProperty('totalMembers');
    expect(kpis).toHaveProperty('totalValue');
    expect(kpis).toHaveProperty('averageRating');
    expect(kpis.totalResources).toBeGreaterThanOrEqual(10);
    expect(kpis.totalMembers).toBeGreaterThanOrEqual(4);
    expect(byType).toBeDefined();
    expect(byCategory).toBeInstanceOf(Array);
    expect(mostBorrowed).toBeInstanceOf(Array);
    expect(topRated).toBeInstanceOf(Array);
    expect(recentLoans).toBeInstanceOf(Array);
    expect(monthlyLoans).toBeDefined();
  });

  test('GET /statistics → returns utilization and trends', async () => {
    const res = await request(app).get('/api/library/statistics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d).toHaveProperty('utilizationRate');
    expect(d).toHaveProperty('onTimeRate');
    expect(d).toHaveProperty('avgDuration');
    expect(d).toHaveProperty('topBorrowers');
    expect(d).toHaveProperty('byCondition');
    expect(d).toHaveProperty('totalFines');
    expect(d.topBorrowers).toBeInstanceOf(Array);
  });

  test('GET /resource-types → returns all resource types', async () => {
    const res = await request(app).get('/api/library/resource-types');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
    expect(res.body.data[0]).toHaveProperty('value');
    expect(res.body.data[0]).toHaveProperty('label');
    expect(res.body.data[0]).toHaveProperty('icon');
  });
});

// ══════════════════════════════════════════════════════════
//  2. Categories
// ══════════════════════════════════════════════════════════

describe('Library — Categories', () => {
  test('GET /categories → lists all categories', async () => {
    const res = await request(app).get('/api/library/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('type');
    expect(res.body.data[0]).toHaveProperty('icon');
    expect(res.body.data[0]).toHaveProperty('color');
    expect(res.body.data[0]).toHaveProperty('resourceCount');
  });

  test('GET /categories/:id → single category', async () => {
    const res = await request(app).get('/api/library/categories/100');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('كتب علمية');
  });

  test('GET /categories/:id → 404 for missing', async () => {
    const res = await request(app).get('/api/library/categories/9999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  let newCatId;
  test('POST /categories → create new category', async () => {
    const res = await request(app).post('/api/library/categories').send({
      name: 'خرائط ذهنية',
      nameEn: 'Mind Maps',
      type: 'educational',
      icon: 'Map',
      color: '#ff5722',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('خرائط ذهنية');
    newCatId = res.body.data.id;
  });

  test('PUT /categories/:id → update category', async () => {
    const res = await request(app).put(`/api/library/categories/${newCatId}`).send({
      name: 'خرائط ذهنية محدّثة',
      color: '#3f51b5',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('خرائط ذهنية محدّثة');
    expect(res.body.data.color).toBe('#3f51b5');
  });

  test('DELETE /categories/:id → delete empty category', async () => {
    const res = await request(app).delete(`/api/library/categories/${newCatId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /categories/:id → 400 if category has resources', async () => {
    const res = await request(app).delete('/api/library/categories/100');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /categories → 400 missing name', async () => {
    const res = await request(app).post('/api/library/categories').send({ type: 'book' });
    expect(res.status).toBe(400);
  });

  test('POST /categories → 400 missing type', async () => {
    const res = await request(app).post('/api/library/categories').send({ name: 'Test' });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  3. Resources
// ══════════════════════════════════════════════════════════

describe('Library — Resources', () => {
  test('GET /resources → list with pagination', async () => {
    const res = await request(app).get('/api/library/resources');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(res.body).toHaveProperty('totalPages');
  });

  test('GET /resources?type=book → filter by type', async () => {
    const res = await request(app).get('/api/library/resources?type=book');
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.type).toBe('book'));
  });

  test('GET /resources?categoryId=101 → filter by category', async () => {
    const res = await request(app).get('/api/library/resources?categoryId=101');
    expect(res.status).toBe(200);
    res.body.data.forEach(r => expect(r.categoryId).toBe('101'));
  });

  test('GET /resources?search=علاج → search filter', async () => {
    const res = await request(app).get('/api/library/resources?search=%D8%B9%D9%84%D8%A7%D8%AC');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /resources/search?q=TENS → full-text search', async () => {
    const res = await request(app).get('/api/library/resources/search?q=TENS');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /resources/search → 400 without query', async () => {
    const res = await request(app).get('/api/library/resources/search');
    expect(res.status).toBe(400);
  });

  test('GET /resources/barcode/LIB-001 → find by barcode', async () => {
    const res = await request(app).get('/api/library/resources/barcode/LIB-001');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('أساسيات العلاج الطبيعي');
  });

  test('GET /resources/barcode/NOPE → 404 for missing barcode', async () => {
    const res = await request(app).get('/api/library/resources/barcode/NOPE');
    expect(res.status).toBe(404);
  });

  test('GET /resources/:id → single resource with category', async () => {
    const res = await request(app).get('/api/library/resources/1000');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('أساسيات العلاج الطبيعي');
    expect(res.body.data.category).toBeDefined();
    expect(res.body.data.category.name).toBe('كتب علمية');
  });

  test('GET /resources/:id → 404 for missing', async () => {
    const res = await request(app).get('/api/library/resources/99999');
    expect(res.status).toBe(404);
  });

  let newResId;
  test('POST /resources → create new resource', async () => {
    const res = await request(app).post('/api/library/resources').send({
      name: 'دليل التأهيل المهني',
      nameEn: 'Vocational Rehabilitation Guide',
      categoryId: '100',
      type: 'book',
      author: 'د. فهد العمري',
      isbn: '978-9953-87-999-1',
      quantity: 3,
      cost: 150,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('دليل التأهيل المهني');
    expect(res.body.data.quantity).toBe(3);
    expect(res.body.data.availableQty).toBe(3);
    newResId = res.body.data.id;
  });

  test('PUT /resources/:id → update resource', async () => {
    const res = await request(app).put(`/api/library/resources/${newResId}`).send({
      name: 'دليل التأهيل المهني - الطبعة المحدّثة',
      quantity: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('دليل التأهيل المهني - الطبعة المحدّثة');
    expect(res.body.data.quantity).toBe(5);
  });

  test('DELETE /resources/:id → delete resource', async () => {
    const res = await request(app).delete(`/api/library/resources/${newResId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /resources → 400 missing name', async () => {
    const res = await request(app).post('/api/library/resources').send({
      categoryId: '100',
      type: 'book',
    });
    expect(res.status).toBe(400);
  });

  test('POST /resources → 400 missing category', async () => {
    const res = await request(app).post('/api/library/resources').send({
      name: 'Test',
      type: 'book',
    });
    expect(res.status).toBe(400);
  });

  test('POST /resources → 400 missing type', async () => {
    const res = await request(app).post('/api/library/resources').send({
      name: 'Test',
      categoryId: '100',
    });
    expect(res.status).toBe(400);
  });

  test('POST /resources/bulk-import → import multiple resources', async () => {
    const res = await request(app)
      .post('/api/library/resources/bulk-import')
      .send({
        items: [
          { name: 'Import 1', categoryId: '100', type: 'book' },
          { name: 'Import 2', categoryId: '101', type: 'therapeutic_tool' },
          { name: '', categoryId: '100', type: 'book' }, // should fail
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(2);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.errors.length).toBe(1);
  });

  test('POST /resources/bulk-import → 400 empty', async () => {
    const res = await request(app).post('/api/library/resources/bulk-import').send({ items: [] });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  4. Loans
// ══════════════════════════════════════════════════════════

describe('Library — Loans', () => {
  test('GET /loans → list all loans', async () => {
    const res = await request(app).get('/api/library/loans');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    expect(res.body.data[0]).toHaveProperty('resourceName');
    expect(res.body.data[0]).toHaveProperty('memberName');
  });

  test('GET /loans?status=active → filter active loans', async () => {
    const res = await request(app).get('/api/library/loans?status=active');
    expect(res.status).toBe(200);
    res.body.data.forEach(l => expect(l.status).toBe('active'));
  });

  test('GET /loans?memberId=2000 → filter by member', async () => {
    const res = await request(app).get('/api/library/loans?memberId=2000');
    expect(res.status).toBe(200);
    res.body.data.forEach(l => expect(l.memberId).toBe('2000'));
  });

  test('GET /loans/overdue → overdue loans', async () => {
    const res = await request(app).get('/api/library/loans/overdue');
    expect(res.status).toBe(200);
    // All seed loans have passed due dates, so most should be overdue
    expect(res.body.success).toBe(true);
  });

  test('GET /loans/:id → single loan with details', async () => {
    const res = await request(app).get('/api/library/loans/5000');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('resource');
    expect(res.body.data).toHaveProperty('member');
  });

  test('GET /loans/:id → 404 for missing', async () => {
    const res = await request(app).get('/api/library/loans/99999');
    expect(res.status).toBe(404);
  });

  // Create a resource for loan testing
  let testResId;
  test('POST /resources → create resource for loan test', async () => {
    const res = await request(app).post('/api/library/resources').send({
      name: 'مورد اختبار الإعارة',
      categoryId: '102',
      type: 'educational',
      quantity: 2,
    });
    expect(res.status).toBe(201);
    testResId = res.body.data.id;
  });

  let loanId;
  test('POST /loans → checkout resource', async () => {
    const res = await request(app).post('/api/library/loans').send({
      resourceId: testResId,
      memberId: '2002', // Khalid — 0 active loans
      loanDays: 14,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.resourceId).toBe(testResId);
    loanId = res.body.data.id;
  });

  test('POST /loans → 400 duplicate active loan', async () => {
    const res = await request(app).post('/api/library/loans').send({
      resourceId: testResId,
      memberId: '2002',
    });
    expect(res.status).toBe(400);
  });

  test('POST /loans → 400 missing resourceId', async () => {
    const res = await request(app).post('/api/library/loans').send({ memberId: '2002' });
    expect(res.status).toBe(400);
  });

  test('POST /loans → 400 missing memberId', async () => {
    const res = await request(app).post('/api/library/loans').send({ resourceId: testResId });
    expect(res.status).toBe(400);
  });

  test('POST /loans → 404 missing resource', async () => {
    const res = await request(app).post('/api/library/loans').send({
      resourceId: '99999',
      memberId: '2002',
    });
    expect(res.status).toBe(404);
  });

  test('POST /loans → 404 missing member', async () => {
    const res = await request(app).post('/api/library/loans').send({
      resourceId: testResId,
      memberId: '99999',
    });
    expect(res.status).toBe(404);
  });

  test('POST /loans/:id/renew → extend due date', async () => {
    const res = await request(app).post(`/api/library/loans/${loanId}/renew`);
    expect(res.status).toBe(200);
    expect(res.body.data.renewals).toBe(1);
  });

  test('POST /loans/:id/return → return resource', async () => {
    const res = await request(app).post(`/api/library/loans/${loanId}/return`);
    expect(res.status).toBe(200);
    expect(['returned', 'returned_late']).toContain(res.body.data.status);
    expect(res.body.data.returnDate).toBeTruthy();
  });

  test('POST /loans/:id/return → 400 already returned', async () => {
    const res = await request(app).post(`/api/library/loans/${loanId}/return`);
    expect(res.status).toBe(400);
  });

  test('POST /loans/:id/renew → 400 already returned', async () => {
    const res = await request(app).post(`/api/library/loans/${loanId}/renew`);
    expect(res.status).toBe(400);
  });

  test('Cannot delete resource with active loan', async () => {
    // Create loan first
    const loanRes = await request(app).post('/api/library/loans').send({
      resourceId: testResId,
      memberId: '2002',
    });
    expect(loanRes.status).toBe(201);
    // Try to delete
    const delRes = await request(app).delete(`/api/library/resources/${testResId}`);
    expect(delRes.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  5. Reservations
// ══════════════════════════════════════════════════════════

describe('Library — Reservations', () => {
  test('GET /reservations → list all', async () => {
    const res = await request(app).get('/api/library/reservations');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /reservations → 400 if resource is available', async () => {
    // Resource 1009 has availableQty=2, so should fail
    const res = await request(app).post('/api/library/reservations').send({
      resourceId: '1009',
      memberId: '2002',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('متوفر');
  });

  test('POST /reservations → 404 missing resource', async () => {
    const res = await request(app).post('/api/library/reservations').send({
      resourceId: '99999',
      memberId: '2002',
    });
    expect(res.status).toBe(404);
  });

  test('POST /reservations → 404 missing member', async () => {
    const res = await request(app).post('/api/library/reservations').send({
      resourceId: '1009',
      memberId: '99999',
    });
    expect(res.status).toBe(404);
  });

  test('POST /reservations → 400 missing fields', async () => {
    const res = await request(app).post('/api/library/reservations').send({});
    expect(res.status).toBe(400);
  });

  test('POST /reservations/:id/cancel → 404 missing', async () => {
    const res = await request(app).post('/api/library/reservations/99999/cancel');
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  6. Members
// ══════════════════════════════════════════════════════════

describe('Library — Members', () => {
  test('GET /members → list members', async () => {
    const res = await request(app).get('/api/library/members');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data[0]).toHaveProperty('name');
    expect(res.body.data[0]).toHaveProperty('role');
    expect(res.body.data[0]).toHaveProperty('department');
  });

  test('GET /members?search=أحمد → search', async () => {
    const res = await request(app).get('/api/library/members?search=%D8%A3%D8%AD%D9%85%D8%AF');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /members/:id → single member with loans', async () => {
    const res = await request(app).get('/api/library/members/2000');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('أحمد الشهري');
    expect(res.body.data.loans).toBeInstanceOf(Array);
  });

  test('GET /members/:id → 404 for missing', async () => {
    const res = await request(app).get('/api/library/members/99999');
    expect(res.status).toBe(404);
  });

  let newMemberId;
  test('POST /members → create member', async () => {
    const res = await request(app).post('/api/library/members').send({
      name: 'ليلى الحربي',
      email: 'layla@alawael.org',
      role: 'teacher',
      department: 'التعليم الخاص',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('ليلى الحربي');
    newMemberId = res.body.data.id;
  });

  test('POST /members → 400 duplicate email', async () => {
    const res = await request(app).post('/api/library/members').send({
      name: 'Duplicate',
      email: 'layla@alawael.org',
    });
    expect(res.status).toBe(400);
  });

  test('POST /members → 400 missing name', async () => {
    const res = await request(app).post('/api/library/members').send({
      email: 'test@test.com',
    });
    expect(res.status).toBe(400);
  });

  test('POST /members → 400 missing email', async () => {
    const res = await request(app).post('/api/library/members').send({
      name: 'Test',
    });
    expect(res.status).toBe(400);
  });

  test('PUT /members/:id → update member', async () => {
    const res = await request(app).put(`/api/library/members/${newMemberId}`).send({
      department: 'العلاج الطبيعي',
      maxLoans: 8,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.department).toBe('العلاج الطبيعي');
    expect(res.body.data.maxLoans).toBe(8);
  });
});

// ══════════════════════════════════════════════════════════
//  7. Reviews
// ══════════════════════════════════════════════════════════

describe('Library — Reviews', () => {
  test('GET /resources/:id/reviews → list reviews', async () => {
    const res = await request(app).get('/api/library/resources/1000/reviews');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /resources/:id/reviews → add review', async () => {
    const res = await request(app).post('/api/library/resources/1000/reviews').send({
      rating: 5,
      comment: 'كتاب ممتاز ومرجع شامل',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('كتاب ممتاز ومرجع شامل');
  });

  test('POST /resources/:id/reviews → 400 invalid rating', async () => {
    const res = await request(app).post('/api/library/resources/1000/reviews').send({
      rating: 0,
    });
    expect(res.status).toBe(400);
  });

  test('POST /resources/:id/reviews → 400 rating > 5', async () => {
    const res = await request(app).post('/api/library/resources/1000/reviews').send({
      rating: 6,
    });
    expect(res.status).toBe(400);
  });

  test('POST /resources/:id/reviews → 404 missing resource', async () => {
    const res = await request(app).post('/api/library/resources/99999/reviews').send({
      rating: 4,
    });
    expect(res.status).toBe(404);
  });

  test('GET /resources/:id/reviews → updated after add', async () => {
    const res = await request(app).get('/api/library/resources/1000/reviews');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════
//  8. Suppliers
// ══════════════════════════════════════════════════════════

describe('Library — Suppliers', () => {
  test('GET /suppliers → list suppliers', async () => {
    const res = await request(app).get('/api/library/suppliers');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  test('POST /suppliers → create supplier', async () => {
    const res = await request(app).post('/api/library/suppliers').send({
      name: 'مكتبة جرير',
      contact: 'خدمة العملاء',
      email: 'info@jarir.com',
      type: 'publisher',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('مكتبة جرير');
  });

  test('POST /suppliers → 400 missing name', async () => {
    const res = await request(app).post('/api/library/suppliers').send({
      email: 'test@test.com',
    });
    expect(res.status).toBe(400);
  });
});

// ══════════════════════════════════════════════════════════
//  9. Maintenance
// ══════════════════════════════════════════════════════════

describe('Library — Maintenance', () => {
  test('GET /maintenance → list records', async () => {
    const res = await request(app).get('/api/library/maintenance');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /maintenance → create record', async () => {
    const res = await request(app).post('/api/library/maintenance').send({
      resourceId: '1003',
      type: 'inspection',
      description: 'فحص دوري لجهاز TENS',
      performedBy: 'فني الصيانة',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('inspection');
    expect(res.body.data.resourceId).toBe('1003');
  });

  test('GET /maintenance?resourceId=1003 → filter by resource', async () => {
    const res = await request(app).get('/api/library/maintenance?resourceId=1003');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /maintenance → 400 missing resourceId', async () => {
    const res = await request(app).post('/api/library/maintenance').send({ type: 'repair' });
    expect(res.status).toBe(400);
  });

  test('POST /maintenance → 400 missing type', async () => {
    const res = await request(app).post('/api/library/maintenance').send({ resourceId: '1003' });
    expect(res.status).toBe(400);
  });

  test('POST /maintenance → 404 missing resource', async () => {
    const res = await request(app).post('/api/library/maintenance').send({
      resourceId: '99999',
      type: 'repair',
    });
    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════
//  10. Full Workflow: Library cycle
// ══════════════════════════════════════════════════════════

describe('Library — Full Workflow', () => {
  let wfResId, wfLoanId, wfMemberId;

  test('1. Create member', async () => {
    const res = await request(app).post('/api/library/members').send({
      name: 'سعد القحطاني',
      email: 'saad@alawael.org',
      role: 'therapist',
      department: 'العلاج الطبيعي',
    });
    expect(res.status).toBe(201);
    wfMemberId = res.body.data.id;
  });

  test('2. Create resource', async () => {
    const res = await request(app).post('/api/library/resources').send({
      name: 'دليل العلاج بالماء',
      categoryId: '101',
      type: 'therapeutic_tool',
      quantity: 2,
      cost: 200,
    });
    expect(res.status).toBe(201);
    wfResId = res.body.data.id;
    expect(res.body.data.availableQty).toBe(2);
  });

  test('3. Checkout resource', async () => {
    const res = await request(app).post('/api/library/loans').send({
      resourceId: wfResId,
      memberId: wfMemberId,
      loanDays: 7,
    });
    expect(res.status).toBe(201);
    wfLoanId = res.body.data.id;
    expect(res.body.data.status).toBe('active');
  });

  test('4. Verify resource availability decreased', async () => {
    const res = await request(app).get(`/api/library/resources/${wfResId}`);
    expect(res.body.data.availableQty).toBe(1);
  });

  test('5. Renew loan', async () => {
    const res = await request(app).post(`/api/library/loans/${wfLoanId}/renew`);
    expect(res.status).toBe(200);
    expect(res.body.data.renewals).toBe(1);
  });

  test('6. Return resource', async () => {
    const res = await request(app).post(`/api/library/loans/${wfLoanId}/return`);
    expect(res.status).toBe(200);
    expect(['returned', 'returned_late']).toContain(res.body.data.status);
  });

  test('7. Verify resource availability restored', async () => {
    const res = await request(app).get(`/api/library/resources/${wfResId}`);
    expect(res.body.data.availableQty).toBe(2);
  });

  test('8. Add review after borrowing', async () => {
    const res = await request(app).post(`/api/library/resources/${wfResId}/reviews`).send({
      rating: 4,
      comment: 'مورد مفيد جداً',
    });
    expect(res.status).toBe(201);
  });

  test('9. Create maintenance record', async () => {
    const res = await request(app).post('/api/library/maintenance').send({
      resourceId: wfResId,
      type: 'inspection',
      description: 'فحص بعد الإعارة',
      performedBy: 'سعد القحطاني',
    });
    expect(res.status).toBe(201);
  });

  test('10. Dashboard reflects new data', async () => {
    const res = await request(app).get('/api/library/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.totalResources).toBeGreaterThanOrEqual(10);
  });

  test('11. Delete resource (no active loans)', async () => {
    const res = await request(app).delete(`/api/library/resources/${wfResId}`);
    expect(res.status).toBe(200);
  });
});
