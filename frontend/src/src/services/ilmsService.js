// خدمات نظام إدارة التعلم الذكي والتفاعل مع API
// Intelligent Learning Management System Services

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/intelligent-lms';

// ================ إعدادات Axios ================

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// إضافة Token تلقائياً للطلبات
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// معالجة الأخطاء المركزية
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token منتهي الصلاحية
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ================ خدمات الدورات ================

export const coursesService = {
  // الحصول على جميع الدورات
  getAllCourses: async (filters = {}) => {
    try {
      const response = await apiClient.get('/courses', { params: filters });
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الدورات بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الدورات'
      };
    }
  },

  // الحصول على دورة معينة
  getCourseById: async (courseId) => {
    try {
      const response = await apiClient.get(`/courses/${courseId}`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الدورة'
      };
    }
  },

  // إنشاء دورة جديدة
  createCourse: async (courseData) => {
    try {
      const response = await apiClient.post('/courses', courseData);
      return {
        success: true,
        data: response.data,
        message: 'تم إنشاء الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في إنشاء الدورة'
      };
    }
  },

  // تحديث الدورة
  updateCourse: async (courseId, courseData) => {
    try {
      const response = await apiClient.put(`/courses/${courseId}`, courseData);
      return {
        success: true,
        data: response.data,
        message: 'تم تحديث الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحديث الدورة'
      };
    }
  },

  // حذف الدورة
  deleteCourse: async (courseId) => {
    try {
      const response = await apiClient.delete(`/courses/${courseId}`);
      return {
        success: true,
        data: response.data,
        message: 'تم حذف الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في حذف الدورة'
      };
    }
  },

  // البحث عن الدورات
  searchCourses: async (searchTerm) => {
    try {
      const response = await apiClient.get('/courses/search', {
        params: { q: searchTerm }
      });
      return {
        success: true,
        data: response.data,
        message: 'تم البحث بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل البحث'
      };
    }
  },

  // الحصول على الدورات المتقدمة بناءً على AI
  getRecommendedCourses: async (userId) => {
    try {
      const response = await apiClient.get(`/courses/recommended/${userId}`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الدورات الموصى بها بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الدورات الموصى بها'
      };
    }
  }
};

// ================ خدمات التسجيل ================

export const enrollmentsService = {
  // الحصول على تسجيلات الطالب
  getStudentEnrollments: async (studentId) => {
    try {
      const response = await apiClient.get(`/students/${studentId}/enrollments`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل التسجيلات بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل التسجيلات'
      };
    }
  },

  // التسجيل في دورة
  enrollInCourse: async (studentId, courseId) => {
    try {
      const response = await apiClient.post('/enrollments', {
        student_id: studentId,
        course_id: courseId
      });
      return {
        success: true,
        data: response.data,
        message: 'تم التسجيل في الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في التسجيل في الدورة'
      };
    }
  },

  // إلغاء التسجيل
  unenrollFromCourse: async (enrollmentId) => {
    try {
      const response = await apiClient.delete(`/enrollments/${enrollmentId}`);
      return {
        success: true,
        data: response.data,
        message: 'تم إلغاء التسجيل بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في إلغاء التسجيل'
      };
    }
  },

  // الحصول على تفاصيل التسجيل
  getEnrollmentDetails: async (enrollmentId) => {
    try {
      const response = await apiClient.get(`/enrollments/${enrollmentId}`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل التفاصيل بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل التفاصيل'
      };
    }
  },

  // تحديث حالة التسجيل
  updateEnrollmentStatus: async (enrollmentId, status) => {
    try {
      const response = await apiClient.put(`/enrollments/${enrollmentId}/status`, {
        status
      });
      return {
        success: true,
        data: response.data,
        message: 'تم تحديث الحالة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحديث الحالة'
      };
    }
  }
};

// ================ خدمات الدروس ================

export const lessonsService = {
  // الحصول على دروس الدورة
  getCourseLessons: async (courseId) => {
    try {
      const response = await apiClient.get(`/courses/${courseId}/lessons`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الدروس بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الدروس'
      };
    }
  },

  // الحصول على محتوى الدرس
  getLessonContent: async (lessonId) => {
    try {
      const response = await apiClient.get(`/lessons/${lessonId}/content`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل محتوى الدرس بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل محتوى الدرس'
      };
    }
  },

  // تحديد الدرس كمكتمل
  markLessonComplete: async (enrollmentId, lessonId) => {
    try {
      const response = await apiClient.post(
        `/enrollments/${enrollmentId}/lessons/${lessonId}/complete`
      );
      return {
        success: true,
        data: response.data,
        message: 'تم تحديد الدرس كمكتمل'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحديد الدرس كمكتمل'
      };
    }
  },

  // الحصول على موارد الدرس
  getLessonResources: async (lessonId) => {
    try {
      const response = await apiClient.get(`/lessons/${lessonId}/resources`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الموارد بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الموارد'
      };
    }
  }
};

// ================ خدمات الاختبارات ================

export const quizzesService = {
  // الحصول على اختبار الدرس
  getLessonQuiz: async (lessonId) => {
    try {
      const response = await apiClient.get(`/lessons/${lessonId}/quiz`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الاختبار بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الاختبار'
      };
    }
  },

  // تقديم إجابات الاختبار
  submitQuizAnswers: async (quizId, answers) => {
    try {
      const response = await apiClient.post(`/quizzes/${quizId}/submit`, {
        answers
      });
      return {
        success: true,
        data: response.data,
        message: 'تم تقديم الاختبار بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تقديم الاختبار'
      };
    }
  },

  // الحصول على نتائج الاختبار
  getQuizResults: async (quizId, attemptId) => {
    try {
      const response = await apiClient.get(`/quizzes/${quizId}/attempts/${attemptId}`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل النتائج بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل النتائج'
      };
    }
  },

  // إعادة محاولة الاختبار
  retakeQuiz: async (quizId) => {
    try {
      const response = await apiClient.post(`/quizzes/${quizId}/retake`);
      return {
        success: true,
        data: response.data,
        message: 'تم بدء محاولة جديدة'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في بدء محاولة جديدة'
      };
    }
  }
};

// ================ خدمات التحليلات ================

export const analyticsService = {
  // الحصول على تحليلات الطالب
  getStudentAnalytics: async (studentId) => {
    try {
      const response = await apiClient.get(`/students/${studentId}/analytics`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل التحليلات بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل التحليلات'
      };
    }
  },

  // الحصول على تحليلات الدورة
  getCourseAnalytics: async (courseId) => {
    try {
      const response = await apiClient.get(`/courses/${courseId}/analytics`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل تحليلات الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل تحليلات الدورة'
      };
    }
  },

  // الحصول على بيانات الأداء
  getPerformanceData: async (filterId, dateRange) => {
    try {
      const response = await apiClient.get('/analytics/performance', {
        params: { filterId, dateRange }
      });
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل بيانات الأداء بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل بيانات الأداء'
      };
    }
  },

  // الحصول على التقارير
  generateReport: async (reportType, parameters) => {
    try {
      const response = await apiClient.post('/analytics/reports', {
        type: reportType,
        parameters
      });
      return {
        success: true,
        data: response.data,
        message: 'تم إنشاء التقرير بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في إنشاء التقرير'
      };
    }
  }
};

// ================ خدمات التوصيات ================

export const recommendationsService = {
  // الحصول على التوصيات الذكية
  getRecommendations: async (studentId) => {
    try {
      const response = await apiClient.get(`/students/${studentId}/recommendations`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل التوصيات بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل التوصيات'
      };
    }
  },

  // قبول التوصية
  acceptRecommendation: async (recommendationId) => {
    try {
      const response = await apiClient.post(
        `/recommendations/${recommendationId}/accept`
      );
      return {
        success: true,
        data: response.data,
        message: 'تم قبول التوصية بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في قبول التوصية'
      };
    }
  },

  // رفض التوصية
  dismissRecommendation: async (recommendationId) => {
    try {
      const response = await apiClient.post(
        `/recommendations/${recommendationId}/dismiss`
      );
      return {
        success: true,
        data: response.data,
        message: 'تم رفض التوصية بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في رفض التوصية'
      };
    }
  }
};

// ================ خدمات التقدم ================

export const progressService = {
  // الحصول على تقدم الطالب
  getStudentProgress: async (studentId) => {
    try {
      const response = await apiClient.get(`/students/${studentId}/progress`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل التقدم بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل التقدم'
      };
    }
  },

  // الحصول على تقدم الدورة
  getCourseProgress: async (enrollmentId) => {
    try {
      const response = await apiClient.get(`/enrollments/${enrollmentId}/progress`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل تقدم الدورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل تقدم الدورة'
      };
    }
  },

  // تحديث التقدم
  updateProgress: async (enrollmentId, progressData) => {
    try {
      const response = await apiClient.put(
        `/enrollments/${enrollmentId}/progress`,
        progressData
      );
      return {
        success: true,
        data: response.data,
        message: 'تم تحديث التقدم بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحديث التقدم'
      };
    }
  }
};

// ================ خدمات الملف الشخصي ================

export const profileService = {
  // الحصول على الملف الشخصي
  getProfile: async (userId) => {
    try {
      const response = await apiClient.get(`/users/${userId}/profile`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الملف الشخصي بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الملف الشخصي'
      };
    }
  },

  // تحديث الملف الشخصي
  updateProfile: async (userId, profileData) => {
    try {
      const response = await apiClient.put(`/users/${userId}/profile`, profileData);
      return {
        success: true,
        data: response.data,
        message: 'تم تحديث الملف الشخصي بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحديث الملف الشخصي'
      };
    }
  },

  // تحميل صورة الملف الشخصي
  uploadAvatar: async (userId, avatarFile) => {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await apiClient.post(
        `/users/${userId}/profile/avatar`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الصورة بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الصورة'
      };
    }
  }
};

// ================ خدمات الإشعارات ================

export const notificationsService = {
  // الحصول على الإشعارات
  getNotifications: async (userId) => {
    try {
      const response = await apiClient.get(`/users/${userId}/notifications`);
      return {
        success: true,
        data: response.data,
        message: 'تم تحميل الإشعارات بنجاح'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحميل الإشعارات'
      };
    }
  },

  // تحديد الإشعار كمقروء
  markNotificationAsRead: async (notificationId) => {
    try {
      const response = await apiClient.put(
        `/notifications/${notificationId}/read`
      );
      return {
        success: true,
        data: response.data,
        message: 'تم تحديث حالة الإشعار'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'فشل في تحديث حالة الإشعار'
      };
    }
  }
};

// Export main service object
export default {
  apiClient,
  coursesService,
  enrollmentsService,
  lessonsService,
  quizzesService,
  analyticsService,
  recommendationsService,
  progressService,
  profileService,
  notificationsService
};
