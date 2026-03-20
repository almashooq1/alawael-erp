'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════
   التخطيطات — Schemas
   ═══════════════════════════════════════════════════════════════ */

// ── المنهج  Curriculum ──────────────────────────────────────────
const curriculumSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    gradeLevel: { type: String, required: true },
    subject: { type: String, required: true },
    semester: { type: String, enum: ['first', 'second', 'summer'], required: true },
    academicYear: { type: String, required: true },
    description: String,
    objectives: [String],
    units: [
      {
        unitNo: Number,
        titleAr: String,
        titleEn: String,
        lessons: [
          {
            lessonNo: Number,
            titleAr: String,
            titleEn: String,
            duration: { type: Number, default: 45 },
            objectives: [String],
            resources: [String],
            activities: [String],
          },
        ],
        weekStart: Number,
        weekEnd: Number,
      },
    ],
    totalHours: Number,
    textbook: { title: String, publisher: String, isbn: String },
    approvedBy: { userId: String, name: String, date: Date },
    status: { type: String, enum: ['draft', 'review', 'approved', 'active', 'archived'], default: 'draft' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

curriculumSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await this.constructor.countDocuments();
    this.code = `CUR-${this.academicYear}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ── الجدول الدراسي  Timetable ──────────────────────────────────
const timetableSchema = new mongoose.Schema(
  {
    academicYear: { type: String, required: true },
    semester: { type: String, enum: ['first', 'second', 'summer'], required: true },
    classId: { type: String, required: true },
    className: String,
    gradeLevel: String,
    slots: [
      {
        day: { type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] },
        periodNo: Number,
        startTime: String,
        endTime: String,
        subject: String,
        teacherId: String,
        teacherName: String,
        room: String,
        type: { type: String, enum: ['lecture', 'lab', 'activity', 'break', 'free'], default: 'lecture' },
      },
    ],
    effectiveFrom: Date,
    effectiveTo: Date,
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

timetableSchema.index({ academicYear: 1, semester: 1, classId: 1 }, { unique: true });

// ── السجل الأكاديمي  GradeBook ─────────────────────────────────
const gradeBookSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true },
    studentName: String,
    classId: String,
    subject: { type: String, required: true },
    academicYear: { type: String, required: true },
    semester: { type: String, enum: ['first', 'second', 'summer'] },
    teacherId: String,
    teacherName: String,
    assessments: [
      {
        type: { type: String, enum: ['quiz', 'homework', 'midterm', 'final', 'project', 'participation', 'practical', 'oral'] },
        title: String,
        maxScore: Number,
        score: Number,
        weight: { type: Number, default: 1 },
        date: Date,
        notes: String,
      },
    ],
    totalScore: Number,
    maxTotalScore: Number,
    percentage: Number,
    grade: String,
    gpa: Number,
    status: { type: String, enum: ['in-progress', 'completed', 'finalized'], default: 'in-progress' },
    remarks: String,
  },
  { timestamps: true },
);

gradeBookSchema.index({ studentId: 1, subject: 1, academicYear: 1, semester: 1 }, { unique: true });

gradeBookSchema.pre('save', function (next) {
  if (this.assessments?.length) {
    const totalWeight = this.assessments.reduce((s, a) => s + (a.weight || 1), 0);
    const weightedScore = this.assessments.reduce((s, a) => {
      if (a.score == null || a.maxScore == null) return s;
      return s + (a.score / a.maxScore) * (a.weight || 1);
    }, 0);
    this.percentage = totalWeight ? Math.round((weightedScore / totalWeight) * 100 * 10) / 10 : 0;
    this.totalScore = this.assessments.reduce((s, a) => s + (a.score || 0), 0);
    this.maxTotalScore = this.assessments.reduce((s, a) => s + (a.maxScore || 0), 0);
    // Saudi grading
    if (this.percentage >= 95) {
      this.grade = 'A+';
      this.gpa = 5.0;
    } else if (this.percentage >= 90) {
      this.grade = 'A';
      this.gpa = 4.75;
    } else if (this.percentage >= 85) {
      this.grade = 'B+';
      this.gpa = 4.5;
    } else if (this.percentage >= 80) {
      this.grade = 'B';
      this.gpa = 4.0;
    } else if (this.percentage >= 75) {
      this.grade = 'C+';
      this.gpa = 3.5;
    } else if (this.percentage >= 70) {
      this.grade = 'C';
      this.gpa = 3.0;
    } else if (this.percentage >= 65) {
      this.grade = 'D+';
      this.gpa = 2.5;
    } else if (this.percentage >= 60) {
      this.grade = 'D';
      this.gpa = 2.0;
    } else {
      this.grade = 'F';
      this.gpa = 1.0;
    }
  }
  next();
});

// ── الاختبار  Exam ──────────────────────────────────────────────
const examSchema = new mongoose.Schema(
  {
    examNo: { type: String, unique: true },
    titleAr: { type: String, required: true },
    titleEn: String,
    type: { type: String, enum: ['quiz', 'midterm', 'final', 'practical', 'oral', 'diagnostic'], required: true },
    subject: { type: String, required: true },
    gradeLevel: String,
    classIds: [String],
    academicYear: String,
    semester: String,
    date: Date,
    startTime: String,
    endTime: String,
    duration: { type: Number, default: 60 },
    room: String,
    maxScore: { type: Number, required: true },
    passingScore: Number,
    instructions: [String],
    supervisors: [{ userId: String, name: String }],
    status: { type: String, enum: ['draft', 'scheduled', 'in-progress', 'completed', 'graded', 'cancelled'], default: 'draft' },
    results: [
      {
        studentId: String,
        studentName: String,
        score: Number,
        status: { type: String, enum: ['present', 'absent', 'excused', 'cheating'] },
        notes: String,
        gradedBy: { userId: String, name: String },
      },
    ],
    statistics: {
      totalStudents: Number,
      present: Number,
      absent: Number,
      highest: Number,
      lowest: Number,
      average: Number,
      passRate: Number,
      median: Number,
    },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

examSchema.pre('save', async function (next) {
  if (!this.examNo) {
    const count = await this.constructor.countDocuments();
    this.examNo = `EXM-${String(count + 1).padStart(5, '0')}`;
  }
  // Compute statistics
  const present = this.results?.filter(r => r.status === 'present' && r.score != null) || [];
  if (present.length) {
    const scores = present.map(r => r.score).sort((a, b) => a - b);
    this.statistics = {
      totalStudents: this.results.length,
      present: present.length,
      absent: this.results.filter(r => r.status !== 'present').length,
      highest: scores[scores.length - 1],
      lowest: scores[0],
      average: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
      passRate: Math.round((scores.filter(s => s >= (this.passingScore || this.maxScore * 0.6)).length / scores.length) * 100 * 10) / 10,
      median: scores[Math.floor(scores.length / 2)],
    };
  }
  next();
});

// ── الحضور الأكاديمي  AcademicAttendance ────────────────────────
const academicAttendanceSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    classId: { type: String, required: true },
    subject: String,
    periodNo: Number,
    teacherId: String,
    teacherName: String,
    records: [
      {
        studentId: String,
        studentName: String,
        status: { type: String, enum: ['present', 'absent', 'late', 'excused', 'early-leave'] },
        minutesLate: Number,
        notes: String,
      },
    ],
    summary: { total: Number, present: Number, absent: Number, late: Number, excused: Number },
  },
  { timestamps: true },
);

academicAttendanceSchema.index({ date: 1, classId: 1, periodNo: 1 }, { unique: true });

academicAttendanceSchema.pre('save', function (next) {
  if (this.records?.length) {
    this.summary = {
      total: this.records.length,
      present: this.records.filter(r => r.status === 'present').length,
      absent: this.records.filter(r => r.status === 'absent').length,
      late: this.records.filter(r => r.status === 'late').length,
      excused: this.records.filter(r => r.status === 'excused').length,
    };
  }
  next();
});

const Curriculum = mongoose.model('Curriculum', curriculumSchema);
const Timetable = mongoose.model('Timetable', timetableSchema);
const GradeBook = mongoose.model('GradeBook', gradeBookSchema);
const Exam = mongoose.model('Exam', examSchema);
const AcademicAttendance = mongoose.model('AcademicAttendance', academicAttendanceSchema);

/* ═══════════════════════════════════════════════════════════════ */
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_academic';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3460;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const academicQueue = new Queue('academic-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════
   المسارات — Routes
   ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'academic-curriculum-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// ─── Curriculum ──────────────────────────────────────────────
app.post('/api/curricula', async (req, res) => {
  try {
    res.status(201).json(await Curriculum.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/curricula', async (req, res) => {
  const { gradeLevel, subject, academicYear, semester, status } = req.query;
  const q = {};
  if (gradeLevel) q.gradeLevel = gradeLevel;
  if (subject) q.subject = subject;
  if (academicYear) q.academicYear = academicYear;
  if (semester) q.semester = semester;
  if (status) q.status = status;
  res.json(await Curriculum.find(q).sort({ gradeLevel: 1, subject: 1 }));
});
app.get('/api/curricula/:id', async (req, res) => {
  const c = await Curriculum.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'المنهج غير موجود' });
  res.json(c);
});
app.put('/api/curricula/:id', async (req, res) => {
  res.json(await Curriculum.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// ─── Timetable ───────────────────────────────────────────────
app.post('/api/timetables', async (req, res) => {
  try {
    res.status(201).json(await Timetable.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/timetables', async (req, res) => {
  const { classId, academicYear, semester, teacherId } = req.query;
  const q = {};
  if (classId) q.classId = classId;
  if (academicYear) q.academicYear = academicYear;
  if (semester) q.semester = semester;
  if (teacherId) q['slots.teacherId'] = teacherId;
  res.json(await Timetable.find(q));
});
app.get('/api/timetables/teacher/:teacherId', async (req, res) => {
  const tts = await Timetable.find({ 'slots.teacherId': req.params.teacherId, status: 'active' });
  const schedule = [];
  tts.forEach(tt => {
    tt.slots
      .filter(s => s.teacherId === req.params.teacherId)
      .forEach(s => {
        schedule.push({
          day: s.day,
          periodNo: s.periodNo,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject,
          className: tt.className,
          room: s.room,
        });
      });
  });
  schedule.sort((a, b) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
    return days.indexOf(a.day) - days.indexOf(b.day) || a.periodNo - b.periodNo;
  });
  res.json(schedule);
});
app.put('/api/timetables/:id', async (req, res) => {
  res.json(await Timetable.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// ─── GradeBook ───────────────────────────────────────────────
app.post('/api/gradebook', async (req, res) => {
  try {
    res.status(201).json(await GradeBook.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/gradebook', async (req, res) => {
  const { studentId, classId, subject, academicYear, semester } = req.query;
  const q = {};
  if (studentId) q.studentId = studentId;
  if (classId) q.classId = classId;
  if (subject) q.subject = subject;
  if (academicYear) q.academicYear = academicYear;
  if (semester) q.semester = semester;
  res.json(await GradeBook.find(q).sort({ subject: 1 }));
});
app.post('/api/gradebook/:id/assessment', async (req, res) => {
  const gb = await GradeBook.findById(req.params.id);
  if (!gb) return res.status(404).json({ error: 'السجل غير موجود' });
  gb.assessments.push(req.body);
  await gb.save();
  res.json(gb);
});
app.get('/api/gradebook/student/:studentId/report', async (req, res) => {
  const { academicYear, semester } = req.query;
  const q = { studentId: req.params.studentId };
  if (academicYear) q.academicYear = academicYear;
  if (semester) q.semester = semester;
  const records = await GradeBook.find(q);
  const gpaTotal = records.reduce((s, r) => s + (r.gpa || 0), 0);
  res.json({ student: req.params.studentId, subjects: records, overallGPA: records.length ? (gpaTotal / records.length).toFixed(2) : 0 });
});

// ─── Exams ───────────────────────────────────────────────────
app.post('/api/exams', async (req, res) => {
  try {
    res.status(201).json(await Exam.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/exams', async (req, res) => {
  const { type, subject, gradeLevel, status, from, to } = req.query;
  const q = {};
  if (type) q.type = type;
  if (subject) q.subject = subject;
  if (gradeLevel) q.gradeLevel = gradeLevel;
  if (status) q.status = status;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  res.json(await Exam.find(q).sort({ date: -1 }));
});
app.post('/api/exams/:id/results', async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'الاختبار غير موجود' });
  exam.results.push(...(Array.isArray(req.body) ? req.body : [req.body]));
  exam.status = 'graded';
  await exam.save();
  res.json(exam);
});

// ─── Academic Attendance ─────────────────────────────────────
app.post('/api/academic-attendance', async (req, res) => {
  try {
    res.status(201).json(await AcademicAttendance.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/academic-attendance', async (req, res) => {
  const { classId, date, studentId, from, to } = req.query;
  const q = {};
  if (classId) q.classId = classId;
  if (date) q.date = new Date(date);
  if (studentId) q['records.studentId'] = studentId;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  res.json(await AcademicAttendance.find(q).sort({ date: -1 }));
});
app.get('/api/academic-attendance/student/:studentId/summary', async (req, res) => {
  const { from, to } = req.query;
  const match = { 'records.studentId': req.params.studentId };
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) match.date.$lte = new Date(to);
  }
  const data = await AcademicAttendance.find(match);
  let total = 0,
    present = 0,
    absent = 0,
    late = 0,
    excused = 0;
  data.forEach(d => {
    d.records
      .filter(r => r.studentId === req.params.studentId)
      .forEach(r => {
        total++;
        if (r.status === 'present') present++;
        else if (r.status === 'absent') absent++;
        else if (r.status === 'late') late++;
        else if (r.status === 'excused') excused++;
      });
  });
  res.json({
    studentId: req.params.studentId,
    total,
    present,
    absent,
    late,
    excused,
    attendanceRate: total ? ((present / total) * 100).toFixed(1) + '%' : 'N/A',
  });
});

// ─── Dashboard ───────────────────────────────────────────────
app.get('/api/academic/dashboard', async (_req, res) => {
  const cacheKey = 'academic:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [curricula, timetables, exams, gradeBooks] = await Promise.all([
    Curriculum.countDocuments({ status: 'active' }),
    Timetable.countDocuments({ status: 'active' }),
    Exam.countDocuments({ status: { $in: ['scheduled', 'in-progress'] } }),
    GradeBook.aggregate([{ $match: { status: 'in-progress' } }, { $group: { _id: null, avgGPA: { $avg: '$gpa' } } }]),
  ]);
  const result = {
    activeCurricula: curricula,
    activeTimetables: timetables,
    upcomingExams: exams,
    averageGPA: gradeBooks[0]?.avgGPA?.toFixed(2) || 0,
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

/* ═══════════════════════════════════════════════════════════════ */
mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — academic-curriculum');
    app.listen(PORT, () => console.log(`📚 Academic-Curriculum Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
