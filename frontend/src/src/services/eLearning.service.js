import axios from 'axios';

const API_BASE = '/api/lms';

const eLearningService = {
  // Courses
  getAllCourses: async params => {
    const response = await axios.get(`${API_BASE}/courses`, { params });
    return response.data;
  },

  getCourseById: async id => {
    const response = await axios.get(`${API_BASE}/courses/${id}`);
    return response.data;
  },

  createCourse: async data => {
    const response = await axios.post(`${API_BASE}/courses`, data);
    return response.data;
  },

  updateCourse: async (id, data) => {
    const response = await axios.put(`${API_BASE}/courses/${id}`, data);
    return response.data;
  },

  deleteCourse: async id => {
    const response = await axios.delete(`${API_BASE}/courses/${id}`);
    return response.data;
  },

  // Lessons
  addLesson: async (courseId, data) => {
    const response = await axios.post(`${API_BASE}/courses/${courseId}/lessons`, data);
    return response.data;
  },

  completeLesson: async (courseId, lessonId) => {
    const response = await axios.post(`${API_BASE}/courses/${courseId}/lessons/${lessonId}/complete`);
    return response.data;
  },

  // Enrollment
  enrollInCourse: async courseId => {
    const response = await axios.post(`${API_BASE}/courses/${courseId}/enroll`);
    return response.data;
  },

  getMyCourses: async () => {
    const response = await axios.get(`${API_BASE}/my-courses`);
    return response.data;
  },
};

export default eLearningService;
