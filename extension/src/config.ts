/**
 * Extension environment configuration module.
 * 
 * Configured strictly for Local Development backend and SOC UI.
 * Sensitive API keys, database credentials, and secrets MUST NEVER be placed here.
 */

// Local Development Backend & SOC Console URLs
export const LOCAL_API_URL = 'http://localhost:8000/api';
export const LOCAL_SOC_URL = 'http://localhost:5173';

// Resolved Base URLs (defaults strictly to localhost:8000/api and localhost:5173)
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_THRIVE_API_URL) ||
  LOCAL_API_URL;

export const SOC_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_THRIVE_SOC_URL) ||
  LOCAL_SOC_URL;

