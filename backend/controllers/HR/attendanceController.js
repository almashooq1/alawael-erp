/* eslint-disable no-unused-vars */
// HR Attendance Controller
const Attendance = require('../../models/HR/Attendance');

// Create new attendance record
exports.createAttendance = async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    await attendance.save();
    res.status(201).json(attendance);
  } catch (err) {
    res.status(400).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Get all attendance records
exports.getAttendances = async (req, res) => {
  try {
    const records = await Attendance.find();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Get attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Update attendance
exports.updateAttendance = async (req, res) => {
  try {
    const { employee, date, status, checkIn, checkOut, notes } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { employee, date, status, checkIn, checkOut, notes },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: 'حدث خطأ في الخادم' });
  }
};

// Delete attendance
exports.deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};
