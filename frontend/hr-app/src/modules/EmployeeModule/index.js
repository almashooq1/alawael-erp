import React, { useState } from 'react';
import EmployeeList from './EmployeeList';
import EmployeeForm from './EmployeeForm';

const EmployeeModule = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h2>Employee Management</h2>
      <EmployeeForm onSuccess={() => setRefresh(r => r + 1)} />
      <EmployeeList key={refresh} onChanged={() => setRefresh(r => r + 1)} />
    </div>
  );
};

export default EmployeeModule;
