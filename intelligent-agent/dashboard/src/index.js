import React from 'react';
import ReactDOM from 'react-dom';
import Dashboard from './Dashboard';
import { I18nProvider } from './i18n';

ReactDOM.render(
  <React.StrictMode>
    <I18nProvider>
      <Dashboard />
    </I18nProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
