/**
 * useWebVitals.js
 * Hook لتفعيل مراقبة Web Vitals
 */

import { useEffect } from 'react';
import { startWebVitalsReporting } from '../utils/webVitalsReporter';

export function useWebVitals() {
  useEffect(() => {
    startWebVitalsReporting();
  }, []);
}

export default useWebVitals;
