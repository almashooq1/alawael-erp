import React, { createContext, useContext, useEffect, useState } from 'react';
import orgBrandingService from '../services/orgBrandingService';

const OrgBrandingContext = createContext();

export const useOrgBranding = () => useContext(OrgBrandingContext);

export const OrgBrandingProvider = ({ orgId, children }) => {
  const [branding, setBranding] = useState({ name: '', color: '#667eea', logo: '' });
  const [loading, setLoading] = useState(true);

  // مزامنة تلقائية عند التحميل أو تغيير orgId
  useEffect(() => {
    let ignore = false;
    async function fetchBranding() {
      setLoading(true);
      try {
        const data = await orgBrandingService.fetch(orgId);
        if (!ignore && data) {
          setBranding({
            name: data.name || '',
            color: data.color || '#667eea',
            logo: data.logo || '',
          });
          // مزامنة مع localStorage
          localStorage.setItem('orgName', data.name || '');
          localStorage.setItem('orgColor', data.color || '#667eea');
          if (data.logo) localStorage.setItem('orgLogo', data.logo);
        }
      } catch {
        // fallback: استخدم localStorage
        setBranding({
          name: localStorage.getItem('orgName') || '',
          color: localStorage.getItem('orgColor') || '#667eea',
          logo: localStorage.getItem('orgLogo') || '',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchBranding();
    return () => { ignore = true; };
  }, [orgId]);

  return (
    <OrgBrandingContext.Provider value={{ branding, loading }}>
      {children}
    </OrgBrandingContext.Provider>
  );
};
