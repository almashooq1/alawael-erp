// AI Attendance Prediction Route
const express = require('express');
const router = express.Router();

// AIService: منطق التوقع الحقيقي
const AIService = require('../services/aiService');

// POST /api/ai/predict-absence
router.post('/predict-absence', async (req, res) => {
  try {
    const { studentId, absencesLast30Days, attendanceRate, behaviorScore, performanceScore } =
      req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId required' });

    // بناء بيانات اليوم (يمكن تطويرها لاحقاً)
    const dayData = {
      dayOfWeek: new Date().toLocaleString('en-US', { weekday: 'long' }),
      absencesLast30Days,
      attendanceRate,
      behaviorScore,
      performanceScore,
      // يمكن إضافة المزيد من الخصائص لاحقاً
    };

    // استدعاء منطق الذكاء الاصطناعي
    const aiResult = await AIService.predictAttendance(dayData);
    res.json({ studentId, ...aiResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
