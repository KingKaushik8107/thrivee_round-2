export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type Verdict = 'critical_phishing' | 'phishing' | 'suspicious' | 'legitimate';

export interface EmailAnalysisRequest {
  sender?: string;
  subject?: string;
  body?: string;
  urls?: string[];
  raw_content?: string;
}

export interface FeatureContribution {
  feature: string;
  weight: number;
  tfidf: number;
  contribution: number;
  direction: 'phishing' | 'legitimate' | 'neutral';
}

export interface XAIModelFeatures {
  decision_score: number;
  intercept: number;
  total_feature_contribution: number;
  reconstructed_decision_score?: number;
  top_phishing_features: FeatureContribution[];
  top_legitimate_features: FeatureContribution[];
  is_mathematically_valid: boolean;
  active_feature_count?: number;
}

export interface XAIForensicEvidence {
  source: string;
  category: string;
  title: string;
  severity: Severity | string;
  evidence: string;
  description?: string;
}

export interface XAIThreatIntelEvidence {
  ioc_type: string;
  ioc_value: string;
  status: string;
  provider?: string;
  reputation_score?: number | null;
  details?: Record<string, any>;
}

export interface UnifiedXAIResponse {
  model_features: XAIModelFeatures;
  forensic_evidence: XAIForensicEvidence[];
  threat_intelligence_evidence: XAIThreatIntelEvidence[];
  summary: string;
  confidence_notes: string[];
}

export interface Indicator {
  id?: string;
  source: string;
  category: string;
  indicator_code: string;
  title: string;
  severity: Severity;
  evidence: string;
  description?: string;
}

export interface IncidentAnalysis {
  incident_id: string;
  verdict: Verdict;
  risk_score: number;
  ml_probability: number;
  status?: string;
  attack_type: string;
  attack_type_confidence?: number;
  target_brand?: string | null;
  brand_similarity?: number | null;
  summary: string;
  explanation: string;
  indicators: Indicator[];
  xai?: UnifiedXAIResponse;
  created_at?: string;
}

export interface BackendHealthStatus {
  status: string;
  service: string;
  database?: string;
  threat_intel_configured?: boolean;
}
