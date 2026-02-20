/**
 * Traffic Accident Reports Page
 * صفحة تقارير الحوادث المرورية
 */

import React from 'react';
import TrafficAccidentReports from '../components/TrafficAccidentReports';
import './TrafficAccidentReports.scss';

const TrafficAccidentReportsPage = () => {
  return (
    <div className="traffic-accident-reports-page">
      <TrafficAccidentReports />
    </div>
  );
};

export default TrafficAccidentReportsPage;
