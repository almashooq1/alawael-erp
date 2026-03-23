/**
 * Library & Resources Management Service — نظام المكتبة والموارد
 * Phase 15: إدارة كتب، أدوات علاجية، موارد تعليمية، إعارة
 */
const logger = require('../utils/logger');

class LibraryService {
  constructor() {
    // ═══ Data Stores ═══
    this.resources = new Map();
    this.categories = new Map();
    this.loans = new Map();
    this.reservations = new Map();
    this.members = new Map();
    this.reviews = new Map();
    this.auditLog = new Map();
    this.suppliers = new Map();
    this.maintenanceRecords = new Map();

    // ═══ Auto-increment IDs (set after seed data range) ═══
    this._nextResourceId = 1100;
    this._nextCategoryId = 200;
    this._nextLoanId = 5100;
    this._nextReservationId = 6000;
    this._nextMemberId = 2100;
    this._nextReviewId = 7000;
    this._nextAuditId = 8000;
    this._nextSupplierId = 3100;
    this._nextMaintenanceId = 9000;

    this._seed();
  }

  // ═════════════════════════════════════════════════════════
  // SEED DATA — بيانات تجريبية
  // ═════════════════════════════════════════════════════════
  _seed() {
    // Categories — الفئات
    const cats = [
      { id: '100', name: 'كتب علمية', nameEn: 'Scientific Books', type: 'book', icon: 'MenuBook', color: '#1976d2', description: 'كتب ومراجع علمية متخصصة' },
      { id: '101', name: 'أدوات علاجية', nameEn: 'Therapeutic Tools', type: 'therapeutic_tool', icon: 'Healing', color: '#e91e63', description: 'أدوات وأجهزة العلاج الطبيعي والوظيفي' },
      { id: '102', name: 'موارد تعليمية', nameEn: 'Educational Resources', type: 'educational', icon: 'School', color: '#4caf50', description: 'موارد ومواد تعليمية للمستفيدين' },
      { id: '103', name: 'وسائل سمعية بصرية', nameEn: 'Audio-Visual', type: 'media', icon: 'VideoLibrary', color: '#ff9800', description: 'أفلام تعليمية وتسجيلات صوتية' },
      { id: '104', name: 'أجهزة مساعدة', nameEn: 'Assistive Devices', type: 'assistive_device', icon: 'Accessibility', color: '#9c27b0', description: 'أجهزة مساعدة للأشخاص ذوي الإعاقة' },
      { id: '105', name: 'ألعاب تطويرية', nameEn: 'Developmental Games', type: 'game', icon: 'SportsEsports', color: '#00bcd4', description: 'ألعاب لتنمية المهارات الحركية والذهنية' },
      { id: '106', name: 'مجلات ودوريات', nameEn: 'Journals & Periodicals', type: 'periodical', icon: 'Article', color: '#795548', description: 'مجلات علمية ودوريات متخصصة في التأهيل' },
      { id: '107', name: 'نماذج وقوالب', nameEn: 'Templates & Forms', type: 'template', icon: 'Description', color: '#607d8b', description: 'نماذج تقييم وقوالب مستخدمة في العلاج' },
    ];
    cats.forEach(c => {
      c.resourceCount = 0;
      c.createdAt = new Date('2025-01-15').toISOString();
      this.categories.set(c.id, c);
    });

    // Resources — الموارد
    const resources = [
      {
        id: '1000', categoryId: '100', name: 'أساسيات العلاج الطبيعي', nameEn: 'Fundamentals of Physical Therapy',
        type: 'book', isbn: '978-9953-87-123-4', author: 'د. أحمد الراشد', publisher: 'دار المعرفة',
        publishYear: 2023, edition: '3', pages: 450, language: 'ar',
        description: 'مرجع شامل في أساسيات العلاج الطبيعي وتطبيقاته في مراكز التأهيل',
        location: 'رف A-01', barcode: 'LIB-001', quantity: 5, availableQty: 3,
        condition: 'good', status: 'available', tags: ['علاج طبيعي', 'تأهيل', 'مرجع أساسي'],
        coverImage: null, cost: 120, currency: 'SAR',
      },
      {
        id: '1001', categoryId: '100', name: 'العلاج الوظيفي للأطفال', nameEn: 'Pediatric Occupational Therapy',
        type: 'book', isbn: '978-9953-87-456-7', author: 'د. سارة المنصور', publisher: 'مكتبة الرشد',
        publishYear: 2024, edition: '1', pages: 380, language: 'ar',
        description: 'كتاب متخصص في العلاج الوظيفي للأطفال ذوي الاحتياجات الخاصة',
        location: 'رف A-02', barcode: 'LIB-002', quantity: 3, availableQty: 2,
        condition: 'new', status: 'available', tags: ['علاج وظيفي', 'أطفال', 'احتياجات خاصة'],
        coverImage: null, cost: 95, currency: 'SAR',
      },
      {
        id: '1002', categoryId: '101', name: 'كرات تمارين التوازن', nameEn: 'Balance Exercise Balls',
        type: 'therapeutic_tool', isbn: null, author: null, publisher: 'PhysioEquip',
        publishYear: null, edition: null, pages: null, language: null,
        description: 'مجموعة كرات بأحجام مختلفة لتمارين التوازن والتنسيق الحركي',
        location: 'مخزن B-03', barcode: 'LIB-003', quantity: 10, availableQty: 7,
        condition: 'good', status: 'available', tags: ['توازن', 'حركي', 'تمارين'],
        coverImage: null, cost: 250, currency: 'SAR',
      },
      {
        id: '1003', categoryId: '101', name: 'جهاز تحفيز كهربائي TENS', nameEn: 'TENS Electrostimulation Device',
        type: 'therapeutic_tool', isbn: null, author: null, publisher: 'MedTech',
        publishYear: null, edition: null, pages: null, language: null,
        description: 'جهاز تحفيز كهربائي عصبي عبر الجلد لتخفيف الألم وتحسين الدورة الدموية',
        location: 'غرفة العلاج 2', barcode: 'LIB-004', quantity: 4, availableQty: 2,
        condition: 'good', status: 'available', tags: ['كهربائي', 'تحفيز', 'ألم'],
        coverImage: null, cost: 1200, currency: 'SAR',
      },
      {
        id: '1004', categoryId: '102', name: 'بطاقات التواصل البصري (PECS)', nameEn: 'PECS Communication Cards',
        type: 'educational', isbn: null, author: 'Dr. A. Bondy', publisher: 'Pyramid Educational',
        publishYear: 2022, edition: '2', pages: null, language: 'ar-en',
        description: 'نظام تبادل الصور للتواصل البديل والمعزز للأطفال غير الناطقين',
        location: 'رف C-01', barcode: 'LIB-005', quantity: 8, availableQty: 5,
        condition: 'good', status: 'available', tags: ['تواصل', 'PECS', 'تعليم بديل'],
        coverImage: null, cost: 350, currency: 'SAR',
      },
      {
        id: '1005', categoryId: '102', name: 'منهج التدريب على المهارات الحياتية', nameEn: 'Life Skills Training Curriculum',
        type: 'educational', isbn: null, author: 'فريق التأهيل', publisher: 'مركز الأوائل',
        publishYear: 2024, edition: '1', pages: 200, language: 'ar',
        description: 'منهج تدريبي شامل لتعليم المهارات الحياتية للمستفيدين',
        location: 'رف C-02', barcode: 'LIB-006', quantity: 15, availableQty: 12,
        condition: 'new', status: 'available', tags: ['مهارات حياتية', 'تدريب', 'استقلالية'],
        coverImage: null, cost: 75, currency: 'SAR',
      },
      {
        id: '1006', categoryId: '103', name: 'سلسلة فيديوهات تمارين النطق', nameEn: 'Speech Exercise Video Series',
        type: 'media', isbn: null, author: 'مركز الأوائل', publisher: 'إنتاج داخلي',
        publishYear: 2024, edition: null, pages: null, language: 'ar',
        description: 'سلسلة فيديوهات تعليمية لتمارين النطق والكلام للأطفال',
        location: 'أرشيف رقمي D-01', barcode: 'LIB-007', quantity: 1, availableQty: 1,
        condition: 'new', status: 'available', tags: ['نطق', 'فيديو', 'تمارين'],
        coverImage: null, cost: 0, currency: 'SAR',
      },
      {
        id: '1007', categoryId: '104', name: 'كرسي متحرك كهربائي للأطفال', nameEn: 'Electric Wheelchair for Children',
        type: 'assistive_device', isbn: null, author: null, publisher: 'Sunrise Medical',
        publishYear: null, edition: null, pages: null, language: null,
        description: 'كرسي متحرك كهربائي مصمم خصيصاً للأطفال ذوي الإعاقة الحركية',
        location: 'مخزن الأجهزة E-01', barcode: 'LIB-008', quantity: 3, availableQty: 1,
        condition: 'good', status: 'available', tags: ['كرسي متحرك', 'أطفال', 'إعاقة حركية'],
        coverImage: null, cost: 8500, currency: 'SAR',
      },
      {
        id: '1008', categoryId: '105', name: 'مكعبات البناء التعليمية', nameEn: 'Educational Building Blocks',
        type: 'game', isbn: null, author: null, publisher: 'LEGO Education',
        publishYear: 2023, edition: null, pages: null, language: null,
        description: 'مجموعة مكعبات بناء كبيرة لتنمية المهارات الحركية الدقيقة والإبداع',
        location: 'غرفة الأنشطة F-01', barcode: 'LIB-009', quantity: 6, availableQty: 4,
        condition: 'good', status: 'available', tags: ['مكعبات', 'حركة دقيقة', 'إبداع'],
        coverImage: null, cost: 450, currency: 'SAR',
      },
      {
        id: '1009', categoryId: '106', name: 'المجلة العربية للتربية الخاصة', nameEn: 'Arab Journal of Special Education',
        type: 'periodical', isbn: 'ISSN-1234-5678', author: 'هيئة تحرير المجلة', publisher: 'الجامعة الأردنية',
        publishYear: 2024, edition: 'العدد 45', pages: 150, language: 'ar',
        description: 'مجلة علمية محكّمة متخصصة في التربية الخاصة والتأهيل',
        location: 'رف G-01', barcode: 'LIB-010', quantity: 2, availableQty: 2,
        condition: 'good', status: 'available', tags: ['مجلة', 'تربية خاصة', 'بحث علمي'],
        coverImage: null, cost: 45, currency: 'SAR',
      },
    ];
    resources.forEach(r => {
      r.createdAt = new Date('2025-02-01').toISOString();
      r.updatedAt = r.createdAt;
      r.views = Math.floor(Math.random() * 50);
      r.timesLoaned = Math.floor(Math.random() * 20);
      r.rating = +(3.5 + Math.random() * 1.5).toFixed(1);
      r.reviewCount = Math.floor(Math.random() * 10);
      this.resources.set(r.id, r);
      // Update category count
      const cat = this.categories.get(r.categoryId);
      if (cat) cat.resourceCount++;
    });

    // Members — الأعضاء
    const mbrs = [
      { id: '2000', name: 'أحمد الشهري', role: 'therapist', department: 'العلاج الطبيعي', email: 'ahmed@alawael.org', phone: '0501234567', membershipType: 'staff', maxLoans: 5, activeLoans: 2, totalLoans: 15 },
      { id: '2001', name: 'نورة العتيبي', role: 'teacher', department: 'التعليم الخاص', email: 'noura@alawael.org', phone: '0507654321', membershipType: 'staff', maxLoans: 5, activeLoans: 1, totalLoans: 8 },
      { id: '2002', name: 'خالد المطيري', role: 'specialist', department: 'العلاج الوظيفي', email: 'khalid@alawael.org', phone: '0509876543', membershipType: 'staff', maxLoans: 5, activeLoans: 0, totalLoans: 22 },
      { id: '2003', name: 'فاطمة السبيعي', role: 'researcher', department: 'البحث والتطوير', email: 'fatima@alawael.org', phone: '0503456789', membershipType: 'researcher', maxLoans: 10, activeLoans: 3, totalLoans: 45 },
    ];
    mbrs.forEach(m => {
      m.status = 'active';
      m.createdAt = new Date('2025-01-01').toISOString();
      m.fines = 0;
      this.members.set(m.id, m);
    });

    // Loans — الإعارات
    const loans = [
      { id: '5000', resourceId: '1000', memberId: '2000', loanDate: '2025-03-01', dueDate: '2025-03-15', returnDate: null, status: 'active', renewals: 0, notes: '' },
      { id: '5001', resourceId: '1001', memberId: '2001', loanDate: '2025-03-05', dueDate: '2025-03-19', returnDate: null, status: 'active', renewals: 0, notes: '' },
      { id: '5002', resourceId: '1002', memberId: '2000', loanDate: '2025-02-15', dueDate: '2025-03-01', returnDate: '2025-02-28', status: 'returned', renewals: 0, notes: '' },
      { id: '5003', resourceId: '1004', memberId: '2003', loanDate: '2025-03-10', dueDate: '2025-03-24', returnDate: null, status: 'active', renewals: 1, notes: 'تم التجديد مرة واحدة' },
      { id: '5004', resourceId: '1003', memberId: '2002', loanDate: '2025-02-01', dueDate: '2025-02-15', returnDate: '2025-02-20', status: 'returned_late', renewals: 0, notes: 'تأخير 5 أيام' },
      { id: '5005', resourceId: '1008', memberId: '2003', loanDate: '2025-03-12', dueDate: '2025-03-26', returnDate: null, status: 'active', renewals: 0, notes: '' },
      { id: '5006', resourceId: '1005', memberId: '2003', loanDate: '2025-03-15', dueDate: '2025-03-29', returnDate: null, status: 'active', renewals: 0, notes: '' },
    ];
    loans.forEach(l => {
      l.createdAt = l.loanDate;
      this.loans.set(l.id, l);
    });

    // Suppliers — الموردون
    const sups = [
      { id: '3000', name: 'دار المعرفة للنشر', contact: 'محمد العلي', email: 'info@marefah.com', phone: '0112345678', type: 'publisher', rating: 4.5 },
      { id: '3001', name: 'PhysioEquip International', contact: 'John Smith', email: 'sales@physioequip.com', phone: '+44-123-456789', type: 'equipment', rating: 4.2 },
      { id: '3002', name: 'Sunrise Medical Arabia', contact: 'عمر الحربي', email: 'omar@sunrise.sa', phone: '0118765432', type: 'assistive_devices', rating: 4.8 },
    ];
    sups.forEach(s => {
      s.status = 'active';
      s.createdAt = new Date('2025-01-10').toISOString();
      this.suppliers.set(s.id, s);
    });

    this._nextResourceId = 1010;
    this._nextLoanId = 5007;
    this._nextMemberId = 2004;
    this._nextSupplierId = 3003;

    logger.info('LibraryService seeded: 10 resources, 8 categories, 7 loans, 4 members, 3 suppliers');
  }

  // ═════════════════════════════════════════════════════════
  // DASHBOARD — لوحة المعلومات
  // ═════════════════════════════════════════════════════════
  getDashboard() {
    const allResources = Array.from(this.resources.values());
    const allLoans = Array.from(this.loans.values());
    const activeLoans = allLoans.filter(l => l.status === 'active');
    const overdueLoans = activeLoans.filter(l => new Date(l.dueDate) < new Date());
    const allMembers = Array.from(this.members.values());

    const totalResources = allResources.length;
    const totalQuantity = allResources.reduce((sum, r) => sum + r.quantity, 0);
    const availableQuantity = allResources.reduce((sum, r) => sum + r.availableQty, 0);
    const totalValue = allResources.reduce((sum, r) => sum + (r.cost * r.quantity), 0);

    // Resources by type
    const byType = {};
    allResources.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
    });

    // Resources by category
    const byCategory = Array.from(this.categories.values()).map(c => ({
      id: c.id,
      name: c.name,
      count: c.resourceCount,
      color: c.color,
    }));

    // Most borrowed
    const mostBorrowed = [...allResources]
      .sort((a, b) => b.timesLoaned - a.timesLoaned)
      .slice(0, 5)
      .map(r => ({ id: r.id, name: r.name, type: r.type, timesLoaned: r.timesLoaned }));

    // Top rated
    const topRated = [...allResources]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map(r => ({ id: r.id, name: r.name, rating: r.rating, reviewCount: r.reviewCount }));

    // Recent loans
    const recentLoans = [...allLoans]
      .sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate))
      .slice(0, 5)
      .map(l => {
        const res = this.resources.get(l.resourceId);
        const mem = this.members.get(l.memberId);
        return {
          id: l.id,
          resourceName: res?.name || 'غير معروف',
          memberName: mem?.name || 'غير معروف',
          loanDate: l.loanDate,
          dueDate: l.dueDate,
          status: l.status,
        };
      });

    // Loan trend (monthly)
    const monthlyLoans = {};
    allLoans.forEach(l => {
      const month = l.loanDate.substring(0, 7);
      monthlyLoans[month] = (monthlyLoans[month] || 0) + 1;
    });

    return {
      kpis: {
        totalResources,
        totalQuantity,
        availableQuantity,
        loanedQuantity: totalQuantity - availableQuantity,
        activeLoans: activeLoans.length,
        overdueLoans: overdueLoans.length,
        totalMembers: allMembers.length,
        activeMembers: allMembers.filter(m => m.status === 'active').length,
        totalValue,
        averageRating: allResources.length > 0
          ? +(allResources.reduce((s, r) => s + r.rating, 0) / allResources.length).toFixed(1)
          : 0,
      },
      byType,
      byCategory,
      mostBorrowed,
      topRated,
      recentLoans,
      monthlyLoans,
    };
  }

  // ═════════════════════════════════════════════════════════
  // CATEGORIES — الفئات
  // ═════════════════════════════════════════════════════════
  getCategories() {
    return Array.from(this.categories.values());
  }

  getCategoryById(id) {
    const cat = this.categories.get(String(id));
    if (!cat) throw Object.assign(new Error('الفئة غير موجودة'), { statusCode: 404 });
    return cat;
  }

  createCategory(data) {
    if (!data.name) throw Object.assign(new Error('اسم الفئة مطلوب'), { statusCode: 400 });
    if (!data.type) throw Object.assign(new Error('نوع الفئة مطلوب'), { statusCode: 400 });
    const id = String(this._nextCategoryId++);
    const cat = {
      id,
      name: data.name,
      nameEn: data.nameEn || '',
      type: data.type,
      icon: data.icon || 'Folder',
      color: data.color || '#607d8b',
      description: data.description || '',
      resourceCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.categories.set(id, cat);
    logger.info(`Category created: ${cat.name} (${id})`);
    return cat;
  }

  updateCategory(id, data) {
    const cat = this.getCategoryById(id);
    if (data.name) cat.name = data.name;
    if (data.nameEn !== undefined) cat.nameEn = data.nameEn;
    if (data.type) cat.type = data.type;
    if (data.icon) cat.icon = data.icon;
    if (data.color) cat.color = data.color;
    if (data.description !== undefined) cat.description = data.description;
    return cat;
  }

  deleteCategory(id) {
    const cat = this.getCategoryById(id);
    const resourcesInCat = Array.from(this.resources.values()).filter(r => r.categoryId === String(id));
    if (resourcesInCat.length > 0) {
      throw Object.assign(new Error('لا يمكن حذف فئة تحتوي على موارد'), { statusCode: 400 });
    }
    this.categories.delete(String(id));
    logger.info(`Category deleted: ${cat.name} (${id})`);
    return { message: 'تم حذف الفئة بنجاح' };
  }

  // ═════════════════════════════════════════════════════════
  // RESOURCES — الموارد
  // ═════════════════════════════════════════════════════════
  getResources(filters = {}) {
    let items = Array.from(this.resources.values());

    if (filters.categoryId) items = items.filter(r => r.categoryId === filters.categoryId);
    if (filters.type) items = items.filter(r => r.type === filters.type);
    if (filters.status) items = items.filter(r => r.status === filters.status);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      items = items.filter(r =>
        r.name.toLowerCase().includes(s) ||
        (r.nameEn && r.nameEn.toLowerCase().includes(s)) ||
        (r.author && r.author.toLowerCase().includes(s)) ||
        (r.barcode && r.barcode.toLowerCase().includes(s)) ||
        (r.tags && r.tags.some(t => t.toLowerCase().includes(s)))
      );
    }
    if (filters.language) items = items.filter(r => r.language === filters.language);

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const order = filters.order === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) return -1 * order;
      if (a[sortBy] > b[sortBy]) return 1 * order;
      return 0;
    });

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const total = items.length;
    const start = (page - 1) * limit;
    const paginated = items.slice(start, start + limit);

    return { data: paginated, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getResourceById(id) {
    const r = this.resources.get(String(id));
    if (!r) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });
    r.views = (r.views || 0) + 1;
    // Include category info
    const cat = this.categories.get(r.categoryId);
    return { ...r, category: cat || null };
  }

  createResource(data) {
    if (!data.name) throw Object.assign(new Error('اسم المورد مطلوب'), { statusCode: 400 });
    if (!data.categoryId) throw Object.assign(new Error('الفئة مطلوبة'), { statusCode: 400 });
    if (!data.type) throw Object.assign(new Error('نوع المورد مطلوب'), { statusCode: 400 });
    this.getCategoryById(data.categoryId);

    const id = String(this._nextResourceId++);
    const resource = {
      id,
      categoryId: data.categoryId,
      name: data.name,
      nameEn: data.nameEn || '',
      type: data.type,
      isbn: data.isbn || null,
      author: data.author || null,
      publisher: data.publisher || null,
      publishYear: data.publishYear || null,
      edition: data.edition || null,
      pages: data.pages || null,
      language: data.language || 'ar',
      description: data.description || '',
      location: data.location || '',
      barcode: data.barcode || `LIB-${id}`,
      quantity: data.quantity || 1,
      availableQty: data.quantity || 1,
      condition: data.condition || 'new',
      status: 'available',
      tags: data.tags || [],
      coverImage: data.coverImage || null,
      cost: data.cost || 0,
      currency: data.currency || 'SAR',
      views: 0,
      timesLoaned: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.resources.set(id, resource);

    // Update category count
    const cat = this.categories.get(data.categoryId);
    if (cat) cat.resourceCount++;

    logger.info(`Resource created: ${resource.name} (${id})`);
    return resource;
  }

  updateResource(id, data) {
    const r = this.resources.get(String(id));
    if (!r) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });

    const fields = ['name', 'nameEn', 'type', 'isbn', 'author', 'publisher', 'publishYear',
      'edition', 'pages', 'language', 'description', 'location', 'barcode',
      'condition', 'tags', 'coverImage', 'cost', 'currency'];
    fields.forEach(f => { if (data[f] !== undefined) r[f] = data[f]; });

    if (data.quantity !== undefined) {
      const diff = data.quantity - r.quantity;
      r.quantity = data.quantity;
      r.availableQty = Math.max(0, r.availableQty + diff);
    }
    if (data.categoryId && data.categoryId !== r.categoryId) {
      const oldCat = this.categories.get(r.categoryId);
      if (oldCat) oldCat.resourceCount--;
      const newCat = this.getCategoryById(data.categoryId);
      newCat.resourceCount++;
      r.categoryId = data.categoryId;
    }

    r.updatedAt = new Date().toISOString();
    logger.info(`Resource updated: ${r.name} (${id})`);
    return r;
  }

  deleteResource(id) {
    const r = this.resources.get(String(id));
    if (!r) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });

    // Check active loans
    const activeLoans = Array.from(this.loans.values()).filter(
      l => l.resourceId === String(id) && l.status === 'active'
    );
    if (activeLoans.length > 0) {
      throw Object.assign(new Error('لا يمكن حذف مورد له إعارات نشطة'), { statusCode: 400 });
    }

    const cat = this.categories.get(r.categoryId);
    if (cat) cat.resourceCount--;
    this.resources.delete(String(id));
    logger.info(`Resource deleted: ${r.name} (${id})`);
    return { message: 'تم حذف المورد بنجاح' };
  }

  // ═════════════════════════════════════════════════════════
  // LOANS — الإعارة
  // ═════════════════════════════════════════════════════════
  getLoans(filters = {}) {
    let items = Array.from(this.loans.values());

    if (filters.status) items = items.filter(l => l.status === filters.status);
    if (filters.memberId) items = items.filter(l => l.memberId === filters.memberId);
    if (filters.resourceId) items = items.filter(l => l.resourceId === filters.resourceId);
    if (filters.overdue === 'true') {
      items = items.filter(l => l.status === 'active' && new Date(l.dueDate) < new Date());
    }

    // Enrich with resource and member info
    items = items.map(l => {
      const res = this.resources.get(l.resourceId);
      const mem = this.members.get(l.memberId);
      return {
        ...l,
        resourceName: res?.name || 'غير معروف',
        resourceType: res?.type || '',
        memberName: mem?.name || 'غير معروف',
        memberDepartment: mem?.department || '',
      };
    });

    // Sort by loan date descending
    items.sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate));

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const total = items.length;
    const start = (page - 1) * limit;

    return { data: items.slice(start, start + limit), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getLoanById(id) {
    const loan = this.loans.get(String(id));
    if (!loan) throw Object.assign(new Error('الإعارة غير موجودة'), { statusCode: 404 });
    const res = this.resources.get(loan.resourceId);
    const mem = this.members.get(loan.memberId);
    return {
      ...loan,
      resource: res || null,
      member: mem || null,
    };
  }

  createLoan(data) {
    if (!data.resourceId) throw Object.assign(new Error('المورد مطلوب'), { statusCode: 400 });
    if (!data.memberId) throw Object.assign(new Error('العضو مطلوب'), { statusCode: 400 });

    const resource = this.resources.get(String(data.resourceId));
    if (!resource) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });
    if (resource.availableQty <= 0) {
      throw Object.assign(new Error('المورد غير متوفر حالياً'), { statusCode: 400 });
    }

    const member = this.members.get(String(data.memberId));
    if (!member) throw Object.assign(new Error('العضو غير موجود'), { statusCode: 404 });
    if (member.status !== 'active') {
      throw Object.assign(new Error('عضوية العضو غير نشطة'), { statusCode: 400 });
    }
    if (member.activeLoans >= member.maxLoans) {
      throw Object.assign(new Error('العضو تجاوز الحد الأقصى للإعارات'), { statusCode: 400 });
    }

    // Check for existing active loan of same resource by same member
    const existingLoan = Array.from(this.loans.values()).find(
      l => l.resourceId === String(data.resourceId) && l.memberId === String(data.memberId) && l.status === 'active'
    );
    if (existingLoan) {
      throw Object.assign(new Error('العضو لديه إعارة نشطة لنفس المورد'), { statusCode: 400 });
    }

    const loanDays = data.loanDays || 14;
    const loanDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const id = String(this._nextLoanId++);
    const loan = {
      id,
      resourceId: String(data.resourceId),
      memberId: String(data.memberId),
      loanDate,
      dueDate,
      returnDate: null,
      status: 'active',
      renewals: 0,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };
    this.loans.set(id, loan);

    // Update resource availability
    resource.availableQty--;
    resource.timesLoaned++;
    if (resource.availableQty === 0) resource.status = 'unavailable';

    // Update member loan count
    member.activeLoans++;
    member.totalLoans++;

    logger.info(`Loan created: ${resource.name} → ${member.name} (${id})`);
    return loan;
  }

  returnLoan(id) {
    const loan = this.loans.get(String(id));
    if (!loan) throw Object.assign(new Error('الإعارة غير موجودة'), { statusCode: 404 });
    if (loan.status !== 'active') {
      throw Object.assign(new Error('الإعارة ليست نشطة'), { statusCode: 400 });
    }

    const returnDate = new Date().toISOString().split('T')[0];
    const isLate = new Date(returnDate) > new Date(loan.dueDate);
    loan.returnDate = returnDate;
    loan.status = isLate ? 'returned_late' : 'returned';

    // Calculate fine if late
    if (isLate) {
      const daysLate = Math.ceil((new Date(returnDate) - new Date(loan.dueDate)) / (24 * 60 * 60 * 1000));
      const finePerDay = 5; // 5 SAR per day
      loan.fine = daysLate * finePerDay;
      const member = this.members.get(loan.memberId);
      if (member) member.fines = (member.fines || 0) + loan.fine;
    }

    // Update resource availability
    const resource = this.resources.get(loan.resourceId);
    if (resource) {
      resource.availableQty++;
      if (resource.status === 'unavailable' && resource.availableQty > 0) {
        resource.status = 'available';
      }
    }

    // Update member
    const member = this.members.get(loan.memberId);
    if (member) member.activeLoans = Math.max(0, member.activeLoans - 1);

    logger.info(`Loan returned: ${loan.id} (${isLate ? 'late' : 'on time'})`);
    return loan;
  }

  renewLoan(id) {
    const loan = this.loans.get(String(id));
    if (!loan) throw Object.assign(new Error('الإعارة غير موجودة'), { statusCode: 404 });
    if (loan.status !== 'active') {
      throw Object.assign(new Error('الإعارة ليست نشطة'), { statusCode: 400 });
    }
    if (loan.renewals >= 3) {
      throw Object.assign(new Error('تم الوصول للحد الأقصى للتجديدات (3)'), { statusCode: 400 });
    }

    // Check if overdue
    if (new Date(loan.dueDate) < new Date()) {
      throw Object.assign(new Error('لا يمكن تجديد إعارة متأخرة. يرجى إرجاع المورد أولاً'), { statusCode: 400 });
    }

    // Extend by 14 days
    const currentDue = new Date(loan.dueDate);
    currentDue.setDate(currentDue.getDate() + 14);
    loan.dueDate = currentDue.toISOString().split('T')[0];
    loan.renewals++;

    logger.info(`Loan renewed: ${loan.id} (renewal #${loan.renewals})`);
    return loan;
  }

  // ═════════════════════════════════════════════════════════
  // RESERVATIONS — الحجوزات
  // ═════════════════════════════════════════════════════════
  getReservations(filters = {}) {
    let items = Array.from(this.reservations.values());
    if (filters.status) items = items.filter(r => r.status === filters.status);
    if (filters.memberId) items = items.filter(r => r.memberId === filters.memberId);

    items = items.map(r => {
      const res = this.resources.get(r.resourceId);
      const mem = this.members.get(r.memberId);
      return { ...r, resourceName: res?.name, memberName: mem?.name };
    });

    return items;
  }

  createReservation(data) {
    if (!data.resourceId) throw Object.assign(new Error('المورد مطلوب'), { statusCode: 400 });
    if (!data.memberId) throw Object.assign(new Error('العضو مطلوب'), { statusCode: 400 });

    const resource = this.resources.get(String(data.resourceId));
    if (!resource) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });

    const member = this.members.get(String(data.memberId));
    if (!member) throw Object.assign(new Error('العضو غير موجود'), { statusCode: 404 });

    // Check if resource is available — if yes, no need to reserve
    if (resource.availableQty > 0) {
      throw Object.assign(new Error('المورد متوفر حالياً. يمكنك استعارته مباشرة'), { statusCode: 400 });
    }

    const id = String(this._nextReservationId++);
    const reservation = {
      id,
      resourceId: String(data.resourceId),
      memberId: String(data.memberId),
      status: 'pending',
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      notes: data.notes || '',
    };
    this.reservations.set(id, reservation);
    logger.info(`Reservation created: ${resource.name} → ${member.name} (${id})`);
    return reservation;
  }

  cancelReservation(id) {
    const r = this.reservations.get(String(id));
    if (!r) throw Object.assign(new Error('الحجز غير موجود'), { statusCode: 404 });
    if (r.status !== 'pending') {
      throw Object.assign(new Error('لا يمكن إلغاء هذا الحجز'), { statusCode: 400 });
    }
    r.status = 'cancelled';
    return r;
  }

  // ═════════════════════════════════════════════════════════
  // MEMBERS — الأعضاء
  // ═════════════════════════════════════════════════════════
  getMembers(filters = {}) {
    let items = Array.from(this.members.values());
    if (filters.status) items = items.filter(m => m.status === filters.status);
    if (filters.department) items = items.filter(m => m.department === filters.department);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      items = items.filter(m => m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s));
    }
    return items;
  }

  getMemberById(id) {
    const m = this.members.get(String(id));
    if (!m) throw Object.assign(new Error('العضو غير موجود'), { statusCode: 404 });
    // Get member's active loans
    const memberLoans = Array.from(this.loans.values())
      .filter(l => l.memberId === String(id))
      .map(l => {
        const res = this.resources.get(l.resourceId);
        return { ...l, resourceName: res?.name || 'غير معروف' };
      });
    return { ...m, loans: memberLoans };
  }

  createMember(data) {
    if (!data.name) throw Object.assign(new Error('اسم العضو مطلوب'), { statusCode: 400 });
    if (!data.email) throw Object.assign(new Error('البريد الإلكتروني مطلوب'), { statusCode: 400 });

    // Check duplicate email
    const exists = Array.from(this.members.values()).find(m => m.email === data.email);
    if (exists) throw Object.assign(new Error('البريد الإلكتروني مستخدم بالفعل'), { statusCode: 400 });

    const id = String(this._nextMemberId++);
    const member = {
      id,
      name: data.name,
      role: data.role || 'staff',
      department: data.department || '',
      email: data.email,
      phone: data.phone || '',
      membershipType: data.membershipType || 'staff',
      maxLoans: data.maxLoans || 5,
      activeLoans: 0,
      totalLoans: 0,
      status: 'active',
      fines: 0,
      createdAt: new Date().toISOString(),
    };
    this.members.set(id, member);
    logger.info(`Member created: ${member.name} (${id})`);
    return member;
  }

  updateMember(id, data) {
    const m = this.getMemberById(id);
    const fields = ['name', 'role', 'department', 'email', 'phone', 'membershipType', 'maxLoans', 'status'];
    fields.forEach(f => { if (data[f] !== undefined) m[f] = data[f]; });
    return m;
  }

  // ═════════════════════════════════════════════════════════
  // REVIEWS — التقييمات
  // ═════════════════════════════════════════════════════════
  getResourceReviews(resourceId) {
    this.getResourceById(resourceId); // Validate resource exists
    return Array.from(this.reviews.values())
      .filter(r => r.resourceId === String(resourceId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  addReview(resourceId, data) {
    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw Object.assign(new Error('التقييم يجب أن يكون بين 1 و 5'), { statusCode: 400 });
    }
    const resource = this.resources.get(String(resourceId));
    if (!resource) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });

    const id = String(this._nextReviewId++);
    const review = {
      id,
      resourceId: String(resourceId),
      userId: data.userId || 'anonymous',
      userName: data.userName || 'مجهول',
      rating: data.rating,
      comment: data.comment || '',
      createdAt: new Date().toISOString(),
    };
    this.reviews.set(id, review);

    // Update resource rating
    const allReviews = Array.from(this.reviews.values()).filter(r => r.resourceId === String(resourceId));
    resource.rating = +(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1);
    resource.reviewCount = allReviews.length;

    return review;
  }

  // ═════════════════════════════════════════════════════════
  // SUPPLIERS — الموردون
  // ═════════════════════════════════════════════════════════
  getSuppliers() {
    return Array.from(this.suppliers.values());
  }

  createSupplier(data) {
    if (!data.name) throw Object.assign(new Error('اسم المورّد مطلوب'), { statusCode: 400 });
    const id = String(this._nextSupplierId++);
    const supplier = {
      id,
      name: data.name,
      contact: data.contact || '',
      email: data.email || '',
      phone: data.phone || '',
      type: data.type || 'general',
      rating: data.rating || 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  // ═════════════════════════════════════════════════════════
  // MAINTENANCE — صيانة الموارد
  // ═════════════════════════════════════════════════════════
  getMaintenanceRecords(resourceId) {
    let items = Array.from(this.maintenanceRecords.values());
    if (resourceId) items = items.filter(m => m.resourceId === String(resourceId));
    return items;
  }

  createMaintenanceRecord(data) {
    if (!data.resourceId) throw Object.assign(new Error('المورد مطلوب'), { statusCode: 400 });
    if (!data.type) throw Object.assign(new Error('نوع الصيانة مطلوب'), { statusCode: 400 });
    const resource = this.resources.get(String(data.resourceId));
    if (!resource) throw Object.assign(new Error('المورد غير موجود'), { statusCode: 404 });

    const id = String(this._nextMaintenanceId++);
    const record = {
      id,
      resourceId: String(data.resourceId),
      type: data.type, // repair, inspection, replacement, calibration
      description: data.description || '',
      cost: data.cost || 0,
      performedBy: data.performedBy || '',
      performedAt: new Date().toISOString(),
      nextMaintenanceDate: data.nextMaintenanceDate || null,
      status: data.status || 'completed',
    };
    this.maintenanceRecords.set(id, record);

    // Update resource condition if specified
    if (data.newCondition) resource.condition = data.newCondition;

    logger.info(`Maintenance record created for ${resource.name} (${id})`);
    return record;
  }

  // ═════════════════════════════════════════════════════════
  // REPORTS & STATISTICS — التقارير والإحصائيات
  // ═════════════════════════════════════════════════════════
  getStatistics() {
    const allResources = Array.from(this.resources.values());
    const allLoans = Array.from(this.loans.values());
    const allMembers = Array.from(this.members.values());

    // Utilization rate
    const totalQty = allResources.reduce((s, r) => s + r.quantity, 0);
    const availableQty = allResources.reduce((s, r) => s + r.availableQty, 0);
    const utilizationRate = totalQty > 0 ? +((1 - availableQty / totalQty) * 100).toFixed(1) : 0;

    // Return rate
    const returnedLoans = allLoans.filter(l => ['returned', 'returned_late'].includes(l.status));
    const lateReturns = allLoans.filter(l => l.status === 'returned_late');
    const onTimeRate = returnedLoans.length > 0
      ? +((1 - lateReturns.length / returnedLoans.length) * 100).toFixed(1)
      : 100;

    // Average loan duration
    const completedLoans = allLoans.filter(l => l.returnDate);
    const avgDuration = completedLoans.length > 0
      ? +(completedLoans.reduce((s, l) => {
          return s + (new Date(l.returnDate) - new Date(l.loanDate)) / (24 * 60 * 60 * 1000);
        }, 0) / completedLoans.length).toFixed(1)
      : 0;

    // Top borrowers
    const borrowerCounts = {};
    allLoans.forEach(l => {
      borrowerCounts[l.memberId] = (borrowerCounts[l.memberId] || 0) + 1;
    });
    const topBorrowers = Object.entries(borrowerCounts)
      .map(([memberId, count]) => {
        const m = this.members.get(memberId);
        return { memberId, name: m?.name || 'غير معروف', department: m?.department || '', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Resources by condition
    const byCondition = {};
    allResources.forEach(r => {
      byCondition[r.condition] = (byCondition[r.condition] || 0) + 1;
    });

    // Total fines
    const totalFines = allMembers.reduce((s, m) => s + (m.fines || 0), 0);

    return {
      utilizationRate,
      onTimeRate,
      avgDuration,
      topBorrowers,
      byCondition,
      totalFines,
      totalLoans: allLoans.length,
      activeLoans: allLoans.filter(l => l.status === 'active').length,
      overdueCount: allLoans.filter(l => l.status === 'active' && new Date(l.dueDate) < new Date()).length,
    };
  }

  // ═════════════════════════════════════════════════════════
  // BARCODE & SEARCH — الباركود والبحث
  // ═════════════════════════════════════════════════════════
  findByBarcode(barcode) {
    if (!barcode) throw Object.assign(new Error('الباركود مطلوب'), { statusCode: 400 });
    const resource = Array.from(this.resources.values()).find(r => r.barcode === barcode);
    if (!resource) throw Object.assign(new Error('لا يوجد مورد بهذا الباركود'), { statusCode: 404 });
    return resource;
  }

  searchResources(query) {
    if (!query || query.length < 2) {
      throw Object.assign(new Error('يجب إدخال حرفين على الأقل للبحث'), { statusCode: 400 });
    }
    const q = query.toLowerCase();
    return Array.from(this.resources.values()).filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.nameEn && r.nameEn.toLowerCase().includes(q)) ||
      (r.author && r.author.toLowerCase().includes(q)) ||
      (r.isbn && r.isbn.includes(q)) ||
      (r.barcode && r.barcode.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(q)))
    ).slice(0, 20);
  }

  // ═════════════════════════════════════════════════════════
  // BULK OPERATIONS — العمليات المجمعة
  // ═════════════════════════════════════════════════════════
  bulkImport(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw Object.assign(new Error('يجب تقديم قائمة موارد للاستيراد'), { statusCode: 400 });
    }
    const results = { success: 0, failed: 0, errors: [] };
    items.forEach((item, idx) => {
      try {
        this.createResource(item);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ index: idx, error: err.message });
      }
    });
    return results;
  }

  getResourceTypes() {
    return [
      { value: 'book', label: 'كتاب', icon: 'MenuBook' },
      { value: 'therapeutic_tool', label: 'أداة علاجية', icon: 'Healing' },
      { value: 'educational', label: 'مورد تعليمي', icon: 'School' },
      { value: 'media', label: 'وسائط سمعية بصرية', icon: 'VideoLibrary' },
      { value: 'assistive_device', label: 'جهاز مساعد', icon: 'Accessibility' },
      { value: 'game', label: 'لعبة تطويرية', icon: 'SportsEsports' },
      { value: 'periodical', label: 'مجلة/دورية', icon: 'Article' },
      { value: 'template', label: 'نموذج/قالب', icon: 'Description' },
    ];
  }
}

module.exports = new LibraryService();
