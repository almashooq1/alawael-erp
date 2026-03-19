/**
 * Government Integration & Compliance Routes
 * مسارات التكامل الحكومي والامتثال
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

// مُدد — حماية الأجور
const MudadDashboard = lazyWithRetry(
  () => import('../pages/mudad/MudadDashboard')
);

// طاقات — منصة التوظيف
const TaqatDashboard = lazyWithRetry(
  () => import('../pages/taqat/TaqatDashboard')
);

// هيئة رعاية ذوي الإعاقة + سباهي
const DisabilityAuthorityDashboard = lazyWithRetry(
  () => import('../pages/disabilityAuthority/DisabilityAuthorityDashboard')
);

// التصاريح العلاجية (الموافقات المسبقة)
const TreatmentAuthorizationDashboard = lazyWithRetry(
  () => import('../pages/treatmentAuthorization/TreatmentAuthorizationDashboard')
);

// استبيانات رضا الأسر
const FamilySatisfactionDashboard = lazyWithRetry(
  () => import('../pages/familySatisfaction/FamilySatisfactionDashboard')
);

// نظام نور — وزارة التعليم
const NoorDashboard = lazyWithRetry(
  () => import('../pages/noor/NoorDashboard')
);

// بوابة ولي الأمر
const GuardianPortalDashboard = lazyWithRetry(
  () => import('../pages/guardian/GuardianPortalDashboard')
);

// التأمينات الاجتماعية (GOSI)
const GosiDashboard = lazyWithRetry(
  () => import('../pages/gosi/GosiDashboard')
);

// منصة قوى — وزارة الموارد البشرية
const QiwaDashboard = lazyWithRetry(
  () => import('../pages/qiwa/QiwaDashboard')
);

// التدخل المبكر (0–3 سنوات)
const EarlyInterventionDashboard = lazyWithRetry(
  () => import('../pages/earlyIntervention/EarlyInterventionDashboard')
);

// متابعة ما بعد التأهيل
const PostRehabFollowupDashboard = lazyWithRetry(
  () => import('../pages/postRehab/PostRehabFollowupDashboard')
);

export default function GovernmentIntegrationRoutes() {
  return (
    <>
      {/* مُدد — حماية الأجور */}
      <Route path="mudad" element={<MudadDashboard />} />

      {/* طاقات — التوظيف لذوي الإعاقة */}
      <Route path="taqat" element={<TaqatDashboard />} />

      {/* هيئة رعاية ذوي الإعاقة ومعايير سباهي */}
      <Route path="disability-authority" element={<DisabilityAuthorityDashboard />} />
      <Route path="cbahi" element={<DisabilityAuthorityDashboard />} />

      {/* التصاريح العلاجية */}
      <Route path="treatment-authorization" element={<TreatmentAuthorizationDashboard />} />
      <Route path="insurance-preauth" element={<TreatmentAuthorizationDashboard />} />

      {/* استبيانات رضا الأسر */}
      <Route path="family-satisfaction" element={<FamilySatisfactionDashboard />} />
      <Route path="surveys" element={<FamilySatisfactionDashboard />} />

      {/* نظام نور — وزارة التعليم */}
      <Route path="noor" element={<NoorDashboard />} />
      <Route path="noor-education" element={<NoorDashboard />} />

      {/* بوابة ولي الأمر */}
      <Route path="guardian-portal" element={<GuardianPortalDashboard />} />

      {/* التأمينات الاجتماعية */}
      <Route path="gosi" element={<GosiDashboard />} />
      <Route path="social-insurance" element={<GosiDashboard />} />

      {/* منصة قوى */}
      <Route path="qiwa" element={<QiwaDashboard />} />
      <Route path="labor" element={<QiwaDashboard />} />

      {/* التدخل المبكر */}
      <Route path="early-intervention" element={<EarlyInterventionDashboard />} />

      {/* متابعة ما بعد التأهيل */}
      <Route path="post-rehab-followup" element={<PostRehabFollowupDashboard />} />
      <Route path="post-rehab" element={<PostRehabFollowupDashboard />} />
    </>
  );
}
