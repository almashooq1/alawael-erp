import React, { useState } from 'react';
import PayrollList from './PayrollList';
import PayrollForm from './PayrollForm';

const PayrollModule = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h2>Payroll Management</h2>
      <PayrollForm onSuccess={() => setRefresh(r => r + 1)} />
      <PayrollList key={refresh} onChanged={() => setRefresh(r => r + 1)} />
    </div>
  );
};

export default PayrollModule;
