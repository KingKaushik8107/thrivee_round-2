export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type Verdict = 'critical_phishing' | 'phishing' | 'suspicious' | 'legitimate';

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

export interface IOCItem {
  type: string;
  value: string;
  threat_intel_status: 'malicious' | 'suspicious' | 'clean' | 'unknown' | 'unavailable';
  reputation_score?: number;
  details?: Record<string, any>;
}

export interface IOCCollection {
  emails: IOCItem[];
  domains: IOCItem[];
  urls: IOCItem[];
  ips: IOCItem[];
  hashes: IOCItem[];
  message_ids?: IOCItem[];
}

export interface RiskCategoryBreakdown {
  score: number;
  max: number;
  percentage?: number;
}

export interface RiskBreakdown {
  ml: RiskCategoryBreakdown;
  domain_brand: RiskCategoryBreakdown;
  url: RiskCategoryBreakdown;
  sender: RiskCategoryBreakdown;
  content: RiskCategoryBreakdown;
  threat_intel: RiskCategoryBreakdown;
}

export interface EmailData {
  id?: string;
  sender?: string;
  display_name?: string;
  reply_to?: string;
  receiver?: string;
  subject?: string;
  date?: string;
  message_id?: string;
  body?: string;
  urls?: string[];
  attachments?: Array<{
    filename: string;
    extension: string;
    content_type: string;
    size_bytes?: number;
    sha256?: string;
  }>;
}

export interface ActionRecommendation {
  priority: Severity;
  category: string;
  title: string;
  action: string;
  status: string;
}

export interface AnalystFeedback {
  id: string;
  feedback: 'confirmed_phishing' | 'false_positive' | 'needs_review';
  analyst_name: string;
  notes?: string;
  created_at: string;
}

export interface IncidentAnalysis {
  id?: string;
  incident_id: string;
  verdict: Verdict;
  risk_score: number;
  ml_probability: number;
  attack_type: string;
  attack_type_confidence: number;
  target_brand?: string | null;
  brand_similarity?: number | null;
  summary: string;
  explanation: string;
  email: EmailData;
  indicators: Indicator[];
  iocs: IOCCollection;
  breakdown: RiskBreakdown;
  recommendations: ActionRecommendation[];
  campaign_id?: string | null;
  feedbacks?: AnalystFeedback[];
  created_at: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  category: string;
  sender: string;
  display_name?: string;
  reply_to?: string;
  subject: string;
  body: string;
  urls?: string[];
  attachments?: Array<{
    filename: string;
    extension: string;
    content_type: string;
    size_bytes?: number;
    sha256?: string;
  }>;
  expected_brand?: string | null;
  expected_attack?: string | null;
  expected_score?: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  target_brand?: string;
  primary_attack_type?: string;
  status: string;
  email_count: number;
  recipient_count: number;
  domain_count: number;
  url_count: number;
  shared_domains: string[];
  shared_urls: string[];
  first_seen: string;
  last_seen: string;
}

export interface CampaignDetail extends CampaignSummary {
  shared_senders?: string[];
  members: Array<{
    email_id: string;
    sender?: string;
    subject?: string;
    verdict: string;
    risk_score: number;
    similarity_score: number;
    created_at: string;
  }>;
  graph: {
    nodes: any[];
    edges: any[];
  };
}

export interface DashboardStats {
  total_analyzed: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  phishing_percentage: number;
  campaign_count: number;
  verdict_distribution: Record<string, number>;
  severity_distribution?: Record<string, number>;
  attack_type_distribution: Record<string, number>;
  top_brands: Array<{ brand: string; count: number }>;
  recent_incidents: Array<{
    id: string;
    sender?: string;
    subject?: string;
    verdict: Verdict;
    risk_score: number;
    attack_type?: string;
    target_brand?: string;
    created_at: string;
  }>;
}

export interface ModelMetrics {
  dataset_name: string;
  model_architecture: string;
  total_test_samples: number;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    roc_auc: number;
  };
  confusion_matrix: {
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
    true_positives: number;
    matrix: number[][];
  };
  classification_report: Record<string, any>;
  top_phishing_features: Array<{ feature: string; weight: number }>;
  top_benign_features: Array<{ feature: string; weight: number }>;
}
