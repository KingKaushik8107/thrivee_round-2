import io
from datetime import datetime
from typing import Dict, Any

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

class PDFReportGenerator:
    @classmethod
    def generate_pdf_bytes(cls, incident: Dict[str, Any]) -> bytes:
        """
        Generates a professional multi-page PDF incident dossier using ReportLab.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold"
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748b"),
            fontName="Helvetica"
        )
        h2_style = ParagraphStyle(
            "Heading2Custom",
            parent=styles["Heading2"],
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0f172a"),
            fontName="Helvetica-Bold",
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            "BodyCustom",
            parent=styles["Normal"],
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#334155")
        )
        code_style = ParagraphStyle(
            "CodeCustom",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=9.5,
            fontName="Courier",
            textColor=colors.HexColor("#0f172a")
        )

        elements = []

        # 1. Header Banner
        inc_id = incident.get("id", "N/A")
        verdict = (incident.get("verdict") or "UNKNOWN").replace("_", " ").upper()
        risk_score = incident.get("risk_score", 0)
        ml_prob = int(incident.get("ml_probability", 0) * 100)
        attack_type = (incident.get("attack_type") or "Generic Phishing").replace("_", " ").title()
        target_brand = incident.get("target_brand") or "None Detected"
        email_info = incident.get("email", {})

        elements.append(Paragraph("🛡️ PS-02 PHISHING INCIDENT INVESTIGATION REPORT", title_style))
        elements.append(Paragraph(f"Incident ID: {inc_id} &bull; Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
        elements.append(Spacer(1, 10))

        # 2. Key Metrics Table
        verdict_bg = colors.HexColor("#fee2e2") if "CRITICAL" in verdict else (colors.HexColor("#ffedd5") if "PHISHING" in verdict else colors.HexColor("#fef9c3"))
        verdict_fg = colors.HexColor("#b91c1c") if "CRITICAL" in verdict else (colors.HexColor("#c2410c") if "PHISHING" in verdict else colors.HexColor("#a16207"))

        metrics_data = [
            [
                Paragraph("<b>Verdict:</b>", body_style),
                Paragraph(f"<b><font color='{verdict_fg.hexval()}'>{verdict}</font></b>", body_style),
                Paragraph("<b>Risk Score:</b>", body_style),
                Paragraph(f"<b>{risk_score} / 100</b>", body_style)
            ],
            [
                Paragraph("<b>ML Probability:</b>", body_style),
                Paragraph(f"<b>{ml_prob}% Phishing</b>", body_style),
                Paragraph("<b>Target Brand:</b>", body_style),
                Paragraph(f"<b>{target_brand}</b>", body_style)
            ],
            [
                Paragraph("<b>Attack Type:</b>", body_style),
                Paragraph(f"<b>{attack_type}</b>", body_style),
                Paragraph("<b>Classification:</b>", body_style),
                Paragraph("SOC High-Confidence", body_style)
            ]
        ]
        metrics_table = Table(metrics_data, colWidths=[100, 170, 100, 170])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(metrics_table)
        elements.append(Spacer(1, 10))

        # 3. Executive Summary
        elements.append(Paragraph("Executive Summary", h2_style))
        summary_text = incident.get("summary") or incident.get("explanation", "Incident analysis complete.")
        elements.append(Paragraph(summary_text, body_style))
        elements.append(Spacer(1, 10))

        # 4. Email Headers Table
        elements.append(Paragraph("Email Message Profile", h2_style))
        email_data = [
            [Paragraph("<b>From:</b>", body_style), Paragraph(email_info.get("sender", "N/A"), code_style)],
            [Paragraph("<b>Subject:</b>", body_style), Paragraph(f"<b>{email_info.get('subject', 'N/A')}</b>", body_style)],
            [Paragraph("<b>Reply-To:</b>", body_style), Paragraph(email_info.get("reply_to") or "None", code_style)],
            [Paragraph("<b>Message-ID:</b>", body_style), Paragraph(email_info.get("message_id") or "None", code_style)]
        ]
        email_table = Table(email_data, colWidths=[90, 450])
        email_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(email_table)
        elements.append(Spacer(1, 10))

        # 5. Forensic Indicators Table
        elements.append(Paragraph("Fired Security Indicators", h2_style))
        ind_data = [[
            Paragraph("<b>Severity</b>", body_style),
            Paragraph("<b>Indicator</b>", body_style),
            Paragraph("<b>Detected Evidence</b>", body_style)
        ]]
        indicators = incident.get("indicators", [])
        for ind in indicators:
            sev = ind.get("severity", "low").upper()
            ind_data.append([
                Paragraph(f"<b>{sev}</b>", body_style),
                Paragraph(f"<b>{ind.get('title', '')}</b>", body_style),
                Paragraph(ind.get("evidence", ""), code_style)
            ])
        if len(ind_data) == 1:
            ind_data.append([Paragraph("CLEAN", body_style), Paragraph("No adverse security signals fired.", body_style), Paragraph("", body_style)])

        ind_table = Table(ind_data, colWidths=[70, 170, 300])
        ind_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(ind_table)
        elements.append(Spacer(1, 10))

        # 6. Extracted IOCs Table
        elements.append(Paragraph("Extracted Indicators of Compromise (IOCs)", h2_style))
        iocs = incident.get("iocs", {})
        ioc_data = [[Paragraph("<b>Type</b>", body_style), Paragraph("<b>Value</b>", body_style), Paragraph("<b>Status</b>", body_style)]]
        for cat, items in iocs.items():
            for item in items[:6]:
                ioc_data.append([
                    Paragraph(item.get("type", cat).upper(), body_style),
                    Paragraph(item.get("value", ""), code_style),
                    Paragraph(item.get("threat_intel_status", "unknown").capitalize(), body_style)
                ])
        if len(ioc_data) == 1:
            ioc_data.append([Paragraph("None", body_style), Paragraph("No IOCs recorded.", body_style), Paragraph("", body_style)])

        ioc_table = Table(ioc_data, colWidths=[70, 370, 100])
        ioc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(ioc_table)
        elements.append(Spacer(1, 10))

        # 7. Recommended Response Actions
        elements.append(Paragraph("Recommended SOC Response Actions", h2_style))
        recs = incident.get("recommendations", [])
        for r in recs:
            elements.append(Paragraph(f"&bull; <b>{r.get('title')}:</b> {r.get('action')}", body_style))
            elements.append(Spacer(1, 2))

        # Footer note
        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1")))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph("CONFIDENTIAL &bull; Generated by PS-02 Phishing Attack Investigation Platform &bull; For Authorized Security Operations Personnel Only", subtitle_style))

        doc.build(elements)
        return buffer.getvalue()
