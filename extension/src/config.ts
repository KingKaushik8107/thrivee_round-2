/**
 * Extension environment configuration module.
 * 
 * Supports both Local Development and Production Vercel environments.
 * Sensitive API keys, database credentials, and secrets MUST NEVER be placed here.
 */

// Production Vercel Deployment URLs
export const PRODUCTION_API_URL = 'https://phisdetect-tau.vercel.app/api';
export const PRODUCTION_SOC_URL = 'https://phisdetect-tau.vercel.app';

// Local Development Fallback URLs
export const DEVELOPMENT_API_URL = 'http://localhost:8000/api';
export const DEVELOPMENT_SOC_URL = 'http://localhost:5173';

const isProduction =
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.MODE === 'production' || Boolean(import.meta.env?.PROD));

// Resolved Base URLs
export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_THRIVE_API_URL) ||
  (isProduction ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);

export const SOC_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_THRIVE_SOC_URL) ||
  (isProduction ? PRODUCTION_SOC_URL : DEVELOPMENT_SOC_URL);
