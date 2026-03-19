import apiClient from './api.client';

const LMS_PREFIX = '/lms';

const eLearningService = {
  // Courses
  getAllCourses: async params => {
    return apiClient.get(`${LMS_PREFIX}/courses`, { params });
  },

  getCourseById: async id => {
    return apiClient.get(`${LMS_PREFIX}/courses/${id}`);
  },

  createCourse: async data => {
    return apiClient.post(`${LMS_PREFIX}/courses`, data);
  },

  updateCourse: async (id, data) => {
    return apiClient.put(`${LMS_PREFIX}/courses/${id}`, data);
  },

  deleteCourse: async id => {
    return apiClient.delete(`${LMS_PREFIX}/courses/${id}`);
  },

  // Lessons
  addLesson: async (courseId, data) => {
    return apiClient.post(`${LMS_PREFIX}/courses/${courseId}/lessons`, data);
  },

  completeLesson: async (courseId, lessonId) => {
    return apiClient.post(`${LMS_PREFIX}/courses/${courseId}/lessons/${lessonId}/complete`);
  },

  // Enrollment
  enrollInCourse: async courseId => {
    return apiClient.post(`${LMS_PREFIX}/enroll/${courseId}`);
  },

  getMyCourses: async () => {
    return apiClient.get(`${LMS_PREFIX}/my-courses`);
  },
};

export default eLearningService;
