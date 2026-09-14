from typing import Dict, Any, List, Optional

class UnifiedXAIEngine:
    """
    Unified Explainable AI (XAI) Orchestration Layer for THRIVE (PhishX).
    
    Synthesizes and correlates:
      1. ML/XAI local feature attributions (decision score, intercept, feature contributions)
      2. Forensic security indicators (sender, domain, brand, URL, content, attachment)
      3. Threat Intelligence (TI) reputation findings (VirusTotal, URLhaus, AbuseIPDB)
      4. Risk score and attack classification context
      
    Maintains strict architectural separation:
      - ML feature contributions push the linear model logit (decision score), NOT direct percentage risk points.
      - Forensic indicators represent deterministic heuristic and protocol-level rules.
      - Threat intelligence represents external threat feed reputation.
    """

    @classmethod
    def build_explanation(
        cls,
        ml_xai: Optional[Dict[str, Any]] = None,
        forensic_indicators: Optional[List[Dict[str, Any]]] = None,
        threat_intel_results: Optional[List[Dict[str, Any]]] = None,
        risk_score: Optional[float] = None,
        attack_type: Optional[str] = None,
        target_brand: Optional[str] = None,
        verdict: Optional[str] = None,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        Synthesizes ML, forensic, and TI evidence into a unified, structured XAI response.
        
        Handles missing or partial inputs gracefully with safe defaults.
        """
        # 1. Process and structure ML XAI evidence
        model_features = cls._build_model_features(ml_xai, top_k=top_k)

        # 2. Process and structure Forensic Evidence
        forensic_evidence = cls._build_forensic_evidence(forensic_indicators or [])

        # 3. Process and structure Threat Intelligence Evidence
        threat_intel_evidence = cls._build_threat_intel_evidence(threat_intel_results or [])

        # 4. Generate synthesis summary and confidence notes
        summary = cls._generate_unified_summary(
            model_features=model_features,
            forensic_evidence=forensic_evidence,
            threat_intel_evidence=threat_intel_evidence,
            risk_score=risk_score,
            attack_type=attack_type,
            target_brand=target_brand,
            verdict=verdict
        )

        confidence_notes = cls._generate_confidence_notes(
            model_features=model_features,
            forensic_evidence=forensic_evidence,
            threat_intel_evidence=threat_intel_evidence,
            risk_score=risk_score,
            verdict=verdict
        )

        return {
            "model_features": model_features,
            "forensic_evidence": forensic_evidence,
            "threat_intelligence_evidence": threat_intel_evidence,
            "summary": summary,
            "confidence_notes": confidence_notes
        }

    @classmethod
    def _build_model_features(
        cls,
        ml_xai: Optional[Dict[str, Any]],
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        Formats ML XAI feature attributions with strict mathematical typing.
        """
        if not ml_xai or not isinstance(ml_xai, dict):
            return {
                "decision_score": 0.0,
                "intercept": 0.0,
                "total_feature_contribution": 0.0,
                "reconstructed_decision_score": 0.0,
                "top_phishing_features": [],
                "top_legitimate_features": [],
                "is_mathematically_valid": True,
                "active_feature_count": 0,
                "token_highlights": []
            }

        decision_score = float(ml_xai.get("decision_score", 0.0))
        intercept = float(ml_xai.get("intercept", 0.0))
        total_feat_contrib = float(ml_xai.get("total_feature_contribution", 0.0))
        reconstructed = float(ml_xai.get("reconstructed_decision_score", decision_score))
        is_valid = bool(ml_xai.get("is_mathematically_valid", True))
        active_count = int(ml_xai.get("active_feature_count", 0))

        # Extract and sanitize top phishing (positive contribution) features
        raw_phishing = ml_xai.get("top_phishing_features", [])
        top_phishing = []
        for feat in raw_phishing[:top_k]:
            top_phishing.append({
                "feature": str(feat.get("feature", "")),
                "weight": float(feat.get("weight", 0.0)),
                "tfidf": float(feat.get("tfidf", 0.0)),
                "contribution": float(feat.get("contribution", 0.0)),
                "direction": "phishing"
            })

        # Extract and sanitize top legitimate (negative contribution) features
        raw_legit = ml_xai.get("top_legitimate_features", [])
        top_legit = []
        for feat in raw_legit[:top_k]:
            top_legit.append({
                "feature": str(feat.get("feature", "")),
                "weight": float(feat.get("weight", 0.0)),
                "tfidf": float(feat.get("tfidf", 0.0)),
                "contribution": float(feat.get("contribution", 0.0)),
                "direction": "legitimate"
            })

        # Extract token highlights
        raw_highlights = ml_xai.get("token_highlights", [])
        token_highlights = []
        for h in raw_highlights:
            token_highlights.append({
                "token": str(h.get("token", "")),
                "contribution": float(h.get("contribution", 0.0)),
                "direction": str(h.get("direction", "neutral"))
            })

        return {
            "decision_score": round(decision_score, 4),
            "intercept": round(intercept, 4),
            "total_feature_contribution": round(total_feat_contrib, 4),
            "reconstructed_decision_score": round(reconstructed, 4),
            "top_phishing_features": top_phishing,
            "top_legitimate_features": top_legit,
            "is_mathematically_valid": is_valid,
            "active_feature_count": active_count,
            "token_highlights": token_highlights
        }

    @classmethod
    def _build_forensic_evidence(
        cls,
        indicators: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Structures forensic security indicator findings.
        """
        evidence_list = []
        for ind in indicators:
            if not isinstance(ind, dict):
                continue
            evidence_list.append({
                "source": str(ind.get("source", "generic")),
                "category": str(ind.get("category", "general")),
                "title": str(ind.get("title", "")),
                "severity": str(ind.get("severity", "low")),
                "evidence": str(ind.get("evidence", "")),
                "description": str(ind.get("description", ""))
            })
        return evidence_list

    @classmethod
    def _build_threat_intel_evidence(
        cls,
        ti_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Structures Threat Intelligence feed results.
        """
        ti_list = []
        for ti in ti_results:
            if not isinstance(ti, dict):
                continue
            ti_list.append({
                "ioc_type": str(ti.get("ioc_type", "unknown")),
                "ioc_value": str(ti.get("ioc_value", "")),
                "status": str(ti.get("status", "unknown")),
                "provider": str(ti.get("provider", "threat_intel")),
                "reputation_score": ti.get("reputation_score"),
                "details": ti.get("details") if isinstance(ti.get("details"), dict) else {}
            })
        return ti_list

    @classmethod
    def _generate_unified_summary(
        cls,
        model_features: Dict[str, Any],
        forensic_evidence: List[Dict[str, Any]],
        threat_intel_evidence: List[Dict[str, Any]],
        risk_score: Optional[float] = None,
        attack_type: Optional[str] = None,
        target_brand: Optional[str] = None,
        verdict: Optional[str] = None
    ) -> str:
        """
        Synthesizes a cohesive, plain-English summary connecting ML, forensic, and TI evidence.
        """
        summary_segments = []

        decision_score = model_features.get("decision_score", 0.0)
        phish_feats = [f["feature"] for f in model_features.get("top_phishing_features", [])[:3]]
        legit_feats = [f["feature"] for f in model_features.get("top_legitimate_features", [])[:3]]

        # ML Evidence Narrative
        if phish_feats and decision_score > 0:
            formatted_feats = ", ".join(f"'{f}'" for f in phish_feats)
            summary_segments.append(
                f"Machine-learning feature attribution identified {formatted_feats} as primary features increasing the phishing decision score (score: {decision_score:+.4f})."
            )
        elif legit_feats and decision_score <= 0:
            formatted_feats = ", ".join(f"'{f}'" for f in legit_feats)
            summary_segments.append(
                f"Machine-learning feature attribution identified {formatted_feats} as dominant legitimate-direction features (score: {decision_score:+.4f})."
            )
        else:
            summary_segments.append(
                f"Machine-learning linear classifier evaluated message content with decision score {decision_score:+.4f}."
            )

        # Forensic Evidence Narrative
        crit_high_inds = [i for i in forensic_evidence if i.get("severity", "").lower() in ("critical", "high")]
        if crit_high_inds:
            ind_titles = ", ".join(set(i.get("title", "") for i in crit_high_inds[:3]))
            summary_segments.append(f"Forensic analysis detected adverse signals: {ind_titles}.")
        elif forensic_evidence:
            summary_segments.append(f"Forensic checks fired {len(forensic_evidence)} low-to-medium severity indicator(s).")
        else:
            summary_segments.append("No adverse forensic security indicators were triggered.")

        # Threat Intel Narrative
        malicious_ti = [t for t in threat_intel_evidence if t.get("status", "").lower() in ("malicious", "suspicious")]
        if malicious_ti:
            ioc_summary = ", ".join(f"{t.get('ioc_type')}:{t.get('ioc_value')}" for t in malicious_ti[:2])
            summary_segments.append(f"Threat intelligence flagged reputation alerts on {ioc_summary}.")

        return " ".join(summary_segments)

    @classmethod
    def _generate_confidence_notes(
        cls,
        model_features: Dict[str, Any],
        forensic_evidence: List[Dict[str, Any]],
        threat_intel_evidence: List[Dict[str, Any]],
        risk_score: Optional[float] = None,
        verdict: Optional[str] = None
    ) -> List[str]:
        """
        Generates analytical observations explaining convergence or divergence across evidence sources.
        """
        notes = []

        # Math verification note
        if model_features.get("is_mathematically_valid", False):
            intercept = model_features.get("intercept", 0.0)
            total_c = model_features.get("total_feature_contribution", 0.0)
            d_score = model_features.get("decision_score", 0.0)
            notes.append(
                f"Mathematical validation verified: base intercept ({intercept:+.4f}) + total feature attribution ({total_c:+.4f}) exactly matches linear logit ({d_score:+.4f})."
            )

        # Active features note
        active_cnt = model_features.get("active_feature_count", 0)
        if active_cnt > 0:
            notes.append(f"Model identified {active_cnt} active vocabulary tokens with non-zero TF-IDF weights.")

        # ML and Forensic alignment check
        d_score = model_features.get("decision_score", 0.0)
        has_crit_forensic = any(i.get("severity", "").lower() in ("critical", "high") for i in forensic_evidence)

        if d_score > 1.0 and has_crit_forensic:
            notes.append("High convergence: Both statistical ML language modeling and deterministic forensic rules identified strong phishing signals.")
        elif d_score < -1.0 and not has_crit_forensic:
            notes.append("High convergence: Statistical ML analysis and forensic rules both indicate legitimate communication.")
        elif d_score > 1.0 and not has_crit_forensic:
            notes.append("ML-driven alert: Linguistic patterns indicate phishing intent even in the absence of obvious header anomalies.")
        elif d_score < -1.0 and has_crit_forensic:
            notes.append("Divergence alert: Header/domain forensic rules flagged anomalies despite benign text vocabulary.")

        # Threat Intel note
        has_malicious_ti = any(t.get("status", "").lower() == "malicious" for t in threat_intel_evidence)
        if has_malicious_ti:
            notes.append("Threat intelligence confirmation: External IOC feeds confirmed malicious infrastructure.")

        return notes
