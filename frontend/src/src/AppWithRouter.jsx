// Phase 12 - Main App with Complete Router Integration
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import { FiBarChart2, FiSearch, FiCheckCircle, FiSettings, FiMenu, FiX, FiBell, FiUser } from 'react-icons/fi';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Validation from './pages/Validation';
import Admin from './pages/Admin';
import './App.css';
import { touchButtonStyle } from './common/touchStyles';

/**
 * Phase 12 Complete Application with Router
 * Full-stack ERP System Frontend
 */
function AppWithRouter() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h2>🚀 ERP System</h2>
            <button className="sidebar-toggle" onClick={closeSidebar} aria-label="Close sidebar" style={touchButtonStyle}>
              <FiX />
            </button>
          </div>

          <nav className="sidebar-nav">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <FiBarChart2 />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <FiSearch />
              <span>Search</span>
            </NavLink>
            <NavLink
              to="/validation"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <FiCheckCircle />
              <span>Validation</span>
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <FiSettings />
              <span>Admin</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <div className="system-status">
              <span className="status-dot"></span>
              <span>System Online</span>
            </div>
            <p className="version">Phase 12 • v1.0.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Top Header */}
          <header className="app-header">
            <button
              className="menu-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle menu"
              style={touchButtonStyle}
            >
              <FiMenu />
            </button>
            <h1>Welcome to ERP System</h1>
            <div className="header-actions">
              <button className="notification-btn" aria-label="Notifications" style={touchButtonStyle}>
                <FiBell />
              </button>
              <button className="profile-btn" aria-label="User profile" style={touchButtonStyle}>
                <FiUser />
              </button>
            </div>
          </header>

          {/* Page Content */}
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/search" element={<Search />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={
                <div className="not-found">
                  <h2>404 - Page Not Found</h2>
                  <p>The page you're looking for doesn't exist.</p>
                  <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
                </div>
              } />
            </Routes>
          </div>

          {/* Footer */}
          <footer className="app-footer">
            <p>&copy; 2025 ERP System. Phase 12 Frontend Integration. All rights reserved.</p>
            <div className="footer-links">
              <a href="#docs">Docs</a>
              <a href="#support">Support</a>
              <a href="#status">Status</a>
            </div>
          </footer>
        </main>

        {/* Overlay for Mobile */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={closeSidebar}
            aria-hidden="true"
          ></div>
        )}
      </div>
    </BrowserRouter>
  );
}

export default AppWithRouter;
