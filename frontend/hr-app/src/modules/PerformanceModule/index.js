import React, { useState } from 'react';
import PerformanceList from './PerformanceList';
import PerformanceForm from './PerformanceForm';

const PerformanceModule = () => {
  const [refresh, setRefresh] = useState(0);
  return (
    <div>
      <h2>Performance Evaluation</h2>
      <PerformanceForm onSuccess={() => setRefresh(r => r + 1)} />
      <PerformanceList key={refresh} onChanged={() => setRefresh(r => r + 1)} />
    </div>
  );
};

export default PerformanceModule;
