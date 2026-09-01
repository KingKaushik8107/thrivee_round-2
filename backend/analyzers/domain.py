import math
import re
from typing import Dict, Any, List
import tldextract

SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "click", "buzz", "rest", "cam",
    "work", "sbs", "icu", "monster", "quest", "link", "cfd", "online", "live"
}

BRAND_KEYWORDS = [
    "paypal", "microsoft", "google", "apple", "amazon", "netflix", "meta", "facebook",
    "instagram", "chase", "wellsfargo", "bankofamerica", "docusign", "dropbox", "onedrive",
    "outlook", "office365", "adobe", "secure", "login", "verify", "account", "update"
]

class DomainAnalyzer:
    @classmethod
    def analyze_domain(cls, domain_str: str, context_label: str = "Sender Domain") -> List[Dict[str, Any]]:
        indicators = []
        if not domain_str:
            return indicators

        domain_str = domain_str.lower().strip()
        # Strip port if present
        if ":" in domain_str:
            domain_str = domain_str.split(":")[0]

        # Extract TLD and registered domain using tldextract
        extracted = tldextract.extract(domain_str)
        subdomain = extracted.subdomain
        domain_name = extracted.domain
        suffix = extracted.suffix
        registered_domain = extracted.top_domain_under_public_suffix if hasattr(extracted, 'top_domain_under_public_suffix') else f"{domain_name}.{suffix}"

        # 1. Punycode / IDN Homograph attack detection
        if "xn--" in domain_str:
            indicators.append({
                "source": "domain_analysis",
                "category": "homograph_attack",
                "indicator_code": "PUNYCODE_IDN_HOMOGRAPH",
                "title": f"Punycode / IDN Homograph Detected in {context_label}",
                "severity": "critical",
                "evidence": f"Domain '{domain_str}' utilizes Punycode encoding (xn-- prefix) to render deceptive Unicode lookalike characters.",
                "description": "Internationalized Domain Names (IDNs) can visually mimic authentic brand names using Cyrillic or Greek glyphs that appear identical to Latin characters."
            })

        # 2. Suspicious / Abused TLD
        if suffix in SUSPICIOUS_TLDS:
            indicators.append({
                "source": "domain_analysis",
                "category": "suspicious_tld",
                "indicator_code": "HIGH_RISK_TLD",
                "title": f"High-Risk / Frequently Abused TLD ({suffix}) in {context_label}",
                "severity": "medium",
                "evidence": f"Domain '{domain_str}' is registered under '.{suffix}', a top-level domain frequently associated with disposable phishing campaigns.",
                "description": "Certain TLDs offer free or ultra-low-cost domain registrations with minimal vetting, making them popular for bulk disposable attack infrastructure."
            })

        # 3. Excessive Hyphens
        hyphen_count = domain_str.count("-")
        if hyphen_count >= 3:
            indicators.append({
                "source": "domain_analysis",
                "category": "domain_structure",
                "indicator_code": "EXCESSIVE_HYPHENS",
                "title": f"Excessive Hyphenation in {context_label}",
                "severity": "medium",
                "evidence": f"Domain '{domain_str}' contains {hyphen_count} hyphens.",
                "description": "Multiple hyphens are commonly used by attackers to combine brand names with administrative keywords (e.g. 'paypal-security-verification-center')."
            })
        elif hyphen_count in (1, 2) and any(b in domain_str for b in BRAND_KEYWORDS):
            indicators.append({
                "source": "domain_analysis",
                "category": "domain_structure",
                "indicator_code": "HYPHENATED_SECURITY_KEYWORD",
                "title": f"Hyphenated Keyword Pairing in {context_label}",
                "severity": "low",
                "evidence": f"Domain '{domain_str}' combines security/brand tokens with hyphen separators.",
                "description": "Attackers frequently use hyphens to concatenate authentic brand words with spoofed verification cues."
            })

        # 4. Excessive Subdomains (Domain stacking)
        if subdomain:
            subdomain_parts = subdomain.split(".")
            if len(subdomain_parts) >= 3:
                indicators.append({
                    "source": "domain_analysis",
                    "category": "domain_structure",
                    "indicator_code": "EXCESSIVE_SUBDOMAINS",
                    "title": f"Deep Subdomain Stacking in {context_label}",
                    "severity": "medium",
                    "evidence": f"Subdomain structure '{subdomain}' has {len(subdomain_parts)} levels.",
                    "description": "Deep subdomain nesting is frequently used to push the actual registered domain out of mobile browser address bars."
                })

        # 5. Shannon Entropy (Random Generation / DGA detection)
        entropy = cls._calculate_entropy(domain_name)
        if len(domain_name) > 10 and entropy > 3.8:
            indicators.append({
                "source": "domain_analysis",
                "category": "dga_entropy",
                "indicator_code": "HIGH_DOMAIN_ENTROPY",
                "title": f"High Shannon Entropy in {context_label} (Possible DGA)",
                "severity": "medium",
                "evidence": f"Domain name '{domain_name}' has an entropy score of {entropy:.2f}, indicating pseudo-random character generation.",
                "description": "Domain Generation Algorithms (DGAs) dynamically produce high-entropy randomized domain strings to evade static IP blacklists."
            })

        # 6. Embedded Brands in Subdomains or Suffixes
        if subdomain:
            for brand in ["paypal", "microsoft", "google", "apple", "netflix", "amazon", "chase", "bankofamerica"]:
                if brand in subdomain.lower() and brand not in domain_name.lower():
                    indicators.append({
                        "source": "domain_analysis",
                        "category": "brand_in_subdomain",
                        "indicator_code": "BRAND_IN_SUBDOMAIN",
                        "title": f"Brand In Subdomain of Third-Party Host in {context_label}",
                        "severity": "high",
                        "evidence": f"Brand '{brand}' appears in subdomain '{subdomain}', but registered domain is '{registered_domain}'.",
                        "description": "Placing a target brand in the subdomain is a classic spoofing technique to deceive victims into believing they are visiting an official brand page."
                    })
                    break

        return indicators

    @classmethod
    def _calculate_entropy(cls, text: str) -> float:
        if not text:
            return 0.0
        prob = [float(text.count(c)) / len(text) for c in dict.fromkeys(list(text))]
        return -sum([p * math.log(p) / math.log(2.0) for p in prob])
