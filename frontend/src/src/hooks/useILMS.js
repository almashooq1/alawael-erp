// Custom Hooks لنظام إدارة التعلم الذكي
// Intelligent Learning Management System Custom Hooks

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import {
  coursesService,
  enrollmentsService,
  lessonsService,
  quizzesService,
  analyticsService,
  recommendationsService,
  progressService,
  profileService,
  notificationsService
} from '../services/ilmsService';

// ================ سياق ILMS ================

export const ILMSContext = createContext();

export const ILMSProvider = ({ children, token, userId }) => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token && userId) {
      loadInitialData();
      const interval = setInterval(() => loadNotifications(), 30000); // كل 30 ثانية
      return () => clearInterval(interval);
    }
  }, [token, userId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const profileResult = await profileService.getProfile(userId);
      if (profileResult.success) {
        setUser(profileResult.data);
      }

      const notificationsResult = await notificationsService.getNotifications(userId);
      if (notificationsResult.success) {
        setNotifications(notificationsResult.data);
      }
    } catch (err) {
      setError('فشل في تحميل البيانات الأولية');
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    const result = await notificationsService.getNotifications(userId);
    if (result.success) {
      setNotifications(result.data);
    }
  };

  return (
    <ILMSContext.Provider
      value={{
        user,
        courses,
        enrollments,
        notifications,
        loading,
        error,
        token,
        userId,
        loadInitialData,
        setError,
        setLoading,
        setNotifications
      }}
    >
      {children}
    </ILMSContext.Provider>
  );
};

// ================ Hook للدورات ================

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCourses = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const result = await coursesService.getAllCourses(filters);
      if (result.success) {
        setCourses(result.data.courses || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('فشل في تحميل الدورات');
    } finally {
      setLoading(false);
    }
  }, []);

  const getCourseById = useCallback(async (courseId) => {
    try {
      setLoading(true);
      const result = await coursesService.getCourseById(courseId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل الدورة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCourse = useCallback(async (courseData) => {
    try {
      setLoading(true);
      const result = await coursesService.createCourse(courseData);
      if (result.success) {
        setCourses([...courses, result.data]);
        return { success: true, data: result.data };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في إنشاء الدورة');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [courses]);

  const searchCourses = useCallback(async (searchTerm) => {
    try {
      setLoading(true);
      const result = await coursesService.searchCourses(searchTerm);
      if (result.success) {
        setCourses(result.data.courses || []);
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل البحث');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecommendedCourses = useCallback(async (userId) => {
    try {
      setLoading(true);
      const result = await coursesService.getRecommendedCourses(userId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل الدورات الموصى بها');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  return {
    courses,
    loading,
    error,
    loadCourses,
    getCourseById,
    createCourse,
    searchCourses,
    getRecommendedCourses,
    clearError: () => setError(null)
  };
};

// ================ Hook للتسجيلات ================

export const useEnrollments = (studentId) => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const result = await enrollmentsService.getStudentEnrollments(studentId);
      if (result.success) {
        setEnrollments(result.data.enrollments || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('فشل في تحميل التسجيلات');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const enrollInCourse = useCallback(async (courseId) => {
    try {
      setLoading(true);
      const result = await enrollmentsService.enrollInCourse(studentId, courseId);
      if (result.success) {
        setEnrollments([...enrollments, result.data]);
        return { success: true, data: result.data };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في التسجيل');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [studentId, enrollments]);

  const unenrollFromCourse = useCallback(async (enrollmentId) => {
    try {
      setLoading(true);
      const result = await enrollmentsService.unenrollFromCourse(enrollmentId);
      if (result.success) {
        setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في إلغاء التسجيل');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [enrollments]);

  const getEnrollmentDetails = useCallback(async (enrollmentId) => {
    try {
      setLoading(true);
      const result = await enrollmentsService.getEnrollmentDetails(enrollmentId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل التفاصيل');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      loadEnrollments();
    }
  }, [studentId, loadEnrollments]);

  return {
    enrollments,
    loading,
    error,
    loadEnrollments,
    enrollInCourse,
    unenrollFromCourse,
    getEnrollmentDetails,
    clearError: () => setError(null)
  };
};

// ================ Hook للدروس ================

export const useLessons = (courseId) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadLessons = useCallback(async () => {
    try {
      setLoading(true);
      const result = await lessonsService.getCourseLessons(courseId);
      if (result.success) {
        setLessons(result.data.lessons || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('فشل في تحميل الدروس');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const getLessonContent = useCallback(async (lessonId) => {
    try {
      setLoading(true);
      const result = await lessonsService.getLessonContent(lessonId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل محتوى الدرس');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const markLessonComplete = useCallback(async (enrollmentId, lessonId) => {
    try {
      setLoading(true);
      const result = await lessonsService.markLessonComplete(enrollmentId, lessonId);
      if (result.success) {
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في تحديد الدرس كمكتمل');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (courseId) {
      loadLessons();
    }
  }, [courseId, loadLessons]);

  return {
    lessons,
    loading,
    error,
    loadLessons,
    getLessonContent,
    markLessonComplete,
    clearError: () => setError(null)
  };
};

// ================ Hook للاختبارات ================

export const useQuizzes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getLessonQuiz = useCallback(async (lessonId) => {
    try {
      setLoading(true);
      const result = await quizzesService.getLessonQuiz(lessonId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل الاختبار');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswers = useCallback(async (quizId, answers) => {
    try {
      setLoading(true);
      const result = await quizzesService.submitQuizAnswers(quizId, answers);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في تقديم الاختبار');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  const retakeQuiz = useCallback(async (quizId) => {
    try {
      setLoading(true);
      const result = await quizzesService.retakeQuiz(quizId);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في بدء محاولة جديدة');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getLessonQuiz,
    submitAnswers,
    retakeQuiz,
    clearError: () => setError(null)
  };
};

// ================ Hook للتحليلات ================

export const useAnalytics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStudentAnalytics = useCallback(async (studentId) => {
    try {
      setLoading(true);
      const result = await analyticsService.getStudentAnalytics(studentId);
      if (result.success) {
        setMetrics(result.data);
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل التحليلات');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCourseAnalytics = useCallback(async (courseId) => {
    try {
      setLoading(true);
      const result = await analyticsService.getCourseAnalytics(courseId);
      if (result.success) {
        setMetrics(result.data);
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل تحليلات الدورة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (reportType, parameters) => {
    try {
      setLoading(true);
      const result = await analyticsService.generateReport(reportType, parameters);
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في إنشاء التقرير');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metrics,
    loading,
    error,
    getStudentAnalytics,
    getCourseAnalytics,
    generateReport,
    clearError: () => setError(null)
  };
};

// ================ Hook للتوصيات ================

export const useRecommendations = (studentId) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const result = await recommendationsService.getRecommendations(studentId);
      if (result.success) {
        setRecommendations(result.data.recommendations || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('فشل في تحميل التوصيات');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const acceptRecommendation = useCallback(async (recommendationId) => {
    try {
      setLoading(true);
      const result = await recommendationsService.acceptRecommendation(recommendationId);
      if (result.success) {
        setRecommendations(recommendations.filter(r => r.id !== recommendationId));
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في قبول التوصية');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [recommendations]);

  const dismissRecommendation = useCallback(async (recommendationId) => {
    try {
      setLoading(true);
      const result = await recommendationsService.dismissRecommendation(recommendationId);
      if (result.success) {
        setRecommendations(recommendations.filter(r => r.id !== recommendationId));
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في رفض التوصية');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [recommendations]);

  useEffect(() => {
    if (studentId) {
      loadRecommendations();
    }
  }, [studentId, loadRecommendations]);

  return {
    recommendations,
    loading,
    error,
    loadRecommendations,
    acceptRecommendation,
    dismissRecommendation,
    clearError: () => setError(null)
  };
};

// ================ Hook للتقدم ================

export const useProgress = (studentId) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const result = await progressService.getStudentProgress(studentId);
      if (result.success) {
        setProgress(result.data);
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل التقدم');
      return null;
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const getCourseProgress = useCallback(async (enrollmentId) => {
    try {
      setLoading(true);
      const result = await progressService.getCourseProgress(enrollmentId);
      if (result.success) {
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل تقدم الدورة');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      loadProgress();
    }
  }, [studentId, loadProgress]);

  return {
    progress,
    loading,
    error,
    loadProgress,
    getCourseProgress,
    clearError: () => setError(null)
  };
};

// ================ Hook للملف الشخصي ================

export const useProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const result = await profileService.getProfile(userId);
      if (result.success) {
        setProfile(result.data);
        return result.data;
      } else {
        setError(result.message);
        return null;
      }
    } catch (err) {
      setError('فشل في تحميل الملف الشخصي');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      const result = await profileService.updateProfile(userId, profileData);
      if (result.success) {
        setProfile(result.data);
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في تحديث الملف الشخصي');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const uploadAvatar = useCallback(async (avatarFile) => {
    try {
      setLoading(true);
      const result = await profileService.uploadAvatar(userId, avatarFile);
      if (result.success) {
        setProfile(result.data);
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في تحميل الصورة');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, loadProfile]);

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
    uploadAvatar,
    clearError: () => setError(null)
  };
};

// ================ Hook للإشعارات ================

export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const result = await notificationsService.getNotifications(userId);
      if (result.success) {
        setNotifications(result.data.notifications || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('فشل في تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const result = await notificationsService.markNotificationAsRead(notificationId);
      if (result.success) {
        setNotifications(notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        ));
        return { success: true };
      } else {
        setError(result.message);
        return { success: false };
      }
    } catch (err) {
      setError('فشل في تحديث الإشعار');
      return { success: false };
    }
  }, [notifications]);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, loadNotifications]);

  return {
    notifications,
    loading,
    error,
    loadNotifications,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length,
    clearError: () => setError(null)
  };
};

export default {
  ILMSContext,
  ILMSProvider,
  useCourses,
  useEnrollments,
  useLessons,
  useQuizzes,
  useAnalytics,
  useRecommendations,
  useProgress,
  useProfile,
  useNotifications
};
