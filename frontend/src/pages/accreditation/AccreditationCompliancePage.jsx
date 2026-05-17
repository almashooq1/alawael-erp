/**
 * AccreditationCompliancePage — الاعتماد والامتثال
 *
 * Phase 30 — يجمع أربعة مجالات متكاملة:
 *   0 — إدارة الاعتماد المؤسسي   (accreditationManagerAPI)
 *   1 — متابعة التفتيش والزيارات  (inspectionTrackerAPI)
 *   2 — الامتثال للمعايير         (standardsComplianceAPI)
 *   3 — إدارة التراخيص            (licensureManagerAPI)
 */

import React from 'react';
import {
  VerifiedUser as AccreditIcon,
  ManageSearch as InspectIcon,
  CheckCircle as StandardsIcon,
  Gavel as LicensureIcon,
} from '@mui/icons-material';
import {
  accreditationManagerAPI,
  inspectionTrackerAPI,
  standardsComplianceAPI,
  licensureManagerAPI,
} from '../../services/ddd';
import GenericDomainTabPage from '../../components/ddd/GenericDomainTabPage';

const TABS = [
  {
    key: 'accreditation',
    label: 'الاعتماد المؤسسي',
    icon: <AccreditIcon fontSize="small" />,
    color: '#7c3aed',
    api: accreditationManagerAPI,
    createTitle: 'ملف اعتماد جديد',
    emptyText: 'لا توجد ملفات اعتماد',
    columns: [
      { key: 'title', label: 'اسم الاعتماد' },
      { key: 'accreditingBody', label: 'الجهة المانحة' },
      { key: 'status', label: 'الحالة' },
      { key: 'expiryDate', label: 'تاريخ الانتهاء', date: true },
    ],
    fields: [
      { key: 'title', label: 'اسم الاعتماد', required: true },
      { key: 'accreditingBody', label: 'الجهة المانحة', required: true },
      { key: 'accreditationNumber', label: 'رقم الاعتماد' },
      { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
      { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
      {
        key: 'status',
        label: 'الحالة',
        type: 'select',
        options: ['active', 'pending', 'expired', 'suspended'],
      },
      { key: 'notes', label: 'ملاحظات', multiline: true },
    ],
  },
  {
    key: 'inspection',
    label: 'التفتيش والزيارات',
    icon: <InspectIcon fontSize="small" />,
    color: '#ea580c',
    api: inspectionTrackerAPI,
    createTitle: 'تسجيل زيارة تفتيش',
    emptyText: 'لا توجد زيارات تفتيش مسجلة',
    columns: [
      { key: 'title', label: 'موضوع الزيارة' },
      { key: 'inspectorName', label: 'المفتش / الجهة' },
      { key: 'visitDate', label: 'تاريخ الزيارة', date: true },
      { key: 'outcome', label: 'النتيجة' },
    ],
    fields: [
      { key: 'title', label: 'موضوع الزيارة', required: true },
      { key: 'inspectorName', label: 'اسم المفتش أو الجهة', required: true },
      { key: 'visitDate', label: 'تاريخ الزيارة', type: 'date' },
      {
        key: 'outcome',
        label: 'النتيجة',
        type: 'select',
        options: ['pass', 'fail', 'conditional', 'pending'],
      },
      { key: 'findings', label: 'المشاهدات والملاحظات', multiline: true },
      { key: 'correctiveActions', label: 'الإجراءات التصحيحية', multiline: true },
    ],
  },
  {
    key: 'standards',
    label: 'الامتثال للمعايير',
    icon: <StandardsIcon fontSize="small" />,
    color: '#2563eb',
    api: standardsComplianceAPI,
    createTitle: 'متطلب امتثال جديد',
    emptyText: 'لا توجد متطلبات امتثال',
    columns: [
      { key: 'title', label: 'المعيار / المتطلب' },
      { key: 'category', label: 'الفئة' },
      { key: 'complianceLevel', label: 'مستوى الامتثال' },
      { key: 'reviewDate', label: 'تاريخ المراجعة', date: true },
    ],
    fields: [
      { key: 'title', label: 'اسم المعيار أو المتطلب', required: true },
      { key: 'category', label: 'الفئة (جودة / سلامة / حماية...)', required: true },
      { key: 'description', label: 'الوصف التفصيلي', multiline: true },
      {
        key: 'complianceLevel',
        label: 'مستوى الامتثال',
        type: 'select',
        options: ['full', 'partial', 'non_compliant', 'not_applicable'],
      },
      { key: 'reviewDate', label: 'تاريخ المراجعة', type: 'date' },
      { key: 'responsiblePerson', label: 'الشخص المسؤول' },
    ],
  },
  {
    key: 'licensure',
    label: 'إدارة التراخيص',
    icon: <LicensureIcon fontSize="small" />,
    color: '#059669',
    api: licensureManagerAPI,
    createTitle: 'ترخيص جديد',
    emptyText: 'لا توجد تراخيص مسجلة',
    columns: [
      { key: 'title', label: 'اسم الترخيص' },
      { key: 'issuingAuthority', label: 'الجهة المصدِرة' },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'expiryDate', label: 'تاريخ الانتهاء', date: true },
    ],
    fields: [
      { key: 'title', label: 'اسم الترخيص', required: true },
      { key: 'issuingAuthority', label: 'الجهة المصدِرة', required: true },
      { key: 'licenseNumber', label: 'رقم الترخيص' },
      { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
      { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
      { key: 'scope', label: 'نطاق الترخيص', multiline: true },
      {
        key: 'status',
        label: 'الحالة',
        type: 'select',
        options: ['active', 'expired', 'pending_renewal', 'suspended'],
      },
    ],
  },
];

export default function AccreditationCompliancePage() {
  return (
    <GenericDomainTabPage
      title="الاعتماد والامتثال"
      description="إدارة ملفات الاعتماد المؤسسي، زيارات التفتيش، متطلبات الامتثال، والتراخيص"
      headerIcon={<AccreditIcon color="primary" />}
      tabs={TABS}
    />
  );
}
