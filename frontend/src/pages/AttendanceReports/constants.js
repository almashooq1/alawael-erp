export const attendanceColumns = [
  { id: 'date', label: 'التاريخ', alwaysVisible: true },
  { id: 'time', label: 'الوقت' },
  { id: 'therapist', label: 'المعالج' },
  { id: 'status', label: 'الحالة', alwaysVisible: true },
  { id: 'notes', label: 'الملاحظات' },
];

export const defaultAttendanceCols = attendanceColumns
  .filter(c => c.alwaysVisible || c.id === 'time' || c.id === 'therapist')
  .map(c => c.id);

export const getStatusChipColor = status => {
  if (status === 'حاضر') return 'success';
  if (status === 'غياب') return 'error';
  if (status === 'متأخر') return 'warning';
  return 'info';
};
