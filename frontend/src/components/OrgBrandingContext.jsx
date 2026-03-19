import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import orgBrandingService from 'services/orgBrandingService';
import { getOrgBranding, setOrgBranding } from 'utils/storageService';

const OrgBrandingContext = createContext();

export const useOrgBranding = () => useContext(OrgBrandingContext);

const DEFAULT_BRANDING = {
  name: 'نظام مراكز الأوائل للرعاية النهارية',
  nameEn: 'Al-Awael Day Care Centers System',
  shortName: 'الأوائل',
  color: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#f093fb',
  logo: '/logo.svg',
  favicon: '',
  tagline: 'رعاية متميزة... مستقبل مشرق',
  fontFamily: 'Cairo',
  borderRadius: 8,
  sidebarStyle: 'default',
  darkMode: false,
  enableAnimations: true,
};

export const OrgBrandingProvider = ({ orgId, children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  // مزامنة تلقائية عند التحميل أو تغيير orgId
  useEffect(() => {
    let ignore = false;
    async function fetchBranding() {
      setLoading(true);
      try {
        const data = await orgBrandingService.fetch(orgId);
        if (!ignore && data) {
          const merged = { ...DEFAULT_BRANDING, ...data };
          setBranding(merged);
          setOrgBranding(merged);
        }
      } catch {
        // fallback: استخدم localStorage أو الافتراضي
        const cached = getOrgBranding();
        setBranding(cached?.name ? { ...DEFAULT_BRANDING, ...cached } : DEFAULT_BRANDING);
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
    return () => { ignore = true; };
  }, [orgId]);

  // تحديث الهوية المؤسسية
  const updateBranding = useCallback(async (newData) => {
    try {
      const merged = { ...branding, ...newData };
      setBranding(merged);
      setOrgBranding(merged);
      if (orgId) {
        await orgBrandingService.update(orgId, newData);
      }
      return true;
    } catch {
      return false;
    }
  }, [branding, orgId]);

  return (
    <OrgBrandingContext.Provider value={{ branding, loading, updateBranding, DEFAULT_BRANDING }}>
      {children}
    </OrgBrandingContext.Provider>
  );
};
