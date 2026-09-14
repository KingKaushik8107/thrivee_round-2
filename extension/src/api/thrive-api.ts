import type { EmailAnalysisRequest, IncidentAnalysis, BackendHealthStatus } from '../types';
import { API_BASE_URL } from '../config';

// Configurable API base URL (supports local dev and production Vercel)
export const DEFAULT_API_BASE = API_BASE_URL;

export class ThriveApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_API_BASE) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Checks backend connectivity and service health.
   */
  public async checkHealth(): Promise<BackendHealthStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP status ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Backend health check timed out (5s).');
      }
      throw new Error(`Failed to connect to THRIVE backend at ${this.baseUrl}: ${err.message || err}`);
    }
  }

  /**
   * Submits email data for real-time ML inference, XAI attribution, and forensic analysis.
   */
  public async analyzeEmail(request: EmailAnalysisRequest): Promise<IncidentAnalysis> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Sanitized payload matching backend AnalyzeEmailRequest schema
    const payload = {
      sender: request.sender || '',
      subject: request.subject || '',
      body: request.body || '',
      urls: request.urls || [],
      raw_content: request.raw_content || ''
    };

    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          errorDetail = errJson.detail || errJson.message || errorDetail;
        } catch {
          // Response was not JSON
        }
        throw new Error(`Analysis failed: ${errorDetail}`);
      }

      const result: IncidentAnalysis = await response.json();
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Analysis request timed out (15s).');
      }
      throw new Error(err.message || 'Network error occurred during email investigation.');
    }
  }
}

// Global singleton instance for extension
export const apiClient = new ThriveApiClient();
