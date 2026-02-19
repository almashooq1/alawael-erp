import React from 'react';
import { Card, CardContent, CardHeader, Typography } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

export const ProgressMonitoring = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('progress.title')} /><CardContent><Typography>{t('progress.subtitle')}</Typography></CardContent></Card>);
};

export const FinancialManagement = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('financial.title')} /><CardContent><Typography>{t('financial.subtitle')}</Typography></CardContent></Card>);
};

export const PaymentProcessor = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('payments.title')} /><CardContent><Typography>{t('payments.subtitle')}</Typography></CardContent></Card>);
};

export const ReportViewer = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('reports.title')} /><CardContent><Typography>{t('reports.subtitle')}</Typography></CardContent></Card>);
};

export const AnalyticsDashboard = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('analytics.title')} /><CardContent><Typography>{t('analytics.subtitle')}</Typography></CardContent></Card>);
};

export const MessageCenter = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('messages.title')} /><CardContent><Typography>{t('messages.subtitle')}</Typography></CardContent></Card>);
};

export const NotificationHub = () => {
  const { t } = useTranslation();
  return (<Card><CardHeader title={t('notifications.title')} /><CardContent><Typography>{t('notifications.subtitle')}</Typography></CardContent></Card>);
};

export default ProgressMonitoring;
