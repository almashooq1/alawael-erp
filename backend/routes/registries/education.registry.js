/**
 * Education System Sub-Registry — سجل مسارات النظام التعليمي
 * ═══════════════════════════════════════════════════════════════════
 * 8 modules: academic-years, subjects, teachers, classrooms,
 * curriculum, timetable, exams, gradebook
 *
 * Extracted from _registry.js for maintainability.
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Import all education route modules and mount them.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, logger }
 */
module.exports = function registerEducationRoutes(app, { safeRequire, dualMount, logger }) {
  // ── Imports ──────────────────────────────────────────────────────────────
  const academicYearRoutes = safeRequire('../routes/academicYear.routes');
  const subjectsRoutes = safeRequire('../routes/subjects.routes');
  const teachersRoutes = safeRequire('../routes/teachers.routes');
  const classroomsRoutes = safeRequire('../routes/classrooms.routes');
  const curriculumRoutes = safeRequire('../routes/curriculum.routes');
  const timetableRoutes = safeRequire('../routes/timetable.routes');
  const examsRoutes = safeRequire('../routes/exams.routes');
  const gradebookRoutes = safeRequire('../routes/gradebook.routes');

  // ── Mounts ───────────────────────────────────────────────────────────────
  dualMount(app, 'academic-years', academicYearRoutes);
  dualMount(app, 'subjects', subjectsRoutes);
  dualMount(app, 'teachers', teachersRoutes);
  dualMount(app, 'classrooms', classroomsRoutes);
  dualMount(app, 'curriculum', curriculumRoutes);
  dualMount(app, 'timetable', timetableRoutes);
  dualMount(app, 'exams', examsRoutes);
  dualMount(app, 'gradebook', gradebookRoutes);

  logger.info('Education system routes mounted (8 modules)');
};
