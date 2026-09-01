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

class AnalysisResponse(BaseModel):
    incident_id: str
    verdict: str
    risk_score: float
    ml_probability: float
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
