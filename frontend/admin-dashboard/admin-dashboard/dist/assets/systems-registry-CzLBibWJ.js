/**
 * 📋 Systems Registry - تسجيل جميع الأنظمة المتقدمة
 * ملف موحد لتسجيل وإدارة جميع أنظمة مراكز الأوائل للرعاية النهارية
 */

// Dynamic import map for all advanced systems
const systemModuleLoaders = {
  'advanced-sessions': () => import('../rehabilitation-center-advanced-sessions.js'),
  'advanced-programs': () => import('../rehabilitation-center-advanced-rehabilitation-programs.js'),
  'advanced-goals-plans': () => import('../rehabilitation-center-advanced-goals-plans.js'),
  'advanced-appointments': () => import('../rehabilitation-center-advanced-appointments.js'),
  'advanced-medications': () => import('../rehabilitation-center-advanced-medications.js'),
  'advanced-medical-records': () => import('../rehabilitation-center-advanced-medical-records.js'),
  'advanced-medical-reports': () => import('../rehabilitation-center-advanced-medical-reports.js'),
  'advanced-follow-up': () => import('../rehabilitation-center-advanced-follow-up.js'),
  'advanced-evaluations': () => import('../rehabilitation-center-advanced-evaluations.js'),
  'advanced-hr': () => import('../rehabilitation-center-advanced-hr.js'),
  'advanced-accounting': () => import('../rehabilitation-center-advanced-accounting.js'),
  'advanced-inventory': () => import('../rehabilitation-center-advanced-inventory.js'),
  'advanced-elearning': () => import('../rehabilitation-center-advanced-elearning.js'),
  'advanced-maintenance': () => import('../rehabilitation-center-advanced-maintenance.js'),
  'advanced-events': () => import('../rehabilitation-center-advanced-events.js'),
  'advanced-complaints': () => import('../rehabilitation-center-advanced-complaints.js'),
  'advanced-quality': () => import('../rehabilitation-center-advanced-quality.js'),
  'advanced-security': () => import('../rehabilitation-center-advanced-security.js'),
  'advanced-transportation': () => import('../rehabilitation-center-advanced-transportation.js'),
  'advanced-restaurant': () => import('../rehabilitation-center-advanced-restaurant.js'),
  'advanced-facilities': () => import('../rehabilitation-center-advanced-facilities.js'),
  'advanced-volunteers': () => import('../rehabilitation-center-advanced-volunteers.js'),
  'advanced-partnerships': () => import('../rehabilitation-center-advanced-partnerships.js'),
  'advanced-branches': () => import('../rehabilitation-center-advanced-branches.js'),
  'advanced-call-center': () => import('../rehabilitation-center-advanced-call-center.js'),
  'advanced-research': () => import('../rehabilitation-center-advanced-research.js'),
  'advanced-referrals': () => import('../rehabilitation-center-advanced-referrals.js'),
  'advanced-library': () => import('../rehabilitation-center-advanced-library.js'),
  'advanced-pr': () => import('../rehabilitation-center-advanced-pr.js'),
  'advanced-funding': () => import('../rehabilitation-center-advanced-funding.js'),
};

/**
 * Systems Registry
 * سجل شامل لجميع الأنظمة المتقدمة
 */
class SystemsRegistry {
  constructor() {
    this.systems = new Map();
    this.instances = new Map();
    this.initializeSystems();
  }

  initializeSystems() {
    // Register all advanced systems
    const systemsList = [
      { id: 'advanced-sessions', name: 'إدارة الجلسات المتقدم', icon: 'fas fa-calendar-check' },
      {
        id: 'advanced-programs',
        name: 'إدارة البرامج التأهيلية المتقدم',
        icon: 'fas fa-project-diagram',
      },
      { id: 'advanced-goals-plans', name: 'إدارة الأهداف والخطط المتقدم', icon: 'fas fa-bullseye' },
      { id: 'advanced-appointments', name: 'إدارة المواعيد المتقدم', icon: 'fas fa-calendar-alt' },
      { id: 'advanced-medications', name: 'إدارة الأدوية والعلاجات المتقدم', icon: 'fas fa-pills' },
      {
        id: 'advanced-medical-records',
        name: 'إدارة الملفات الطبية المتقدم',
        icon: 'fas fa-file-medical',
      },
      {
        id: 'advanced-medical-reports',
        name: 'إدارة التقارير الطبية المتقدم',
        icon: 'fas fa-file-medical-alt',
      },
      { id: 'advanced-follow-up', name: 'إدارة المتابعة المتقدم', icon: 'fas fa-tasks' },
      { id: 'advanced-evaluations', name: 'إدارة التقييمات المتقدم', icon: 'fas fa-star' },
      { id: 'advanced-hr', name: 'إدارة الموارد البشرية المتقدم', icon: 'fas fa-users-cog' },
      {
        id: 'advanced-accounting',
        name: 'إدارة المالية والمحاسبة المتقدم',
        icon: 'fas fa-calculator',
      },
      { id: 'advanced-inventory', name: 'إدارة المخزون المتقدم', icon: 'fas fa-warehouse' },
      { id: 'advanced-elearning', name: 'نظام التعلم عن بعد المتقدم', icon: 'fas fa-laptop-code' },
      { id: 'advanced-maintenance', name: 'إدارة الصيانة المتقدم', icon: 'fas fa-tools' },
      {
        id: 'advanced-events',
        name: 'إدارة الأحداث والفعاليات المتقدم',
        icon: 'fas fa-calendar-week',
      },
      {
        id: 'advanced-complaints',
        name: 'إدارة الشكاوى والمقترحات المتقدم',
        icon: 'fas fa-comment-dots',
      },
      { id: 'advanced-quality', name: 'إدارة الجودة المتقدم', icon: 'fas fa-award' },
      { id: 'advanced-security', name: 'إدارة الأمن والسلامة المتقدم', icon: 'fas fa-shield-alt' },
      { id: 'advanced-transportation', name: 'إدارة النقل والمواصلات المتقدم', icon: 'fas fa-bus' },
      {
        id: 'advanced-restaurant',
        name: 'إدارة المطاعم والوجبات المتقدم',
        icon: 'fas fa-utensils',
      },
      {
        id: 'advanced-facilities',
        name: 'إدارة المرافق والخدمات المتقدم',
        icon: 'fas fa-building',
      },
      {
        id: 'advanced-volunteers',
        name: 'إدارة التطوع والمتطوعين المتقدم',
        icon: 'fas fa-hands-helping',
      },
      {
        id: 'advanced-partnerships',
        name: 'إدارة الشراكات والتعاون المتقدم',
        icon: 'fas fa-handshake',
      },
      {
        id: 'advanced-branches',
        name: 'ربط الفروع مع الفرع الرئيسي المتقدم',
        icon: 'fas fa-sitemap',
      },
      {
        id: 'advanced-call-center',
        name: 'نظام اتصالات الهاتف الموحد وكول سنتر',
        icon: 'fas fa-phone-alt',
      },
      {
        id: 'advanced-research',
        name: 'إدارة الأبحاث والدراسات المتقدم',
        icon: 'fas fa-microscope',
      },
      {
        id: 'advanced-referrals',
        name: 'إدارة الإحالات والتحويلات المتقدم',
        icon: 'fas fa-exchange-alt',
      },
      {
        id: 'advanced-library',
        name: 'إدارة المكتبة والموارد التعليمية المتقدم',
        icon: 'fas fa-book',
      },
      {
        id: 'advanced-pr',
        name: 'إدارة العلاقات العامة والإعلام المتقدم',
        icon: 'fas fa-bullhorn',
      },
      {
        id: 'advanced-funding',
        name: 'إدارة التمويل والمنح المتقدم',
        icon: 'fas fa-money-bill-wave',
      },
    ];

    systemsList.forEach(system => {
      this.systems.set(system.id, system);
    });
  }

  /**
   * Get system by ID
   */
  getSystem(id) {
    return this.systems.get(id);
  }

  /**
   * Get all systems
   */
  getAllSystems() {
    return Array.from(this.systems.values());
  }

  /**
   * Initialize system instance
   */
  async initializeSystem(id, container) {
    const system = this.systems.get(id);
    if (!system) {
      console.error(`System ${id} not found`);
      return null;
    }

    if (!this.instances.has(id)) {
      try {
        const loader = systemModuleLoaders[id];
        if (!loader) {
          console.error(`Dynamic import loader not found for ${id}`);
          return null;
        }
        const module = await loader();
        const SystemClass = module.default || module;
        if (!SystemClass) {
          console.error(`System class not found for ${id}`);
          return null;
        }
        const instance = new SystemClass(container);
        this.instances.set(id, instance);
      } catch (error) {
        console.error(`Error initializing system ${id}:`, error);
        return null;
      }
    }

    return this.instances.get(id);
  }

  /**
   * Get system instance
   */
  getInstance(id) {
    return this.instances.get(id);
  }

  /**
   * Get navigation items for all systems
   */
  getNavigationItems() {
    return this.getAllSystems().map(system => ({
      id: system.id,
      name: system.name,
      icon: system.icon,
      section: system.id,
    }));
  }

  /**
   * Load system CSS
   */
  loadSystemCSS(id) {
    const system = this.systems.get(id);
    if (!system) return;

    const linkId = `css-${id}`;
    if (document.getElementById(linkId)) return; // Already loaded

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';

    // Fix CSS path: remove 'advanced-' prefix if present
    const cssName = id.replace(/^advanced-/, '');
    link.href = `styles/advanced-${cssName}.css`;

    // Handle error if CSS file doesn't exist
    link.onerror = () => {
      console.warn(`CSS file not found: ${link.href}`);
      link.remove();
    };

    document.head.appendChild(link);
  }

  /**
   * Load all systems CSS
   */
  loadAllSystemsCSS() {
    this.getAllSystems().forEach(system => {
      this.loadSystemCSS(system.id);
    });
  }
}

// Export singleton instance
const systemsRegistry = new SystemsRegistry();
export default systemsRegistry;
