import re
from typing import Dict, Any, List, Tuple
from urllib.parse import urlparse, parse_qs
import tldextract

URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "is.gd", "buff.ly", "ow.ly", "rebrand.ly",
    "cutt.ly", "goo.gl", "bit.do", "shorte.st", "adf.ly", "tiny.cc", "qr.ae"
}

IP_REGEX = re.compile(r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?$')

class URLAnalyzer:
    @classmethod
    def analyze_urls(cls, urls: List[str], links: List[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        indicators = []
        if not urls:
            return indicators

        for url in urls:
            if not url or not isinstance(url, str):
                continue
            
            clean_url = url.strip()
            # Normalize missing scheme
            if not clean_url.startswith(("http://", "https://", "ftp://")):
                parsed = urlparse("http://" + clean_url)
            else:
                parsed = urlparse(clean_url)

            hostname = parsed.hostname or ""
            scheme = parsed.scheme.lower()
            path = parsed.path or ""
            query = parsed.query or ""

            # 1. IP Address in Hostname
            if hostname and IP_REGEX.match(hostname):
                indicators.append({
                    "source": "url_analysis",
                    "category": "ip_host",
                    "indicator_code": "IP_ADDRESS_IN_URL",
                    "title": "Raw IP Address Used as Hostname in URL",
                    "severity": "critical",
                    "evidence": f"URL '{clean_url}' points directly to numeric IP '{hostname}' rather than a verified domain name.",
                    "description": "Legitimate organizations rarely send user-facing emails containing raw IP addresses. Attackers use raw IPs to bypass DNS-based reputation filters."
                })

            # 2. HTTP Protocol for Security/Login/Action URL
            if scheme == "http":
                # If path or query mentions login, verify, auth, security, payment
                sensitive_cues = ["login", "verify", "auth", "account", "secure", "bank", "pay", "billing", "signin", "reset"]
                if any(c in path.lower() or c in query.lower() or c in hostname.lower() for c in sensitive_cues):
                    indicators.append({
                        "source": "url_analysis",
                        "category": "unencrypted_credential_flow",
                        "indicator_code": "HTTP_FOR_SENSITIVE_ACTION",
                        "title": "Insecure HTTP Protocol For Credential/Action Link",
                        "severity": "high",
                        "evidence": f"URL '{clean_url}' uses unencrypted HTTP for a sensitive workflow ({path or hostname}).",
                        "description": "Enterprise authentication workflows require HTTPS encryption. Attack infrastructure often uses plain HTTP or self-signed setups."
                    })
                else:
                    indicators.append({
                        "source": "url_analysis",
                        "category": "insecure_protocol",
                        "indicator_code": "HTTP_PROTOCOL_URL",
                        "title": "Insecure HTTP Protocol In Email Link",
                        "severity": "low",
                        "evidence": f"URL '{clean_url}' uses unencrypted HTTP transport.",
                        "description": "Modern corporate communications overwhelmingly enforce HTTPS encryption to prevent man-in-the-middle tampering."
                    })

            # 3. URL Shortener Service Detected
            if hostname in URL_SHORTENERS:
                indicators.append({
                    "source": "url_analysis",
                    "category": "url_shortener",
                    "indicator_code": "URL_SHORTENER_OBFUSCATION",
                    "title": "URL Shortener Service Obfuscation",
                    "severity": "high",
                    "evidence": f"Shortener service '{hostname}' hides the final link destination in '{clean_url}'.",
                    "description": "URL shorteners are routinely utilized by adversaries to conceal blacklisted malicious domains and evade perimeter gateway inspection."
                })

            # 4. Excessive URL Length / Query Parameter Stuffing
            if len(clean_url) > 120:
                indicators.append({
                    "source": "url_analysis",
                    "category": "url_length",
                    "indicator_code": "EXCESSIVE_URL_LENGTH",
                    "title": "Excessively Long URL (>120 chars)",
                    "severity": "low",
                    "evidence": f"URL is {len(clean_url)} characters long: '{clean_url[:90]}...'.",
                    "description": "Long URLs often embed tracking tokens, victim identifiers, or base64-encoded redirection payloads."
                })

            # 5. Obfuscated / Percent Encoded Characters
            percent_encodings = re.findall(r'%[0-9a-fA-F]{2}', clean_url)
            if len(percent_encodings) >= 5 or "%2e" in clean_url.lower() or "%2f" in clean_url.lower():
                indicators.append({
                    "source": "url_analysis",
                    "category": "url_obfuscation",
                    "indicator_code": "HEX_PERCENT_OBFUSCATION",
                    "title": "Suspicious Hex / Percent Obfuscation in URL",
                    "severity": "medium",
                    "evidence": f"URL contains {len(percent_encodings)} percent-encoded characters designed to obscure directory structure.",
                    "description": "Double encoding and excessive hex escaping are classic evasion methods used to bypass signature-based web application filters."
                })

            # 6. Suspicious Phishing Paths
            phishing_paths = ["/login", "/verify", "/update", "/signin", "/auth", "/webscr", "/cmd=_login", "/secure-login", "/checkpoint"]
            if any(p in (path + query).lower() for p in phishing_paths):
                indicators.append({
                    "source": "url_analysis",
                    "category": "phishing_path",
                    "indicator_code": "SUSPICIOUS_AUTHENTICATION_PATH",
                    "title": "Authentication / Credential Harvesting Endpoint in URL",
                    "severity": "medium",
                    "evidence": f"Path / query in '{clean_url}' targets sensitive authentication routes.",
                    "description": "The URL structure mimics standard single-sign-on or verification paths to harvest victim credentials."
                })

        # 7. Analyze Link Destination Mismatches
        if links:
            cls._check_link_destination_mismatches(links, indicators)

        return indicators

    @classmethod
    def _check_link_destination_mismatches(cls, links: List[Dict[str, str]], indicators: List[Dict[str, Any]]):
        """
        Detects situations where the visible anchor text displays one brand/URL
        (e.g., 'https://paypal.com/signin' or 'Verify your PayPal Account')
        while the actual href goes to an unrelated destination domain.
        """
        for link in links:
            anchor_text = link.get("text", "").strip()
            href = link.get("url", "").strip()
            if not anchor_text or not href:
                continue

            # Case A: Anchor text literally displays a URL (e.g. 'www.paypal.com') but href goes elsewhere
            if re.match(r'^(?:https?://)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', anchor_text):
                anchor_ext = tldextract.extract(anchor_text)
                href_ext = tldextract.extract(href)
                anchor_dom = getattr(anchor_ext, 'top_domain_under_public_suffix', None) or anchor_ext.registered_domain
                href_dom = getattr(href_ext, 'top_domain_under_public_suffix', None) or href_ext.registered_domain
                if anchor_dom and href_dom:
                    if anchor_dom.lower() != href_dom.lower():
                        indicators.append({
                            "source": "url_analysis",
                            "category": "link_destination_mismatch",
                            "indicator_code": "LINK_DESTINATION_MISMATCH",
                            "title": "Deceptive Link: Displayed URL Differs From Actual Destination",
                            "severity": "critical",
                            "evidence": f"Visible Text displays '{anchor_text}' (domain: '{anchor_dom}'), but actual hyperlink directs to '{href}' (domain: '{href_dom}').",
                            "description": "This is a high-confidence indicator of deliberate credential phishing. The email tricks the recipient by showing a trusted domain while silently routing their click to malicious infrastructure."
                        })
                        continue

            # Case B: Anchor text mentions a major brand name, but href goes to an unrelated third party
            lower_text = anchor_text.lower()
            for brand in ["paypal", "microsoft", "google", "apple", "amazon", "netflix", "chase", "docusign", "dropbox"]:
                if brand in lower_text:
                    href_ext = tldextract.extract(href)
                    href_dom = getattr(href_ext, 'top_domain_under_public_suffix', None) or href_ext.registered_domain
                    if href_dom and brand not in href_dom.lower():
                        indicators.append({
                            "source": "url_analysis",
                            "category": "link_destination_mismatch",
                            "indicator_code": "BRAND_ANCHOR_MISMATCH",
                            "title": f"Deceptive Link: '{brand.title()}' Anchor Leads to Unrelated Domain",
                            "severity": "high",
                            "evidence": f"Link Anchor mentions '{anchor_text}', but destination domain is '{href_dom}'.",
                            "description": "Anchor text referencing recognized enterprise brands directing to unrelated third-party domains is a hallmark of credential harvesting campaigns."
                        })
                        break
