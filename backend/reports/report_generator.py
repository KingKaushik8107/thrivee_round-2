import json
from datetime import datetime
from typing import Dict, Any

class ReportGenerator:
    @classmethod
    def generate_json_report(cls, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates a structured incident dossier JSON.
        """
        return {
            "report_metadata": {
                "report_id": f"REP-{incident_data.get('id', 'INCIDENT')[:8]}",
                "generated_at": datetime.utcnow().isoformat(),
                "generator": "PHAGEGUARD — AI-Powered Phishing Investigation & SOC Response Platform v1.0",
                "compliance_standard": "NIST SP 800-61 Rev. 2 / MITRE ATT&CK"
            },
            "incident": incident_data
        }

    @classmethod
    def generate_html_report(cls, incident: Dict[str, Any]) -> str:
        """
        Renders a self-contained, beautifully styled HTML incident report.
        """
        inc_id = incident.get("id", "N/A")
        verdict = (incident.get("verdict") or "UNKNOWN").replace("_", " ").upper()
        risk_score = incident.get("risk_score", 0)
        ml_prob = int(incident.get("ml_probability", 0) * 100)
        attack_type = (incident.get("attack_type") or "Generic Phishing").replace("_", " ").title()
        target_brand = incident.get("target_brand") or "None Detected"
        email_info = incident.get("email", {})
        indicators = incident.get("indicators", [])
        iocs = incident.get("iocs", {})
        breakdown = incident.get("breakdown", {})
        recommendations = incident.get("recommendations", [])
        summary = incident.get("summary") or incident.get("explanation", "")

        # Color mapping for verdict
        verdict_color = "#ef4444" if "CRITICAL" in verdict else ("#f97316" if "PHISHING" in verdict else ("#eab308" if "SUSPICIOUS" in verdict else "#10b981"))

        # Build indicators table rows
        ind_rows = []
        for ind in indicators:
            sev = ind.get("severity", "low").upper()
            sev_color = "#ef4444" if sev == "CRITICAL" else ("#f97316" if sev == "HIGH" else ("#eab308" if sev == "MEDIUM" else "#3b82f6"))
            ind_rows.append(f"""
            <tr>
                <td><span style="background:{sev_color}; color:#fff; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold;">{sev}</span></td>
                <td><strong>{ind.get('title', '')}</strong></td>
                <td><code style="background:#f1f5f9; padding:2px 4px; border-radius:3px; font-size:12px;">{ind.get('evidence', '')}</code></td>
                <td>{ind.get('description', '')}</td>
            </tr>
            """)
        ind_html = "".join(ind_rows) if ind_rows else "<tr><td colspan='4'>No adverse indicators fired.</td></tr>"

        # Build IOC rows
        ioc_items = []
        for cat, items in iocs.items():
            for item in items:
                ioc_items.append(f"<li><strong>{cat.upper()}:</strong> <code>{item.get('value')}</code> &mdash; <span style='color:#64748b;'>{item.get('threat_intel_status', 'unknown')}</span></li>")
        ioc_html = "".join(ioc_items) if ioc_items else "<li>No IOCs recorded.</li>"

        # Build recommendation items
        rec_items = []
        for r in recommendations:
            rec_items.append(f"<li><strong>{r.get('title')}:</strong> {r.get('action')}</li>")
        rec_html = "".join(rec_items) if rec_items else "<li>Follow standard mailbox monitoring procedures.</li>"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Phishing Incident Report - {inc_id}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b; margin: 0; padding: 30px; background: #f8fafc; }}
        .container {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }}
        .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }}
        .logo {{ font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }}
        .badge {{ display: inline-block; padding: 6px 14px; border-radius: 9999px; color: #fff; font-weight: 700; font-size: 14px; text-transform: uppercase; background: {verdict_color}; }}
        .grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; }}
        .card {{ background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; }}
        .card h4 {{ margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; }}
        .card p {{ margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }}
        th, td {{ text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f1f5f9; color: #475569; font-size: 12px; text-transform: uppercase; }}
        h3 {{ color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 10px; margin-top: 30px; margin-bottom: 15px; font-size: 16px; }}
        ul {{ padding-left: 20px; }}
        li {{ margin-bottom: 8px; font-size: 14px; }}
        @media print {{ body {{ background: #fff; padding: 0; }} .container {{ box-shadow: none; border: none; padding: 0; }} }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <div class="logo">🛡️ PHAGEGUARD — CYBERSECURITY INCIDENT DOSSIER</div>
                <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Incident ID: {inc_id} | Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</div>
            </div>
            <div>
                <span class="badge">{verdict}</span>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h4>Overall Risk Score</h4>
                <p style="font-size: 24px; color: {verdict_color};">{risk_score} / 100</p>
            </div>
            <div class="card">
                <h4>ML Phishing Probability</h4>
                <p style="font-size: 24px; color: #2563eb;">{ml_prob}%</p>
            </div>
            <div class="card">
                <h4>Targeted Brand</h4>
                <p>{target_brand}</p>
            </div>
            <div class="card">
                <h4>Primary Attack Objective</h4>
                <p>{attack_type}</p>
            </div>
        </div>

        <h3>Executive Threat Summary</h3>
        <p style="background:#f1f5f9; padding:15px; border-radius:6px; font-size:14px; line-height:1.6; color:#334155;">{summary}</p>

        <h3>Email Message Headers</h3>
        <table>
            <tr><th style="width: 140px;">Sender (From)</th><td>{email_info.get('sender', 'N/A')}</td></tr>
            <tr><th>Display Name</th><td>{email_info.get('display_name', 'N/A')}</td></tr>
            <tr><th>Reply-To</th><td>{email_info.get('reply_to', 'N/A')}</td></tr>
            <tr><th>Subject</th><td><strong>{email_info.get('subject', 'N/A')}</strong></td></tr>
            <tr><th>Message ID</th><td><code>{email_info.get('message_id', 'N/A')}</code></td></tr>
        </table>

        <h3>Forensic Security Indicators</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 90px;">Severity</th>
                    <th style="width: 220px;">Indicator</th>
                    <th>Detected Evidence</th>
                    <th>Security Context</th>
                </tr>
            </thead>
            <tbody>
                {ind_html}
            </tbody>
        </table>

        <h3>Extracted Indicators of Compromise (IOCs)</h3>
        <ul>
            {ioc_html}
        </ul>

        <h3>Recommended SOC Response Playbook</h3>
        <ul>
            {rec_html}
        </ul>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
            Generated automatically by PHAGEGUARD — AI-Powered Phishing Investigation & SOC Response Platform &bull; Confidential Incident Documentation &bull; For Authorized SOC Personnel Only
        </div>
    </div>
</body>
</html>
"""
