import React, { useState } from 'react';
import LeaveList from './LeaveList';
import LeaveForm from './LeaveForm';

const LeaveModule = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h2>Leave Management</h2>
      <LeaveForm onSuccess={() => setRefresh(r => r + 1)} />
      <LeaveList key={refresh} onChanged={() => setRefresh(r => r + 1)} />
    </div>
  );
};

export default LeaveModule;
