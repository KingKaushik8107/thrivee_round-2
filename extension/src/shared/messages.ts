import type { EmailAnalysisRequest, IncidentAnalysis, BackendHealthStatus } from '../types';

export type ExtensionMessageType =
  | 'ANALYZE_EMAIL'
  | 'GET_STATUS'
  | 'HEALTH_CHECK'
  | 'EMAIL_DETECTED'
  | 'GET_ACTIVE_EMAIL'
  | 'GET_CONTENT_STATE'
  | 'PING';

export interface AnalyzeEmailMessage {
  type: 'ANALYZE_EMAIL';
  payload: EmailAnalysisRequest;
}

export interface EmailDetectedMessage {
  type: 'EMAIL_DETECTED';
  payload: EmailAnalysisRequest;
}

export interface GetStatusMessage {
  type: 'GET_STATUS';
}

export interface HealthCheckMessage {
  type: 'HEALTH_CHECK';
}

export interface GetActiveEmailMessage {
  type: 'GET_ACTIVE_EMAIL';
}

export interface GetContentStateMessage {
  type: 'GET_CONTENT_STATE';
}

export interface PingMessage {
  type: 'PING';
}

export type ExtensionMessage =
  | AnalyzeEmailMessage
  | EmailDetectedMessage
  | GetStatusMessage
  | HealthCheckMessage
  | GetActiveEmailMessage
  | GetContentStateMessage
  | PingMessage;

export interface ExtensionSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ExtensionErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ExtensionResponse<T> =
  | ExtensionSuccessResponse<T>
  | ExtensionErrorResponse;

export interface ContentStateData {
  isEmailOpen: boolean;
  emailData: EmailAnalysisRequest | null;
  currentAnalysis: IncidentAnalysis | null;
  status: string;
}

export type AnalyzeEmailResponse = ExtensionResponse<IncidentAnalysis>;
export type HealthCheckResponse = ExtensionResponse<BackendHealthStatus>;
export type ContentStateResponse = ExtensionResponse<ContentStateData>;

