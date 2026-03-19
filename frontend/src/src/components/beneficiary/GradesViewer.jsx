/**
 * Stub/Placeholder Components for Beneficiary Portal
 * مكونات موجزة للبوابة - يمكن تطويرها لاحقاً
 */

// GradesViewer.jsx
export { default } from './GradesViewer';

import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';

const GradesViewerComponent = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader title={t('grades.title')} />
      <CardContent>
        <Typography>{t('grades.subtitle')}</Typography>
        {/* سيتم إضافة الحتويات */}
      </CardContent>
    </Card>
  );
};

export default GradesViewerComponent;
