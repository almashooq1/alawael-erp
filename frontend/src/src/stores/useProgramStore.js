import { defineStore } from 'pinia';

export const useProgramStore = defineStore('program', {
  state: () => ({
    programs: [
      {
        id: 1,
        name: 'البرنامج المتقدم',
        description: 'برنامج تدريبي متقدم للمهنيين',
        duration: 120,
        sessions: 24,
        capacity: 30,
        enrolled: 18,
        level: 'advanced',
        status: 'active',
        startDate: '2025-01-01',
        instructors: ['محمد علي', 'فاطمة أحمد'],
        createdAt: new Date('2024-12-01'),
      },
      {
        id: 2,
        name: 'البرنامج الأساسي',
        description: 'برنامج تدريبي أساسي للمبتدئين',
        duration: 60,
        sessions: 12,
        capacity: 50,
        enrolled: 42,
        level: 'beginner',
        status: 'active',
        startDate: '2025-01-05',
        instructors: ['أحمد محمود'],
        createdAt: new Date('2024-11-15'),
      },
      {
        id: 3,
        name: 'برنامج متخصص',
        description: 'برنامج تدريب متخصص في مجال معين',
        duration: 80,
        sessions: 16,
        capacity: 25,
        enrolled: 22,
        level: 'intermediate',
        status: 'active',
        startDate: '2024-12-15',
        instructors: ['محمود علي', 'سارة خالد'],
        createdAt: new Date('2024-10-20'),
      },
    ],
    currentProgram: null,
    loading: false,
    error: null,
  }),

  getters: {
    // عدد البرامج النشطة
    activeProgramsCount: state => state.programs.filter(p => p.status === 'active').length,

    // إجمالي المسجلين
    totalEnrolled: state => state.programs.reduce((sum, p) => sum + p.enrolled, 0),

    // نسبة الملء
    averageFillRate: state => {
      if (state.programs.length === 0) return 0;
      const rates = state.programs.map(p => (p.enrolled / p.capacity) * 100);
      return Math.round(rates.reduce((a, b) => a + b) / rates.length);
    },

    // البرامج مرتبة
    sortedPrograms: state => [...state.programs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  },

  actions: {
    // إضافة برنامج جديد
    addProgram(programData) {
      this.loading = true;
      try {
        const newProgram = {
          id: Math.max(0, ...this.programs.map(p => p.id)) + 1,
          ...programData,
          createdAt: new Date(),
        };
        this.programs.push(newProgram);
        this.error = null;
        return newProgram;
      } catch (err) {
        this.error = 'فشل في إضافة البرنامج';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // تحديث البرنامج
    updateProgram(id, programData) {
      this.loading = true;
      try {
        const index = this.programs.findIndex(p => p.id === id);
        if (index === -1) throw new Error('البرنامج غير موجود');
        this.programs[index] = { ...this.programs[index], ...programData };
        this.error = null;
        return this.programs[index];
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // حذف برنامج
    deleteProgram(id) {
      this.loading = true;
      try {
        const index = this.programs.findIndex(p => p.id === id);
        if (index === -1) throw new Error('البرنامج غير موجود');
        const deleted = this.programs.splice(index, 1);
        this.error = null;
        return deleted[0];
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // الحصول على برنامج
    getProgram(id) {
      return this.programs.find(p => p.id === id);
    },

    // تعيين البرنامج الحالي
    setCurrentProgram(id) {
      this.currentProgram = this.getProgram(id);
    },
  },
});
