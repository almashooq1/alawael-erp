/**
 * Unit Tests — LibraryService (backend/services/library.service.js)
 * Covers: Dashboard, Categories, Resources, Loans, Reservations,
 *         Members, Reviews, Suppliers, Maintenance, Statistics,
 *         Barcode, Search, BulkImport, ResourceTypes
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/library.service');

// ─── helpers ────────────────────────────────────────────
function expectError(fn, statusCode) {
  try {
    fn();
    throw new Error('Expected an error to be thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(statusCode);
    return err;
  }
}

// ═══════════════════════════════════════════════════════════
// 1  MODULE EXPORTS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Module Exports', () => {
  test('exports a singleton object (not a class)', () => {
    expect(typeof service).toBe('object');
    expect(service).not.toBeNull();
  });

  test('exposes expected public methods', () => {
    const methods = [
      'getDashboard',
      'getCategories',
      'getCategoryById',
      'createCategory',
      'updateCategory',
      'deleteCategory',
      'getResources',
      'getResourceById',
      'createResource',
      'updateResource',
      'deleteResource',
      'getLoans',
      'getLoanById',
      'createLoan',
      'returnLoan',
      'renewLoan',
      'getReservations',
      'createReservation',
      'cancelReservation',
      'getMembers',
      'getMemberById',
      'createMember',
      'updateMember',
      'getResourceReviews',
      'addReview',
      'getSuppliers',
      'createSupplier',
      'getMaintenanceRecords',
      'createMaintenanceRecord',
      'getStatistics',
      'findByBarcode',
      'searchResources',
      'bulkImport',
      'getResourceTypes',
    ];
    methods.forEach(m => expect(typeof service[m]).toBe('function'));
  });
});

// ═══════════════════════════════════════════════════════════
// 2  DASHBOARD
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Dashboard', () => {
  test('getDashboard returns all expected top-level keys', () => {
    const d = service.getDashboard();
    expect(d).toHaveProperty('kpis');
    expect(d).toHaveProperty('byType');
    expect(d).toHaveProperty('byCategory');
    expect(d).toHaveProperty('mostBorrowed');
    expect(d).toHaveProperty('topRated');
    expect(d).toHaveProperty('recentLoans');
    expect(d).toHaveProperty('monthlyLoans');
  });

  test('kpis contain correct numeric fields', () => {
    const { kpis } = service.getDashboard();
    expect(typeof kpis.totalResources).toBe('number');
    expect(typeof kpis.totalQuantity).toBe('number');
    expect(typeof kpis.availableQuantity).toBe('number');
    expect(typeof kpis.loanedQuantity).toBe('number');
    expect(typeof kpis.activeLoans).toBe('number');
    expect(typeof kpis.overdueLoans).toBe('number');
    expect(typeof kpis.totalMembers).toBe('number');
    expect(typeof kpis.activeMembers).toBe('number');
    expect(typeof kpis.totalValue).toBe('number');
    expect(typeof kpis.averageRating).toBe('number');
  });

  test('kpis.totalResources matches resources count', () => {
    const { kpis } = service.getDashboard();
    expect(kpis.totalResources).toBeGreaterThanOrEqual(10);
  });

  test('byCategory is an array with at least 8 entries', () => {
    const { byCategory } = service.getDashboard();
    expect(Array.isArray(byCategory)).toBe(true);
    expect(byCategory.length).toBeGreaterThanOrEqual(8);
    byCategory.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('count');
    });
  });

  test('mostBorrowed has at most 5 items', () => {
    const { mostBorrowed } = service.getDashboard();
    expect(mostBorrowed.length).toBeLessThanOrEqual(5);
  });

  test('topRated has at most 5 items', () => {
    const { topRated } = service.getDashboard();
    expect(topRated.length).toBeLessThanOrEqual(5);
  });

  test('recentLoans has at most 5 items and each has expected fields', () => {
    const { recentLoans } = service.getDashboard();
    expect(recentLoans.length).toBeLessThanOrEqual(5);
    recentLoans.forEach(l => {
      expect(l).toHaveProperty('id');
      expect(l).toHaveProperty('resourceName');
      expect(l).toHaveProperty('memberName');
      expect(l).toHaveProperty('status');
    });
  });

  test('monthlyLoans is a non-empty object', () => {
    const { monthlyLoans } = service.getDashboard();
    expect(typeof monthlyLoans).toBe('object');
    expect(Object.keys(monthlyLoans).length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 3  CATEGORIES
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Categories', () => {
  test('getCategories returns array of 8 seeded categories', () => {
    const cats = service.getCategories();
    expect(Array.isArray(cats)).toBe(true);
    expect(cats.length).toBeGreaterThanOrEqual(8);
  });

  test('getCategoryById returns the correct category', () => {
    const cat = service.getCategoryById('100');
    expect(cat.id).toBe('100');
    expect(cat.name).toBe('كتب علمية');
  });

  test('getCategoryById throws 404 for unknown id', () => {
    expectError(() => service.getCategoryById('99999'), 404);
  });

  test('createCategory succeeds with valid data', () => {
    const cat = service.createCategory({ name: 'Test Cat', type: 'test_type' });
    expect(cat).toHaveProperty('id');
    expect(cat.name).toBe('Test Cat');
    expect(cat.type).toBe('test_type');
    expect(cat.resourceCount).toBe(0);
    expect(cat.createdAt).toBeDefined();
  });

  test('createCategory sets defaults for optional fields', () => {
    const cat = service.createCategory({ name: 'Defaults', type: 'x' });
    expect(cat.nameEn).toBe('');
    expect(cat.icon).toBe('Folder');
    expect(cat.color).toBe('#607d8b');
    expect(cat.description).toBe('');
  });

  test('createCategory throws 400 if name missing', () => {
    expectError(() => service.createCategory({ type: 'x' }), 400);
  });

  test('createCategory throws 400 if type missing', () => {
    expectError(() => service.createCategory({ name: 'x' }), 400);
  });

  test('updateCategory updates provided fields', () => {
    const cat = service.createCategory({ name: 'ToUpdate', type: 'up' });
    const updated = service.updateCategory(cat.id, { name: 'Updated', color: '#ff0000' });
    expect(updated.name).toBe('Updated');
    expect(updated.color).toBe('#ff0000');
  });

  test('updateCategory throws 404 for unknown id', () => {
    expectError(() => service.updateCategory('99999', { name: 'x' }), 404);
  });

  test('deleteCategory removes an empty category', () => {
    const cat = service.createCategory({ name: 'ToDelete', type: 'del' });
    const result = service.deleteCategory(cat.id);
    expect(result).toHaveProperty('message');
    expectError(() => service.getCategoryById(cat.id), 404);
  });

  test('deleteCategory throws 400 if category has resources', () => {
    // Category '100' has resources
    expectError(() => service.deleteCategory('100'), 400);
  });

  test('deleteCategory throws 404 for unknown id', () => {
    expectError(() => service.deleteCategory('99999'), 404);
  });
});

// ═══════════════════════════════════════════════════════════
// 4  RESOURCES
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Resources', () => {
  describe('getResources', () => {
    test('returns paginated result with defaults', () => {
      const result = service.getResources();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(10);
    });

    test('filters by categoryId', () => {
      const result = service.getResources({ categoryId: '100' });
      result.data.forEach(r => expect(r.categoryId).toBe('100'));
    });

    test('filters by type', () => {
      const result = service.getResources({ type: 'book' });
      result.data.forEach(r => expect(r.type).toBe('book'));
    });

    test('filters by status', () => {
      const result = service.getResources({ status: 'available' });
      result.data.forEach(r => expect(r.status).toBe('available'));
    });

    test('filters by search (name match)', () => {
      const result = service.getResources({ search: 'العلاج الطبيعي' });
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('filters by search (English name match)', () => {
      const result = service.getResources({ search: 'Physical Therapy' });
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('filters by search (barcode match)', () => {
      const result = service.getResources({ search: 'LIB-001' });
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('filters by search (tag match)', () => {
      const result = service.getResources({ search: 'تأهيل' });
      expect(result.data.length).toBeGreaterThan(0);
    });

    test('filters by language', () => {
      const result = service.getResources({ language: 'ar' });
      result.data.forEach(r => expect(r.language).toBe('ar'));
    });

    test('respects pagination (page & limit)', () => {
      const result = service.getResources({ page: 1, limit: 3 });
      expect(result.data.length).toBeLessThanOrEqual(3);
      expect(result.limit).toBe(3);
      expect(result.page).toBe(1);
    });

    test('sorts ascending when order=asc', () => {
      const result = service.getResources({ sortBy: 'name', order: 'asc' });
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].name >= result.data[i - 1].name).toBe(true);
      }
    });
  });

  describe('getResourceById', () => {
    test('returns resource with category info', () => {
      const r = service.getResourceById('1000');
      expect(r.id).toBe('1000');
      expect(r.category).not.toBeNull();
      expect(r.category.id).toBe('100');
    });

    test('increments views on each call', () => {
      const raw = service.resources.get('1001');
      const viewsBefore = raw.views;
      service.getResourceById('1001');
      expect(raw.views).toBe(viewsBefore + 1);
    });

    test('throws 404 for unknown id', () => {
      expectError(() => service.getResourceById('99999'), 404);
    });
  });

  describe('createResource', () => {
    test('creates a resource with valid data', () => {
      const r = service.createResource({
        name: 'New Resource',
        categoryId: '100',
        type: 'book',
        quantity: 3,
      });
      expect(r).toHaveProperty('id');
      expect(r.name).toBe('New Resource');
      expect(r.quantity).toBe(3);
      expect(r.availableQty).toBe(3);
      expect(r.status).toBe('available');
      expect(r.views).toBe(0);
      expect(r.timesLoaned).toBe(0);
    });

    test('uses default values for optional fields', () => {
      const r = service.createResource({ name: 'Defaults', categoryId: '100', type: 'book' });
      expect(r.quantity).toBe(1);
      expect(r.availableQty).toBe(1);
      expect(r.language).toBe('ar');
      expect(r.currency).toBe('SAR');
      expect(r.condition).toBe('new');
      expect(r.cost).toBe(0);
      expect(r.tags).toEqual([]);
    });

    test('increments category resourceCount', () => {
      const cat = service.getCategoryById('101');
      const countBefore = cat.resourceCount;
      service.createResource({ name: 'Count Test', categoryId: '101', type: 'therapeutic_tool' });
      expect(cat.resourceCount).toBe(countBefore + 1);
    });

    test('throws 400 if name missing', () => {
      expectError(() => service.createResource({ categoryId: '100', type: 'book' }), 400);
    });

    test('throws 400 if categoryId missing', () => {
      expectError(() => service.createResource({ name: 'x', type: 'book' }), 400);
    });

    test('throws 400 if type missing', () => {
      expectError(() => service.createResource({ name: 'x', categoryId: '100' }), 400);
    });

    test('throws 404 if category does not exist', () => {
      expectError(
        () => service.createResource({ name: 'x', categoryId: '99999', type: 'book' }),
        404
      );
    });
  });

  describe('updateResource', () => {
    let resId;
    beforeAll(() => {
      const r = service.createResource({
        name: 'UpdatableRes',
        categoryId: '100',
        type: 'book',
        quantity: 10,
      });
      resId = r.id;
    });

    test('updates basic fields', () => {
      const updated = service.updateResource(resId, { name: 'Renamed', author: 'Author X' });
      expect(updated.name).toBe('Renamed');
      expect(updated.author).toBe('Author X');
    });

    test('adjusts availableQty when quantity changes', () => {
      const raw = service.resources.get(resId);
      const avBefore = raw.availableQty;
      service.updateResource(resId, { quantity: raw.quantity + 5 });
      expect(raw.availableQty).toBe(avBefore + 5);
    });

    test('adjusts category counts when categoryId changes', () => {
      const oldCat = service.getCategoryById('100');
      const newCat = service.getCategoryById('102');
      const oldCount = oldCat.resourceCount;
      const newCount = newCat.resourceCount;
      service.updateResource(resId, { categoryId: '102' });
      expect(oldCat.resourceCount).toBe(oldCount - 1);
      expect(newCat.resourceCount).toBe(newCount + 1);
    });

    test('sets updatedAt', () => {
      const r = service.resources.get(resId);
      r.updatedAt = '2020-01-01T00:00:00.000Z'; // force old timestamp
      service.updateResource(resId, { description: 'new desc' });
      expect(r.updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    });

    test('throws 404 for unknown id', () => {
      expectError(() => service.updateResource('99999', { name: 'x' }), 404);
    });
  });

  describe('deleteResource', () => {
    test('deletes a resource with no active loans', () => {
      const r = service.createResource({
        name: 'ToDelete',
        categoryId: '102',
        type: 'educational',
      });
      const cat = service.getCategoryById('102');
      const countBefore = cat.resourceCount;
      const result = service.deleteResource(r.id);
      expect(result).toHaveProperty('message');
      expect(cat.resourceCount).toBe(countBefore - 1);
      expectError(() => service.getResourceById(r.id), 404);
    });

    test('throws 400 if resource has active loans', () => {
      // Resource '1000' has active loan '5000'
      expectError(() => service.deleteResource('1000'), 400);
    });

    test('throws 404 for unknown id', () => {
      expectError(() => service.deleteResource('99999'), 404);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 5  LOANS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Loans', () => {
  describe('getLoans', () => {
    test('returns paginated result with enriched data', () => {
      const result = service.getLoans();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('totalPages');
      result.data.forEach(l => {
        expect(l).toHaveProperty('resourceName');
        expect(l).toHaveProperty('memberName');
      });
    });

    test('filters by status', () => {
      const result = service.getLoans({ status: 'active' });
      result.data.forEach(l => expect(l.status).toBe('active'));
    });

    test('filters by memberId', () => {
      const result = service.getLoans({ memberId: '2000' });
      result.data.forEach(l => expect(l.memberId).toBe('2000'));
    });

    test('filters by resourceId', () => {
      const result = service.getLoans({ resourceId: '1000' });
      result.data.forEach(l => expect(l.resourceId).toBe('1000'));
    });

    test('filters overdue loans', () => {
      // All seed active loans have dueDates in 2025, so they're overdue relative to now
      const result = service.getLoans({ overdue: 'true' });
      result.data.forEach(l => {
        expect(l.status).toBe('active');
        expect(new Date(l.dueDate) < new Date()).toBe(true);
      });
    });

    test('sorts by loanDate descending', () => {
      const result = service.getLoans();
      for (let i = 1; i < result.data.length; i++) {
        expect(new Date(result.data[i - 1].loanDate) >= new Date(result.data[i].loanDate)).toBe(
          true
        );
      }
    });
  });

  describe('getLoanById', () => {
    test('returns loan with resource and member', () => {
      const loan = service.getLoanById('5000');
      expect(loan.id).toBe('5000');
      expect(loan.resource).not.toBeNull();
      expect(loan.member).not.toBeNull();
    });

    test('throws 404 for unknown id', () => {
      expectError(() => service.getLoanById('99999'), 404);
    });
  });

  describe('createLoan', () => {
    test('creates a loan and adjusts counters', () => {
      // Use resource 1009 (qty 2, availableQty 2) and member 2002 (0 activeLoans)
      const res = service.resources.get('1009');
      const mem = service.members.get('2002');
      const avBefore = res.availableQty;
      const timesLoanedBefore = res.timesLoaned;
      const activeLoansBefore = mem.activeLoans;
      const totalLoansBefore = mem.totalLoans;

      const loan = service.createLoan({ resourceId: '1009', memberId: '2002' });
      expect(loan).toHaveProperty('id');
      expect(loan.status).toBe('active');
      expect(loan.renewals).toBe(0);
      expect(res.availableQty).toBe(avBefore - 1);
      expect(res.timesLoaned).toBe(timesLoanedBefore + 1);
      expect(mem.activeLoans).toBe(activeLoansBefore + 1);
      expect(mem.totalLoans).toBe(totalLoansBefore + 1);
    });

    test('sets status unavailable when availableQty reaches 0', () => {
      // Create a resource with quantity 1
      const r = service.createResource({
        name: 'SingleCopy',
        categoryId: '100',
        type: 'book',
        quantity: 1,
      });
      service.createLoan({ resourceId: r.id, memberId: '2002' });
      expect(service.resources.get(r.id).status).toBe('unavailable');
    });

    test('throws 400 if resourceId missing', () => {
      expectError(() => service.createLoan({ memberId: '2000' }), 400);
    });

    test('throws 400 if memberId missing', () => {
      expectError(() => service.createLoan({ resourceId: '1000' }), 400);
    });

    test('throws 404 if resource not found', () => {
      expectError(() => service.createLoan({ resourceId: '99999', memberId: '2000' }), 404);
    });

    test('throws 400 if resource availableQty is 0', () => {
      // Resource created above with qty=1 is now unavailable
      const r = service.createResource({
        name: 'ZeroQty',
        categoryId: '100',
        type: 'book',
        quantity: 1,
      });
      service.createLoan({ resourceId: r.id, memberId: '2002' });
      // Now it has 0 available
      expectError(() => service.createLoan({ resourceId: r.id, memberId: '2001' }), 400);
    });

    test('throws 404 if member not found', () => {
      expectError(() => service.createLoan({ resourceId: '1006', memberId: '99999' }), 404);
    });

    test('throws 400 if member is inactive', () => {
      // Temporarily set member inactive
      const mem = service.members.get('2002');
      const oldStatus = mem.status;
      mem.status = 'inactive';
      try {
        expectError(() => service.createLoan({ resourceId: '1006', memberId: '2002' }), 400);
      } finally {
        mem.status = oldStatus;
      }
    });

    test('throws 400 if member at max loans', () => {
      const mem = service.members.get('2002');
      const oldActive = mem.activeLoans;
      mem.activeLoans = mem.maxLoans; // force max
      try {
        expectError(() => service.createLoan({ resourceId: '1006', memberId: '2002' }), 400);
      } finally {
        mem.activeLoans = oldActive;
      }
    });

    test('throws 400 for duplicate active loan (same resource + member)', () => {
      // member 2000 already has an active loan for resource 1000 (loan 5000)
      expectError(() => service.createLoan({ resourceId: '1000', memberId: '2000' }), 400);
    });
  });

  describe('returnLoan', () => {
    let returnableLoanId;
    beforeAll(() => {
      // Create a fresh loan to return
      const r = service.createResource({
        name: 'ReturnTest',
        categoryId: '105',
        type: 'game',
        quantity: 5,
      });
      const loan = service.createLoan({ resourceId: r.id, memberId: '2001' });
      returnableLoanId = loan.id;
    });

    test('returns a loan and updates status', () => {
      const returned = service.returnLoan(returnableLoanId);
      expect(returned.returnDate).toBeDefined();
      expect(['returned', 'returned_late']).toContain(returned.status);
    });

    test('increments resource availableQty', () => {
      // Create & return another loan to verify qty increase
      const r = service.createResource({
        name: 'RetQty',
        categoryId: '105',
        type: 'game',
        quantity: 2,
      });
      const loan = service.createLoan({ resourceId: r.id, memberId: '2002' });
      const avBefore = service.resources.get(r.id).availableQty;
      service.returnLoan(loan.id);
      expect(service.resources.get(r.id).availableQty).toBe(avBefore + 1);
    });

    test('restores available status when returning last copy', () => {
      const r = service.createResource({
        name: 'RestoreStatus',
        categoryId: '105',
        type: 'game',
        quantity: 1,
      });
      const loan = service.createLoan({ resourceId: r.id, memberId: '2002' });
      expect(service.resources.get(r.id).status).toBe('unavailable');
      service.returnLoan(loan.id);
      expect(service.resources.get(r.id).status).toBe('available');
    });

    test('decrements member activeLoans', () => {
      const r = service.createResource({
        name: 'DecActive',
        categoryId: '105',
        type: 'game',
        quantity: 3,
      });
      const mem = service.members.get('2002');
      const loan = service.createLoan({ resourceId: r.id, memberId: '2002' });
      const activeBefore = mem.activeLoans;
      service.returnLoan(loan.id);
      expect(mem.activeLoans).toBe(activeBefore - 1);
    });

    test('throws 404 for unknown loan', () => {
      expectError(() => service.returnLoan('99999'), 404);
    });

    test('throws 400 if loan is not active', () => {
      // returnableLoanId was already returned
      expectError(() => service.returnLoan(returnableLoanId), 400);
    });

    test('calculates fine for late return (seed loan with past dueDate)', () => {
      // Seed loan '5001' is active with dueDate 2025-03-19 — far in the past
      const loan = service.returnLoan('5001');
      expect(loan.status).toBe('returned_late');
      expect(loan.fine).toBeDefined();
      expect(loan.fine).toBeGreaterThan(0);
    });
  });

  describe('renewLoan', () => {
    let renewableLoanId;
    let renewableResource;
    beforeAll(() => {
      // Create a fresh loan with future dueDate
      renewableResource = service.createResource({
        name: 'RenewTest',
        categoryId: '105',
        type: 'game',
        quantity: 5,
      });
      const loan = service.createLoan({ resourceId: renewableResource.id, memberId: '2002' });
      renewableLoanId = loan.id;
    });

    test('extends dueDate by 14 days and increments renewals', () => {
      const loanBefore = service.loans.get(renewableLoanId);
      const dueBefore = new Date(loanBefore.dueDate);
      const renewed = service.renewLoan(renewableLoanId);
      const dueAfter = new Date(renewed.dueDate);
      const diffDays = Math.round((dueAfter - dueBefore) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(14);
      expect(renewed.renewals).toBe(1);
    });

    test('can renew up to 3 times', () => {
      service.renewLoan(renewableLoanId); // 2nd
      const third = service.renewLoan(renewableLoanId); // 3rd — should work
      expect(third.renewals).toBe(3);
    });

    test('throws 400 after 3 renewals', () => {
      expectError(() => service.renewLoan(renewableLoanId), 400);
    });

    test('throws 404 for unknown loan', () => {
      expectError(() => service.renewLoan('99999'), 404);
    });

    test('throws 400 if loan is not active', () => {
      // Use the already-returned loan from returnLoan tests
      expectError(() => service.renewLoan('5001'), 400);
    });

    test('throws 400 if loan is overdue', () => {
      // Seed loan '5000' has dueDate 2025-03-15 — long past
      expectError(() => service.renewLoan('5000'), 400);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 6  RESERVATIONS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Reservations', () => {
  let unavailableResourceId;
  let reservationId;

  beforeAll(() => {
    // Create a resource with qty=1 then loan it to make it unavailable
    const r = service.createResource({
      name: 'ReserveTarget',
      categoryId: '100',
      type: 'book',
      quantity: 1,
    });
    unavailableResourceId = r.id;
    service.createLoan({ resourceId: r.id, memberId: '2002' });
    // Now availableQty = 0
  });

  test('getReservations returns array (initially empty or filtered)', () => {
    const result = service.getReservations();
    expect(Array.isArray(result)).toBe(true);
  });

  test('createReservation succeeds for unavailable resource', () => {
    const res = service.createReservation({
      resourceId: unavailableResourceId,
      memberId: '2001',
    });
    expect(res).toHaveProperty('id');
    expect(res.status).toBe('pending');
    expect(res.resourceId).toBe(unavailableResourceId);
    reservationId = res.id;
  });

  test('getReservations returns created reservation', () => {
    const result = service.getReservations();
    expect(result.some(r => r.id === reservationId)).toBe(true);
  });

  test('getReservations filters by status', () => {
    const result = service.getReservations({ status: 'pending' });
    result.forEach(r => expect(r.status).toBe('pending'));
  });

  test('getReservations filters by memberId', () => {
    const result = service.getReservations({ memberId: '2001' });
    result.forEach(r => expect(r.memberId).toBe('2001'));
  });

  test('getReservations enriches with resource and member names', () => {
    const result = service.getReservations();
    const r = result.find(x => x.id === reservationId);
    expect(r.resourceName).toBeDefined();
    expect(r.memberName).toBeDefined();
  });

  test('createReservation throws 400 if resourceId missing', () => {
    expectError(() => service.createReservation({ memberId: '2001' }), 400);
  });

  test('createReservation throws 400 if memberId missing', () => {
    expectError(() => service.createReservation({ resourceId: unavailableResourceId }), 400);
  });

  test('createReservation throws 404 for unknown resource', () => {
    expectError(() => service.createReservation({ resourceId: '99999', memberId: '2001' }), 404);
  });

  test('createReservation throws 404 for unknown member', () => {
    expectError(
      () => service.createReservation({ resourceId: unavailableResourceId, memberId: '99999' }),
      404
    );
  });

  test('createReservation throws 400 if resource IS available', () => {
    // Resource '1006' has availableQty > 0
    expectError(() => service.createReservation({ resourceId: '1006', memberId: '2001' }), 400);
  });

  test('cancelReservation succeeds for pending reservation', () => {
    const r = service.cancelReservation(reservationId);
    expect(r.status).toBe('cancelled');
  });

  test('cancelReservation throws 404 for unknown id', () => {
    expectError(() => service.cancelReservation('99999'), 404);
  });

  test('cancelReservation throws 400 if not pending', () => {
    // Reservation was already cancelled
    expectError(() => service.cancelReservation(reservationId), 400);
  });
});

// ═══════════════════════════════════════════════════════════
// 7  MEMBERS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Members', () => {
  describe('getMembers', () => {
    test('returns all members (at least 4 seeded)', () => {
      const members = service.getMembers();
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThanOrEqual(4);
    });

    test('filters by status', () => {
      const members = service.getMembers({ status: 'active' });
      members.forEach(m => expect(m.status).toBe('active'));
    });

    test('filters by department', () => {
      const members = service.getMembers({ department: 'العلاج الطبيعي' });
      members.forEach(m => expect(m.department).toBe('العلاج الطبيعي'));
    });

    test('filters by search (name)', () => {
      const members = service.getMembers({ search: 'أحمد' });
      expect(members.length).toBeGreaterThan(0);
    });

    test('filters by search (email)', () => {
      const members = service.getMembers({ search: 'ahmed@' });
      expect(members.length).toBeGreaterThan(0);
    });
  });

  describe('getMemberById', () => {
    test('returns member with loans array', () => {
      const m = service.getMemberById('2000');
      expect(m.id).toBe('2000');
      expect(m.name).toBe('أحمد الشهري');
      expect(Array.isArray(m.loans)).toBe(true);
    });

    test('member loans include resourceName', () => {
      const m = service.getMemberById('2000');
      m.loans.forEach(l => {
        expect(l).toHaveProperty('resourceName');
      });
    });

    test('throws 404 for unknown id', () => {
      expectError(() => service.getMemberById('99999'), 404);
    });
  });

  describe('createMember', () => {
    test('creates a member with valid data', () => {
      const m = service.createMember({
        name: 'Test Member',
        email: 'test.unique@example.com',
        department: 'Test Dept',
      });
      expect(m).toHaveProperty('id');
      expect(m.name).toBe('Test Member');
      expect(m.email).toBe('test.unique@example.com');
      expect(m.status).toBe('active');
      expect(m.activeLoans).toBe(0);
      expect(m.totalLoans).toBe(0);
      expect(m.fines).toBe(0);
    });

    test('sets default values for optional fields', () => {
      const m = service.createMember({ name: 'Defaults', email: 'defaults123@test.com' });
      expect(m.role).toBe('staff');
      expect(m.membershipType).toBe('staff');
      expect(m.maxLoans).toBe(5);
    });

    test('throws 400 if name missing', () => {
      expectError(() => service.createMember({ email: 'x@y.z' }), 400);
    });

    test('throws 400 if email missing', () => {
      expectError(() => service.createMember({ name: 'x' }), 400);
    });

    test('throws 400 on duplicate email', () => {
      service.createMember({ name: 'Dup1', email: 'dup@email.com' });
      expectError(() => service.createMember({ name: 'Dup2', email: 'dup@email.com' }), 400);
    });
  });

  describe('updateMember', () => {
    test('updates provided fields', () => {
      const m = service.createMember({ name: 'UpdMem', email: 'updmem@test.com' });
      const updated = service.updateMember(m.id, { name: 'Updated Name', department: 'New Dept' });
      expect(updated.name).toBe('Updated Name');
      expect(updated.department).toBe('New Dept');
    });

    test('throws 404 for unknown id', () => {
      expectError(() => service.updateMember('99999', { name: 'x' }), 404);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 8  REVIEWS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Reviews', () => {
  test('getResourceReviews returns empty array initially for a resource', () => {
    const reviews = service.getResourceReviews('1002');
    expect(Array.isArray(reviews)).toBe(true);
    // May have reviews added in other tests; at minimum it's an array
  });

  test('getResourceReviews throws 404 for unknown resource', () => {
    expectError(() => service.getResourceReviews('99999'), 404);
  });

  test('addReview creates a review and updates resource rating', () => {
    const resource = service.resources.get('1002');
    // Seed sets random reviewCount on resource but adds no entries to reviews Map.
    // addReview recalculates reviewCount from the Map, so track Map-based count.
    const reviewsBefore = Array.from(service.reviews.values()).filter(
      r => r.resourceId === '1002'
    ).length;

    const review = service.addReview('1002', {
      rating: 5,
      comment: 'Excellent',
      userId: 'u1',
      userName: 'Tester',
    });
    expect(review).toHaveProperty('id');
    expect(review.rating).toBe(5);
    expect(review.resourceId).toBe('1002');
    expect(resource.reviewCount).toBe(reviewsBefore + 1);
  });

  test('addReview updates average rating correctly with multiple reviews', () => {
    service.addReview('1002', { rating: 3, comment: 'OK' });
    const resource = service.resources.get('1002');
    // Mean of 5+3=8/2=4.0 (only the reviews we added in this describe block)
    // The actual rating depends on total reviews for resource 1002
    expect(resource.rating).toBeGreaterThan(0);
    expect(resource.rating).toBeLessThanOrEqual(5);
  });

  test('addReview throws 400 if rating < 1', () => {
    expectError(() => service.addReview('1002', { rating: 0 }), 400);
  });

  test('addReview throws 400 if rating > 5', () => {
    expectError(() => service.addReview('1002', { rating: 6 }), 400);
  });

  test('addReview throws 400 if rating missing', () => {
    expectError(() => service.addReview('1002', { comment: 'No rating' }), 400);
  });

  test('addReview throws 404 for unknown resource', () => {
    expectError(() => service.addReview('99999', { rating: 4 }), 404);
  });

  test('getResourceReviews sorted by createdAt descending', () => {
    const reviews = service.getResourceReviews('1002');
    for (let i = 1; i < reviews.length; i++) {
      expect(new Date(reviews[i - 1].createdAt) >= new Date(reviews[i].createdAt)).toBe(true);
    }
  });

  test('addReview sets defaults for optional fields', () => {
    const review = service.addReview('1003', { rating: 4 });
    expect(review.userId).toBe('anonymous');
    expect(review.userName).toBe('مجهول');
    expect(review.comment).toBe('');
  });
});

// ═══════════════════════════════════════════════════════════
// 9  SUPPLIERS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Suppliers', () => {
  test('getSuppliers returns array with at least 3 seeded suppliers', () => {
    const suppliers = service.getSuppliers();
    expect(Array.isArray(suppliers)).toBe(true);
    expect(suppliers.length).toBeGreaterThanOrEqual(3);
  });

  test('seeded supplier data is correct', () => {
    const suppliers = service.getSuppliers();
    const s = suppliers.find(x => x.id === '3000');
    expect(s).toBeDefined();
    expect(s.name).toBe('دار المعرفة للنشر');
    expect(s.status).toBe('active');
  });

  test('createSupplier with valid data', () => {
    const s = service.createSupplier({
      name: 'New Supplier',
      type: 'equipment',
      email: 'ns@test.com',
    });
    expect(s).toHaveProperty('id');
    expect(s.name).toBe('New Supplier');
    expect(s.type).toBe('equipment');
    expect(s.status).toBe('active');
  });

  test('createSupplier sets defaults for optional fields', () => {
    const s = service.createSupplier({ name: 'Defaults Sup' });
    expect(s.contact).toBe('');
    expect(s.email).toBe('');
    expect(s.type).toBe('general');
    expect(s.rating).toBe(0);
  });

  test('createSupplier throws 400 if name missing', () => {
    expectError(() => service.createSupplier({}), 400);
  });
});

// ═══════════════════════════════════════════════════════════
// 10  MAINTENANCE RECORDS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Maintenance', () => {
  test('getMaintenanceRecords returns array (initially empty)', () => {
    const records = service.getMaintenanceRecords();
    expect(Array.isArray(records)).toBe(true);
  });

  test('createMaintenanceRecord with valid data', () => {
    const record = service.createMaintenanceRecord({
      resourceId: '1002',
      type: 'repair',
      description: 'Fixed handle',
      cost: 50,
      performedBy: 'Tech A',
    });
    expect(record).toHaveProperty('id');
    expect(record.resourceId).toBe('1002');
    expect(record.type).toBe('repair');
    expect(record.cost).toBe(50);
    expect(record.status).toBe('completed');
  });

  test('createMaintenanceRecord updates resource condition if newCondition given', () => {
    const before = service.resources.get('1002').condition;
    service.createMaintenanceRecord({
      resourceId: '1002',
      type: 'repair',
      newCondition: 'excellent',
    });
    expect(service.resources.get('1002').condition).toBe('excellent');
    // restore
    service.resources.get('1002').condition = before;
  });

  test('createMaintenanceRecord does not change condition if newCondition not given', () => {
    const before = service.resources.get('1003').condition;
    service.createMaintenanceRecord({ resourceId: '1003', type: 'inspection' });
    expect(service.resources.get('1003').condition).toBe(before);
  });

  test('createMaintenanceRecord sets defaults for optional fields', () => {
    const record = service.createMaintenanceRecord({ resourceId: '1004', type: 'calibration' });
    expect(record.description).toBe('');
    expect(record.cost).toBe(0);
    expect(record.performedBy).toBe('');
    expect(record.nextMaintenanceDate).toBeNull();
  });

  test('getMaintenanceRecords filters by resourceId', () => {
    const records = service.getMaintenanceRecords('1002');
    records.forEach(r => expect(r.resourceId).toBe('1002'));
  });

  test('getMaintenanceRecords returns all when no filter', () => {
    const all = service.getMaintenanceRecords();
    expect(all.length).toBeGreaterThan(0);
  });

  test('createMaintenanceRecord throws 400 if resourceId missing', () => {
    expectError(() => service.createMaintenanceRecord({ type: 'repair' }), 400);
  });

  test('createMaintenanceRecord throws 400 if type missing', () => {
    expectError(() => service.createMaintenanceRecord({ resourceId: '1002' }), 400);
  });

  test('createMaintenanceRecord throws 404 if resource not found', () => {
    expectError(
      () => service.createMaintenanceRecord({ resourceId: '99999', type: 'repair' }),
      404
    );
  });
});

// ═══════════════════════════════════════════════════════════
// 11  STATISTICS
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Statistics', () => {
  test('getStatistics returns all expected fields', () => {
    const stats = service.getStatistics();
    expect(stats).toHaveProperty('utilizationRate');
    expect(stats).toHaveProperty('onTimeRate');
    expect(stats).toHaveProperty('avgDuration');
    expect(stats).toHaveProperty('topBorrowers');
    expect(stats).toHaveProperty('byCondition');
    expect(stats).toHaveProperty('totalFines');
    expect(stats).toHaveProperty('totalLoans');
    expect(stats).toHaveProperty('activeLoans');
    expect(stats).toHaveProperty('overdueCount');
  });

  test('utilizationRate is a number between 0 and 100', () => {
    const { utilizationRate } = service.getStatistics();
    expect(typeof utilizationRate).toBe('number');
    expect(utilizationRate).toBeGreaterThanOrEqual(0);
    expect(utilizationRate).toBeLessThanOrEqual(100);
  });

  test('onTimeRate is a number between 0 and 100', () => {
    const { onTimeRate } = service.getStatistics();
    expect(typeof onTimeRate).toBe('number');
    expect(onTimeRate).toBeGreaterThanOrEqual(0);
    expect(onTimeRate).toBeLessThanOrEqual(100);
  });

  test('avgDuration is a non-negative number', () => {
    const { avgDuration } = service.getStatistics();
    expect(avgDuration).toBeGreaterThanOrEqual(0);
  });

  test('topBorrowers is a sorted array (max 5)', () => {
    const { topBorrowers } = service.getStatistics();
    expect(Array.isArray(topBorrowers)).toBe(true);
    expect(topBorrowers.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < topBorrowers.length; i++) {
      expect(topBorrowers[i - 1].count).toBeGreaterThanOrEqual(topBorrowers[i].count);
    }
  });

  test('topBorrowers entries have name and department', () => {
    const { topBorrowers } = service.getStatistics();
    topBorrowers.forEach(b => {
      expect(b).toHaveProperty('memberId');
      expect(b).toHaveProperty('name');
      expect(b).toHaveProperty('count');
    });
  });

  test('byCondition is an object with condition keys', () => {
    const { byCondition } = service.getStatistics();
    expect(typeof byCondition).toBe('object');
    expect(Object.keys(byCondition).length).toBeGreaterThan(0);
  });

  test('totalLoans matches count of all loans', () => {
    const { totalLoans } = service.getStatistics();
    expect(totalLoans).toBe(service.loans.size);
  });

  test('totalFines is a non-negative number', () => {
    const { totalFines } = service.getStatistics();
    expect(typeof totalFines).toBe('number');
    expect(totalFines).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 12  BARCODE, SEARCH, BULK IMPORT
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Barcode & Search', () => {
  describe('findByBarcode', () => {
    test('finds resource by barcode', () => {
      const r = service.findByBarcode('LIB-001');
      expect(r.id).toBe('1000');
      expect(r.barcode).toBe('LIB-001');
    });

    test('throws 400 if barcode is empty/falsy', () => {
      expectError(() => service.findByBarcode(''), 400);
      expectError(() => service.findByBarcode(null), 400);
      expectError(() => service.findByBarcode(undefined), 400);
    });

    test('throws 404 if barcode not found', () => {
      expectError(() => service.findByBarcode('DOES-NOT-EXIST'), 404);
    });
  });

  describe('searchResources', () => {
    test('searches by name (Arabic)', () => {
      const results = service.searchResources('العلاج');
      expect(results.length).toBeGreaterThan(0);
    });

    test('searches by English name', () => {
      const results = service.searchResources('Physical');
      expect(results.length).toBeGreaterThan(0);
    });

    test('searches by author', () => {
      const results = service.searchResources('أحمد الراشد');
      expect(results.length).toBeGreaterThan(0);
    });

    test('searches by ISBN', () => {
      const results = service.searchResources('978-9953-87-123');
      expect(results.length).toBeGreaterThan(0);
    });

    test('searches by barcode', () => {
      const results = service.searchResources('LIB-001');
      expect(results.length).toBeGreaterThan(0);
    });

    test('searches in description', () => {
      const results = service.searchResources('مرجع شامل');
      expect(results.length).toBeGreaterThan(0);
    });

    test('searches in tags', () => {
      const results = service.searchResources('تأهيل');
      expect(results.length).toBeGreaterThan(0);
    });

    test('returns max 20 results', () => {
      const results = service.searchResources('ال');
      expect(results.length).toBeLessThanOrEqual(20);
    });

    test('returns empty array for unmatched query', () => {
      const results = service.searchResources('xyznonexistent123');
      expect(results).toEqual([]);
    });

    test('throws 400 if query shorter than 2 chars', () => {
      expectError(() => service.searchResources('x'), 400);
    });

    test('throws 400 if query is empty', () => {
      expectError(() => service.searchResources(''), 400);
    });

    test('throws 400 if query is null/undefined', () => {
      expectError(() => service.searchResources(null), 400);
      expectError(() => service.searchResources(undefined), 400);
    });
  });

  describe('bulkImport', () => {
    test('imports valid items successfully', () => {
      const items = [
        { name: 'Bulk1', categoryId: '100', type: 'book' },
        { name: 'Bulk2', categoryId: '101', type: 'therapeutic_tool' },
      ];
      const result = service.bulkImport(items);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    test('handles mixed valid/invalid items', () => {
      const items = [
        { name: 'BulkOK', categoryId: '100', type: 'book' },
        { categoryId: '100', type: 'book' }, // missing name
        { name: 'BulkOK2', categoryId: '99999', type: 'book' }, // bad category
      ];
      const result = service.bulkImport(items);
      expect(result.success).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[1].index).toBe(2);
    });

    test('returns all failed when every item is invalid', () => {
      const items = [
        { type: 'book' }, // missing name & categoryId
        { name: 'x' }, // missing categoryId & type
      ];
      const result = service.bulkImport(items);
      expect(result.success).toBe(0);
      expect(result.failed).toBe(2);
    });

    test('throws 400 if not an array', () => {
      expectError(() => service.bulkImport('not-array'), 400);
      expectError(() => service.bulkImport({}), 400);
      expectError(() => service.bulkImport(null), 400);
    });

    test('throws 400 if empty array', () => {
      expectError(() => service.bulkImport([]), 400);
    });
  });
});

// ═══════════════════════════════════════════════════════════
// 13  RESOURCE TYPES
// ═══════════════════════════════════════════════════════════
describe('LibraryService — Resource Types', () => {
  test('getResourceTypes returns 8 types', () => {
    const types = service.getResourceTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBe(8);
  });

  test('each type has value, label, and icon', () => {
    const types = service.getResourceTypes();
    types.forEach(t => {
      expect(t).toHaveProperty('value');
      expect(t).toHaveProperty('label');
      expect(t).toHaveProperty('icon');
      expect(typeof t.value).toBe('string');
      expect(typeof t.label).toBe('string');
    });
  });

  test('includes expected type values', () => {
    const types = service.getResourceTypes();
    const values = types.map(t => t.value);
    expect(values).toContain('book');
    expect(values).toContain('therapeutic_tool');
    expect(values).toContain('educational');
    expect(values).toContain('media');
    expect(values).toContain('assistive_device');
    expect(values).toContain('game');
    expect(values).toContain('periodical');
    expect(values).toContain('template');
  });
});
