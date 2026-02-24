import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
    <h1 style={{ marginRight: '2rem' }}>HR Management</h1>
    <Link to="/dashboard">Dashboard</Link>
    <Link to="/employees">Employees</Link>
    <Link to="/attendance">Attendance</Link>
    <Link to="/leaves">Leaves</Link>
    <Link to="/payroll">Payroll</Link>
    <Link to="/performance">Performance</Link>
  </nav>
);

export default Navbar;
