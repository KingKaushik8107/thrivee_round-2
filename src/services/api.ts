import axios from 'axios';
import type {
  IncidentAnalysis,
  CampaignSummary,
  CampaignDetail,
  DashboardStats,
  ModelMetrics,
  DemoScenario
} from '../types';

const getApiBaseUrl = (): string => {
  // 1. Explicit environment override
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    const port = window.location.port;
    const hostname = window.location.hostname;

    // 2. Localhost & LAN development (Vite running on dev port 5173 or 3000 -> FastAPI on port 8000)
    if (port === '5173' || port === '3000') {
      return `http://${hostname}:8000/api`;
    }

    // 3. Vercel & Production web servers (served on standard port 80/443 without port in URL) -> Same-origin relative /api
    if (!port || port === '80' || port === '443') {
      return '/api';
    }

    // 4. Default fallback with hostname
    return `http://${hostname}:8000/api`;
  }

  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const analyzeEmail = async (payload: {
  raw_content?: string;
  sender?: string;
  receiver?: string;
  subject?: string;
  body?: string;
  urls?: string[];
}): Promise<IncidentAnalysis> => {
  const response = await api.post<IncidentAnalysis>('/analyze', payload);
  return response.data;
};

export const uploadEmlFile = async (file: File): Promise<IncidentAnalysis> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<IncidentAnalysis>('/analyze/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getIncidents = async (params?: {
  limit?: number;
  offset?: number;
  verdict?: string;
  search?: string;
}): Promise<{ total: number; incidents: any[] }> => {
  const response = await api.get('/incidents', { params });
  return response.data;
};

export const getIncidentDetail = async (incidentId: string): Promise<IncidentAnalysis> => {
  const response = await api.get<IncidentAnalysis>(`/incidents/${incidentId}`);
  return response.data;
};

export const getIncidentIOCs = async (
  incidentId: string,
  format: 'json' | 'csv' = 'json'
): Promise<any> => {
  const response = await api.get(`/incidents/${incidentId}/iocs`, {
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json',
  });
  return response.data;
};

export const getIncidentReportUrl = (
  incidentId: string,
  format: 'html' | 'pdf' | 'json' = 'pdf'
): string => {
  return `${API_BASE_URL}/incidents/${incidentId}/report?format=${format}`;
};

export const submitAnalystFeedback = async (
  incidentId: string,
  feedback: 'confirmed_phishing' | 'false_positive' | 'needs_review',
  analystName: string = 'SOC Analyst',
  notes: string = ''
): Promise<any> => {
  const response = await api.post(`/incidents/${incidentId}/feedback`, {
    feedback,
    analyst_name: analystName,
    notes,
  });
  return response.data;
};

export const getCampaigns = async (): Promise<{ total: number; campaigns: CampaignSummary[] }> => {
  const response = await api.get('/campaigns');
  return response.data;
};

export const getCampaignDetail = async (campaignId: string): Promise<CampaignDetail> => {
  const response = await api.get<CampaignDetail>(`/campaigns/${campaignId}`);
  return response.data;
};

export const getModelMetrics = async (): Promise<ModelMetrics> => {
  const response = await api.get<ModelMetrics>('/model/metrics');
  return response.data;
};

export const explainWithAI = async (payload: {
  question: string;
  incident_id?: string;
  structured_findings?: any;
  history?: Array<{ role: string; content: string }>;
}): Promise<{ answer: string; grounded: boolean; engine: string }> => {
  const response = await api.post('/ai/explain', payload);
  return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<DashboardStats>('/dashboard/stats');
  return response.data;
};

export const getDemoSamples = async (): Promise<DemoScenario[]> => {
  const response = await api.get<DemoScenario[]>('/demo/samples');
  return response.data;
};

export const getHealth = async (): Promise<any> => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
