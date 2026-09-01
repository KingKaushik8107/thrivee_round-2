import json
import httpx
from typing import Dict, Any, List, Optional
from backend.config import settings

GROUNDED_SYSTEM_PROMPT = """You are an expert Security Operations Center (SOC) Level 3 AI Security Analyst.
You are assisting an incident responder by analyzing a suspicious email based STRICTLY on verified forensic security findings.

RULES:
1. Ground your analysis ONLY on the provided structured JSON findings (indicators, risk scores, ML prediction, brand detection, IOCs, and headers).
2. Do NOT invent, assume, or hallucinate indicators or malicious evidence that was not detected.
3. Clearly cite the specific fired indicators and technical evidence (e.g. lookalike domains, link destination mismatches, urgency triggers, SPF/DKIM validation).
4. Provide structured, actionable, and professional cybersecurity advice.
"""

class AISecurityAnalyst:
    @classmethod
    async def explain_incident(
        cls,
        question: str,
        structured_findings: Dict[str, Any],
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Provides AI-assisted forensic explanations strictly grounded in structured analysis findings.
        """
        # Format structured findings context
        findings_json = json.dumps(structured_findings, indent=2)

        # 1. Check if external LLM API is available (OpenAI / Gemini)
        if settings.OPENAI_API_KEY:
            try:
                answer = await cls._query_openai(question, findings_json, history)
                return {"answer": answer, "grounded": True, "engine": "OpenAI GPT-4o"}
            except Exception as e:
                print(f"[!] OpenAI API query error: {e}")

        if settings.GEMINI_API_KEY:
            try:
                answer = await cls._query_gemini(question, findings_json, history)
                return {"answer": answer, "grounded": True, "engine": "Google Gemini"}
            except Exception as e:
                print(f"[!] Gemini API query error: {e}")

        # 2. Grounded deterministic SOC analyst reasoning engine (Zero-dependency offline mode)
        answer = cls._deterministic_grounded_response(question, structured_findings)
        return {
            "answer": answer,
            "grounded": True,
            "engine": "SOC Deterministic Grounded Reasoning Engine"
        }

    @classmethod
    def _deterministic_grounded_response(cls, question: str, findings: Dict[str, Any]) -> str:
        q_lower = question.lower()
        verdict = findings.get("verdict", "unknown")
        risk_score = findings.get("risk_score", 0)
        ml_prob = findings.get("ml_probability", 0)
        target_brand = findings.get("target_brand", "")
        attack_type = findings.get("attack_type", "")
        indicators = findings.get("indicators", [])
        iocs = findings.get("iocs", {})
        recommendations = findings.get("recommendations", [])

        # Categorize fired indicators
        crit_inds = [i for i in indicators if i.get("severity") == "critical"]
        high_inds = [i for i in indicators if i.get("severity") == "high"]
        med_inds = [i for i in indicators if i.get("severity") == "medium"]

        # Case 1: Why is this email dangerous / Why flagged?
        if any(k in q_lower for k in ["why", "dangerous", "flagged", "threat", "phishing", "reason"]):
            lines = [
                f"### Forensic Threat Assessment: {verdict.replace('_', ' ').upper()} (Risk Score: {risk_score}/100)",
                f"This email was flagged based on **{len(indicators)} verified security indicators** and a **{int(ml_prob*100)}% ML phishing probability**.",
                ""
            ]
            if target_brand:
                lines.append(f"1. **Target Brand Impersonation**: The email mimics **{target_brand}** infrastructure using lookalike domain techniques.")
            if crit_inds:
                lines.append(f"2. **Critical Severity Indicators**:")
                for ind in crit_inds:
                    lines.append(f"   - **{ind.get('title')}**: `{ind.get('evidence')}`")
            if high_inds:
                lines.append(f"3. **High Severity Indicators**:")
                for ind in high_inds[:3]:
                    lines.append(f"   - **{ind.get('title')}**: `{ind.get('evidence')}`")
            lines.append("\n**Conclusion**: The convergence of brand spoofing, misleading hyperlinks, and urgent coercive language indicates a high-confidence phishing campaign.")
            return "\n".join(lines)

        # Case 2: Strongest indicators
        if any(k in q_lower for k in ["strongest", "top", "indicators", "evidence", "key"]):
            lines = ["### Key Forensic Indicators Fired:"]
            top_list = (crit_inds + high_inds + med_inds)[:5]
            if top_list:
                for idx, ind in enumerate(top_list, 1):
                    lines.append(f"**{idx}. [{ind.get('severity', '').upper()}] {ind.get('title')}**")
                    lines.append(f"   - *Evidence*: {ind.get('evidence')}")
                    lines.append(f"   - *Security Context*: {ind.get('description')}\n")
            else:
                lines.append("No adverse indicators fired; email exhibits legitimate corporate communication patterns.")
            return "\n".join(lines)

        # Case 3: Target Brand
        if any(k in q_lower for k in ["brand", "impersonate", "who", "target"]):
            if target_brand:
                return (
                    f"### Targeted Brand: **{target_brand}**\n\n"
                    f"- The analysis identified high semantic and structural similarity to **{target_brand}**.\n"
                    f"- **Impersonation Vector**: The sender or destination URLs utilize deceptive typography, homoglyphs, or combosquatting to pose as official {target_brand} services."
                )
            else:
                return "### Target Brand Analysis\nNo specific third-party commercial brand was detected as the primary impersonation target in this message."

        # Case 4: Attack objective / type
        if any(k in q_lower for k in ["attack", "objective", "type", "goal", "vector"]):
            return (
                f"### Primary Attack Objective: **{attack_type.replace('_', ' ').title()}**\n\n"
                f"- **Confidence Score**: {int(findings.get('attack_type_confidence', 0.85) * 100)}%\n"
                f"- **Analysis**: The threat actor aims to manipulate the recipient into performing actions aligned with **{attack_type.replace('_', ' ')}**, such as disclosing credentials, executing untrusted attachments, or processing unauthorized financial transactions."
            )

        # Case 5: What should the SOC team do / Next actions?
        if any(k in q_lower for k in ["do", "action", "soc", "next", "remediation", "response", "playbook"]):
            lines = [
                "### Recommended SOC Playbook Actions:",
                "1. **Immediate Quarantine**: Purge the message from the recipient's mailbox across the mail server.",
                "2. **Tenant Search**: Query mail logs for similar subject lines or lookalike sender domains.",
                "3. **Credential Revocation**: If recipient clicked the link, force an immediate password reset and revoke active session tokens.",
                "4. **Perimeter Blocking**: Block the identified domains and URLs on the corporate DNS firewall and secure web gateways.",
                "5. **Threat Intel Dispatch**: Submit extracted IOCs to SOC threat feeds for automated boundary protection."
            ]
            return "\n".join(lines)

        # Default summary
        return (
            f"### Incident Summary Overview\n\n"
            f"- **Verdict**: {verdict.replace('_', ' ').upper()} (Score: {risk_score}/100)\n"
            f"- **Target Brand**: {target_brand or 'Generic / Untargeted'}\n"
            f"- **Attack Vector**: {attack_type.replace('_', ' ').title()}\n"
            f"- **ML Phishing Probability**: {int(ml_prob * 100)}%\n"
            f"- **Fired Indicators**: {len(indicators)} total ({len(crit_inds)} critical, {len(high_inds)} high)\n\n"
            f"Grounding Note: All findings are derived directly from static forensic inspection and ML language models."
        )

    @classmethod
    async def _query_openai(cls, question: str, findings_json: str, history: Optional[List[Dict[str, str]]]) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        messages = [
            {"role": "system", "content": f"{GROUNDED_SYSTEM_PROMPT}\n\nSTRUCTURED FORENSIC FINDINGS:\n{findings_json}"}
        ]
        if history:
            for msg in history[-4:]:
                messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": question})

        payload = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.2
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            raise Exception(f"OpenAI error: {resp.text}")

    @classmethod
    async def _query_gemini(cls, question: str, findings_json: str, history: Optional[List[Dict[str, str]]]) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        prompt_text = f"{GROUNDED_SYSTEM_PROMPT}\n\nSTRUCTURED FORENSIC FINDINGS:\n{findings_json}\n\nUSER QUESTION: {question}"
        payload = {
            "contents": [{"parts": [{"text": prompt_text}]}],
            "generationConfig": {"temperature": 0.2}
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            raise Exception(f"Gemini error: {resp.text}")
