import React, { useState } from 'react';
import AttendanceList from './AttendanceList';
import AttendanceForm from './AttendanceForm';

const AttendanceModule = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h2>Attendance Management</h2>
      <AttendanceForm onSuccess={() => setRefresh(r => r + 1)} />
      <AttendanceList key={refresh} onChanged={() => setRefresh(r => r + 1)} />
    </div>
  );
};

export default AttendanceModule;
