import React from 'react';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard';
import { I18nProvider } from './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <I18nProvider>
      <Dashboard />
    </I18nProvider>
  </React.StrictMode>
);
