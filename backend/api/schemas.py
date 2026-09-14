from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class AnalyzeEmailRequest(BaseModel):
    raw_content: Optional[str] = Field(default="", description="Raw email text, RFC 822 string, or informal pasted email")
    sender: Optional[str] = Field(default="", description="Sender email address")
    receiver: Optional[str] = Field(default="", description="Receiver email address")
    subject: Optional[str] = Field(default="", description="Email subject line")
    body: Optional[str] = Field(default="", description="Email body content")
    reply_to: Optional[str] = Field(default="", description="Reply-to header")
    urls: Optional[List[str]] = Field(default_factory=list, description="Explicit list of URLs")
    headers: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Header key-value dictionary")

class IndicatorDTO(BaseModel):
    id: Optional[str] = None
    source: str
    category: str
    indicator_code: str
    title: str
    severity: str
    evidence: str
    description: Optional[str] = None

class IOCItemDTO(BaseModel):
    type: str
    value: str
    threat_intel_status: str = "unknown"
    reputation_score: Optional[float] = None
    details: Optional[Dict[str, Any]] = None

class RiskBreakdownDTO(BaseModel):
    ml_score: float
    domain_brand_score: float
    url_score: float
    sender_score: float
    content_score: float
    threat_intel_score: float
    total_score: float
    weights: Dict[str, float]
    breakdown_details: Optional[Dict[str, Any]] = None

class FeatureContributionDTO(BaseModel):
    feature: str
    weight: float
    tfidf: float
    contribution: float
    direction: str

class TokenHighlightDTO(BaseModel):
    token: str
    contribution: float
    direction: str

class XAIModelFeaturesDTO(BaseModel):
    decision_score: float = 0.0
    intercept: float = 0.0
    total_feature_contribution: float = 0.0
    reconstructed_decision_score: Optional[float] = 0.0
    top_phishing_features: List[FeatureContributionDTO] = Field(default_factory=list)
    top_legitimate_features: List[FeatureContributionDTO] = Field(default_factory=list)
    is_mathematically_valid: bool = True
    active_feature_count: Optional[int] = 0
    token_highlights: Optional[List[TokenHighlightDTO]] = Field(default_factory=list)

class XAIForensicEvidenceDTO(BaseModel):
    source: str
    category: str
    title: str
    severity: str
    evidence: str
    description: Optional[str] = None

class XAIThreatIntelEvidenceDTO(BaseModel):
    ioc_type: str
    ioc_value: str
    status: str
    provider: Optional[str] = "threat_intel"
    reputation_score: Optional[float] = None
    details: Optional[Dict[str, Any]] = None

class UnifiedXAIResponseDTO(BaseModel):
    model_features: XAIModelFeaturesDTO = Field(default_factory=XAIModelFeaturesDTO)
    forensic_evidence: List[XAIForensicEvidenceDTO] = Field(default_factory=list)
    threat_intelligence_evidence: List[XAIThreatIntelEvidenceDTO] = Field(default_factory=list)
    summary: str = ""
    confidence_notes: List[str] = Field(default_factory=list)

class AnalystNoteDTO(BaseModel):
    id: str
    analysis_id: str
    analyst_name: str
    note_text: str
    created_at: str

class IncidentTimelineEventDTO(BaseModel):
    id: str
    analysis_id: str
    event_type: str
    title: str
    description: Optional[str] = None
    actor: str
    created_at: str

class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(new|investigating|confirmed_threat|false_positive|resolved)$", description="Incident workflow status")
    analyst_name: Optional[str] = Field(default="SOC Analyst", description="Analyst making the status change")
    reason: Optional[str] = Field(default="", description="Reason for status change")

class AnalystNoteCreate(BaseModel):
    note_text: str = Field(..., min_length=1, max_length=5000, description="Analyst note body")
    analyst_name: Optional[str] = Field(default="SOC Analyst", description="Author analyst name")

class AnalysisResponse(BaseModel):
    incident_id: str
    verdict: str
    risk_score: float
    ml_probability: float
    status: Optional[str] = "new"
    attack_type: str
    attack_type_confidence: float
    target_brand: Optional[str] = None
    brand_similarity: Optional[float] = None
    summary: str
    explanation: str
    email: Dict[str, Any]
    indicators: List[IndicatorDTO]
    iocs: Dict[str, List[IOCItemDTO]]
    breakdown: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    campaign_id: Optional[str] = None
    created_at: str
    xai: Optional[UnifiedXAIResponseDTO] = None
    notes: Optional[List[AnalystNoteDTO]] = Field(default_factory=list)
    timeline: Optional[List[IncidentTimelineEventDTO]] = Field(default_factory=list)


class AnalystFeedbackRequest(BaseModel):
    feedback: str = Field(..., description="'confirmed_phishing' | 'false_positive' | 'needs_review'")
    analyst_name: Optional[str] = Field(default="SOC Analyst", description="Name/badge of the analyst")
    notes: Optional[str] = Field(default="", description="Optional analyst notes")

class AIExplainRequest(BaseModel):
    incident_id: Optional[str] = None
    question: str
    structured_findings: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, str]]] = None

class DashboardStatsResponse(BaseModel):
    total_analyzed: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    phishing_percentage: float
    campaign_count: int
    verdict_distribution: Dict[str, int]
    attack_type_distribution: Dict[str, int]
    top_brands: List[Dict[str, Any]]
    recent_incidents: List[Dict[str, Any]]
