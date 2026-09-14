import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from backend.database.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class EmailRecord(Base):
    __tablename__ = "emails"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    raw_content = Column(Text, nullable=True)
    sender = Column(String(255), nullable=True)
    reply_to = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    receiver = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    date_header = Column(String(100), nullable=True)
    message_id = Column(String(255), nullable=True)
    body_text = Column(Text, nullable=True)
    body_html = Column(Text, nullable=True)
    headers = Column(JSON, nullable=True)
    urls = Column(JSON, nullable=True)
    attachments_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    analysis = relationship("AnalysisResult", back_populates="email", uselist=False, cascade="all, delete-orphan")
    campaign_memberships = relationship("CampaignMember", back_populates="email", cascade="all, delete-orphan")
    feedbacks = relationship("AnalystFeedbackRecord", back_populates="email", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email_id = Column(String(36), ForeignKey("emails.id"), nullable=False, unique=True)
    verdict = Column(String(50), nullable=False)  # critical_phishing, phishing, suspicious, legitimate
    risk_score = Column(Float, nullable=False)     # 0.0 - 100.0
    ml_probability = Column(Float, nullable=False) # 0.0 - 1.0
    status = Column(String(50), default="new")    # new, investigating, confirmed_threat, false_positive, resolved
    attack_type = Column(String(100), default="generic_phishing")
    attack_type_confidence = Column(Float, default=0.8)
    target_brand = Column(String(100), nullable=True)
    brand_similarity = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    email = relationship("EmailRecord", back_populates="analysis")
    indicators = relationship("IndicatorRecord", back_populates="analysis", cascade="all, delete-orphan")
    iocs = relationship("IOCRecord", back_populates="analysis", cascade="all, delete-orphan")
    risk_breakdown = relationship("RiskBreakdownRecord", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    threat_intel = relationship("ThreatIntelRecord", back_populates="analysis", cascade="all, delete-orphan")
    reports = relationship("IncidentReportRecord", back_populates="analysis", cascade="all, delete-orphan")
    analyst_notes = relationship("AnalystNoteRecord", back_populates="analysis", cascade="all, delete-orphan")
    timeline_events = relationship("IncidentTimelineEventRecord", back_populates="analysis", cascade="all, delete-orphan")



class IndicatorRecord(Base):
    __tablename__ = "indicators"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False)
    source = Column(String(100), nullable=False)   # sender_analysis, domain_analysis, brand_analysis, url_analysis, content_analysis, attachment_analysis
    category = Column(String(100), nullable=False)
    indicator_code = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    severity = Column(String(20), nullable=False)  # critical, high, medium, low
    evidence = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="indicators")


class IOCRecord(Base):
    __tablename__ = "iocs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False)
    ioc_type = Column(String(50), nullable=False)  # email, domain, url, ip, sha256
    value = Column(String(500), nullable=False)
    threat_intel_status = Column(String(50), default="unknown") # malicious, suspicious, clean, unknown
    reputation_score = Column(Float, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="iocs")


class RiskBreakdownRecord(Base):
    __tablename__ = "risk_breakdowns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False, unique=True)
    ml_score = Column(Float, default=0.0)
    ml_max = Column(Float, default=30.0)
    domain_brand_score = Column(Float, default=0.0)
    domain_brand_max = Column(Float, default=25.0)
    url_score = Column(Float, default=0.0)
    url_max = Column(Float, default=20.0)
    sender_score = Column(Float, default=0.0)
    sender_max = Column(Float, default=10.0)
    content_score = Column(Float, default=0.0)
    content_max = Column(Float, default=10.0)
    threat_intel_score = Column(Float, default=0.0)
    threat_intel_max = Column(Float, default=5.0)
    total_score = Column(Float, default=0.0)
    weights = Column(JSON, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="risk_breakdown")


class CampaignRecord(Base):
    __tablename__ = "campaigns"

    id = Column(String(50), primary_key=True)  # e.g. CAMP-2026-001
    name = Column(String(255), nullable=False)
    target_brand = Column(String(100), nullable=True)
    primary_attack_type = Column(String(100), default="generic_phishing")
    status = Column(String(50), default="active")  # active, mitigated, archived
    email_count = Column(Integer, default=1)
    recipient_count = Column(Integer, default=1)
    domain_count = Column(Integer, default=1)
    url_count = Column(Integer, default=1)
    shared_domains = Column(JSON, default=list)
    shared_urls = Column(JSON, default=list)
    shared_senders = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    first_seen = Column(DateTime, default=utc_now)
    last_seen = Column(DateTime, default=utc_now)

    # Relationships
    members = relationship("CampaignMember", back_populates="campaign", cascade="all, delete-orphan")


class CampaignMember(Base):
    __tablename__ = "campaign_members"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    campaign_id = Column(String(50), ForeignKey("campaigns.id"), nullable=False)
    email_id = Column(String(36), ForeignKey("emails.id"), nullable=False)
    similarity_score = Column(Float, default=1.0)
    assigned_at = Column(DateTime, default=utc_now)

    # Relationships
    campaign = relationship("CampaignRecord", back_populates="members")
    email = relationship("EmailRecord", back_populates="campaign_memberships")


class ThreatIntelRecord(Base):
    __tablename__ = "threat_intel_cache"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=True)
    ioc_value = Column(String(500), nullable=False)
    provider = Column(String(50), nullable=False)  # virustotal, urlhaus, abuseipdb
    status = Column(String(50), default="unknown") # malicious, suspicious, clean, unknown
    score = Column(Float, nullable=True)
    raw_response = Column(JSON, nullable=True)
    last_checked = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="threat_intel")


class IncidentReportRecord(Base):
    __tablename__ = "incident_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False)
    format = Column(String(20), nullable=False) # pdf, html, json
    report_data = Column(Text, nullable=True)
    pdf_bytes = Column(Text, nullable=True) # Base64 or stored ref
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="reports")


class AnalystFeedbackRecord(Base):
    __tablename__ = "analyst_feedback"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email_id = Column(String(36), ForeignKey("emails.id"), nullable=False)
    feedback = Column(String(50), nullable=False) # confirmed_phishing, false_positive, needs_review
    analyst_name = Column(String(100), default="SOC Analyst")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    email = relationship("EmailRecord", back_populates="feedbacks")


class AnalystNoteRecord(Base):
    __tablename__ = "analyst_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False)
    analyst_name = Column(String(100), default="SOC Analyst")
    note_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="analyst_notes")


class IncidentTimelineEventRecord(Base):
    __tablename__ = "incident_timeline"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analysis_results.id"), nullable=False)
    event_type = Column(String(50), nullable=False)  # created, ml_inference, forensic_rules, threat_intel, status_change, analyst_note, feedback, report_exported
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    actor = Column(String(100), default="System")
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    analysis = relationship("AnalysisResult", back_populates="timeline_events")

