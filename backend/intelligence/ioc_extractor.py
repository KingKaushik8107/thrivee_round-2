import re
import csv
import io
import json
from typing import Dict, Any, List, Set
import tldextract

IPV4_REGEX = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
IPV6_REGEX = re.compile(r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b')
EMAIL_REGEX = re.compile(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b')
SHA256_REGEX = re.compile(r'\b[a-fA-F0-9]{64}\b')
MD5_REGEX = re.compile(r'\b[a-fA-F0-9]{32}\b')

class IOCExtractor:
    @classmethod
    def extract_iocs(cls, parsed_email: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extracts structured Indicators of Compromise (IOCs) from all parsed email fields.
        """
        emails: Set[str] = set()
        domains: Set[str] = set()
        urls: Set[str] = set()
        ips: Set[str] = set()
        hashes: Set[str] = set()
        message_ids: Set[str] = set()

        raw_content = parsed_email.get("raw_content", "") or ""
        body = parsed_email.get("body", "") or ""
        sender = parsed_email.get("sender", "") or ""
        reply_to = parsed_email.get("reply_to", "") or ""
        receiver = parsed_email.get("receiver", "") or ""
        msg_id = parsed_email.get("message_id", "") or ""
        extracted_urls = parsed_email.get("urls", []) or []
        attachments = parsed_email.get("attachments", []) or []

        # 1. Emails
        if sender:
            emails.add(sender.lower().strip())
        if reply_to:
            emails.add(reply_to.lower().strip())
        if receiver:
            emails.add(receiver.lower().strip())
        for em in EMAIL_REGEX.findall(f"{body}\n{raw_content}"):
            emails.add(em.lower().strip())

        # 2. URLs & Domains
        for u in extracted_urls:
            if u:
                clean_u = u.strip()
                urls.add(clean_u)
                ext = tldextract.extract(clean_u)
                top_dom = getattr(ext, 'top_domain_under_public_suffix', None) or ext.registered_domain
                if top_dom:
                    domains.add(top_dom.lower())

        # Also extract domains from emails
        for em in emails:
            if "@" in em:
                domain_part = em.split("@")[-1].lower()
                ext = tldextract.extract(domain_part)
                top_dom = getattr(ext, 'top_domain_under_public_suffix', None) or ext.registered_domain
                if top_dom:
                    domains.add(top_dom.lower())

        # 3. IP Addresses
        for ip in IPV4_REGEX.findall(f"{raw_content}\n{body}"):
            # Exclude loopback or local standard nets if desired, but keep for forensic tracking
            ips.add(ip)
        for ip6 in IPV6_REGEX.findall(f"{raw_content}\n{body}"):
            ips.add(ip6)

        # 4. Hashes from attachments
        for att in attachments:
            if att.get("sha256"):
                hashes.add(att["sha256"])
            if att.get("md5"):
                hashes.add(att["md5"])

        # Also check regex in raw headers for hash fingerprints
        for h in SHA256_REGEX.findall(raw_content):
            hashes.add(h.lower())

        # 5. Message IDs
        if msg_id:
            message_ids.add(msg_id.strip())

        # Format standardized IOC dictionaries
        return {
            "emails": [{"type": "email", "value": e} for e in sorted(emails)],
            "domains": [{"type": "domain", "value": d} for d in sorted(domains)],
            "urls": [{"type": "url", "value": u} for u in sorted(urls)],
            "ips": [{"type": "ip", "value": ip} for ip in sorted(ips)],
            "hashes": [{"type": "hash", "value": h} for h in sorted(hashes)],
            "message_ids": [{"type": "message_id", "value": m} for m in sorted(message_ids)]
        }

    @classmethod
    def export_to_json(cls, iocs_dict: Dict[str, List[Dict[str, Any]]]) -> str:
        return json.dumps(iocs_dict, indent=2)

    @classmethod
    def export_to_csv(cls, iocs_dict: Dict[str, List[Dict[str, Any]]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["IOC_Type", "Value", "Threat_Intel_Status"])
        for category, items in iocs_dict.items():
            for item in items:
                writer.writerow([
                    item.get("type", category),
                    item.get("value", ""),
                    item.get("threat_intel_status", "unknown")
                ])
        return output.getvalue()
