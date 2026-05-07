/**
 * api/apiClient.js — canonical re-export of the shared Axios client.
 *
 * Several pages import `../../api/apiClient` (relative to pages/). This
 * module re-exports the singleton from `services/api.client` so both
 * import paths resolve to the same configured instance.
 *
 *   import apiClient from '../../api/apiClient';  // from pages/
 *   apiClient.get('/endpoint')                     // works identically
 */
export { default } from '../services/api.client';
