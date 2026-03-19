import { defineStore } from 'pinia';

export const useStudentStore = defineStore('student', {
  state: () => ({
    students: [
      {
        id: 1,
        name: 'أحمد محمود',
        email: 'ahmad@example.com',
        phone: '01234567890',
        program: 'البرنامج المتقدم',
        registrationDate: '2025-01-01',
        status: 'active',
        progress: 75,
        attendance: 92,
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 2,
        name: 'فاطمة أحمد',
        email: 'fatima@example.com',
        phone: '01234567891',
        program: 'البرنامج الأساسي',
        registrationDate: '2025-01-05',
        status: 'active',
        progress: 85,
        attendance: 98,
        createdAt: new Date('2025-01-05'),
      },
      {
        id: 3,
        name: 'محمد علي',
        email: 'mohammad@example.com',
        phone: '01234567892',
        program: 'برنامج متخصص',
        registrationDate: '2024-12-15',
        status: 'completed',
        progress: 100,
        attendance: 96,
        createdAt: new Date('2024-12-15'),
      },
    ],
    currentStudent: null,
    loading: false,
    error: null,
  }),

  getters: {
    // عدد الطلاب النشطين
    activeStudentsCount: state => state.students.filter(s => s.status === 'active').length,

    // عدد الطلاب المكملين
    completedStudentsCount: state => state.students.filter(s => s.status === 'completed').length,

    // متوسط التقدم
    averageProgress: state => {
      if (state.students.length === 0) return 0;
      const total = state.students.reduce((sum, s) => sum + s.progress, 0);
      return Math.round(total / state.students.length);
    },

    // متوسط الحضور
    averageAttendance: state => {
      if (state.students.length === 0) return 0;
      const total = state.students.reduce((sum, s) => sum + s.attendance, 0);
      return Math.round(total / state.students.length);
    },

    // الطلاب مرتبة
    sortedStudents: state => [...state.students].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  },

  actions: {
    // إضافة طالب جديد
    addStudent(studentData) {
      this.loading = true;
      try {
        const newStudent = {
          id: Math.max(0, ...this.students.map(s => s.id)) + 1,
          ...studentData,
          createdAt: new Date(),
        };
        this.students.push(newStudent);
        this.error = null;
        return newStudent;
      } catch (err) {
        this.error = 'فشل في إضافة الطالب';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // تحديث بيانات الطالب
    updateStudent(id, studentData) {
      this.loading = true;
      try {
        const index = this.students.findIndex(s => s.id === id);
        if (index === -1) {
          throw new Error('الطالب غير موجود');
        }
        this.students[index] = { ...this.students[index], ...studentData };
        this.error = null;
        return this.students[index];
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // حذف طالب
    deleteStudent(id) {
      this.loading = true;
      try {
        const index = this.students.findIndex(s => s.id === id);
        if (index === -1) {
          throw new Error('الطالب غير موجود');
        }
        const deleted = this.students.splice(index, 1);
        this.error = null;
        return deleted[0];
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // البحث عن الطلاب
    searchStudents(query) {
      if (!query.trim()) return this.students;
      const q = query.toLowerCase();
      return this.students.filter(s => s.name.includes(q) || s.email.includes(q) || s.phone.includes(q) || s.program.includes(q));
    },

    // تصفية الطلاب
    filterStudents(status) {
      if (!status) return this.students;
      return this.students.filter(s => s.status === status);
    },

    // الحصول على طالب محدد
    getStudent(id) {
      return this.students.find(s => s.id === id);
    },

    // تحميل البيانات (محاكاة API)
    async fetchStudents() {
      this.loading = true;
      try {
        // محاكاة تأخير الشبكة
        await new Promise(resolve => setTimeout(resolve, 500));
        this.error = null;
      } catch (err) {
        this.error = 'فشل في تحميل بيانات الطلاب';
      } finally {
        this.loading = false;
      }
    },

    // تعيين الطالب الحالي
    setCurrentStudent(id) {
      this.currentStudent = this.getStudent(id);
    },

    // مسح الطالب الحالي
    clearCurrentStudent() {
      this.currentStudent = null;
    },
  },
});
