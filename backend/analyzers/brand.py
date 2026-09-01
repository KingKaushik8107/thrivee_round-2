import re
from typing import Dict, Any, List, Optional, Tuple
from rapidfuzz import fuzz, distance
import tldextract

# Standard authentic brands and their legitimate primary domains
AUTHENTIC_BRANDS = [
    {
        "name": "PayPal",
        "primary_domain": "paypal.com",
        "legitimate_domains": ["paypal.com", "paypal-community.com", "paypalobjects.com", "py.pl"],
        "keywords": ["paypal", "paypa1", "pay-pal", "paypal-service"]
    },
    {
        "name": "Microsoft",
        "primary_domain": "microsoft.com",
        "legitimate_domains": ["microsoft.com", "office.com", "office365.com", "live.com", "outlook.com", "microsoftonline.com", "azure.com", "onedrive.com", "sharepoint.com", "msn.com"],
        "keywords": ["microsoft", "office365", "outlook", "onedrive", "sharepoint", "micros0ft", "ms-office"]
    },
    {
        "name": "Google",
        "primary_domain": "google.com",
        "legitimate_domains": ["google.com", "gmail.com", "googlemail.com", "youtube.com", "googleapis.com", "gstatic.com"],
        "keywords": ["google", "gmail", "g00gle", "goog1e"]
    },
    {
        "name": "Apple",
        "primary_domain": "apple.com",
        "legitimate_domains": ["apple.com", "icloud.com", "appleid.apple.com"],
        "keywords": ["apple", "icloud", "appleid", "app1e"]
    },
    {
        "name": "Amazon",
        "primary_domain": "amazon.com",
        "legitimate_domains": ["amazon.com", "aws.amazon.com", "amazon.co.uk", "amazon.de", "media-amazon.com"],
        "keywords": ["amazon", "amaz0n", "prime-video", "aws-amazon"]
    },
    {
        "name": "Netflix",
        "primary_domain": "netflix.com",
        "legitimate_domains": ["netflix.com", "netflix.net"],
        "keywords": ["netflix", "netf1ix", "net-flix"]
    },
    {
        "name": "Meta / Facebook",
        "primary_domain": "meta.com",
        "legitimate_domains": ["facebook.com", "meta.com", "instagram.com", "whatsapp.com", "fb.com"],
        "keywords": ["facebook", "meta", "instagram", "whatsapp", "faceb00k"]
    },
    {
        "name": "Chase Bank",
        "primary_domain": "chase.com",
        "legitimate_domains": ["chase.com", "jpmorganchase.com", "jpmorgan.com"],
        "keywords": ["chase", "chase-bank", "jpmorgan"]
    },
    {
        "name": "Bank of America",
        "primary_domain": "bankofamerica.com",
        "legitimate_domains": ["bankofamerica.com", "bofa.com"],
        "keywords": ["bankofamerica", "bofa", "bank-of-america"]
    },
    {
        "name": "Wells Fargo",
        "primary_domain": "wellsfargo.com",
        "legitimate_domains": ["wellsfargo.com"],
        "keywords": ["wellsfargo", "wells-fargo"]
    },
    {
        "name": "DocuSign",
        "primary_domain": "docusign.com",
        "legitimate_domains": ["docusign.com", "docusign.net"],
        "keywords": ["docusign", "docus1gn", "docu-sign"]
    },
    {
        "name": "Dropbox",
        "primary_domain": "dropbox.com",
        "legitimate_domains": ["dropbox.com"],
        "keywords": ["dropbox", "drop-box"]
    },
    {
        "name": "Stripe",
        "primary_domain": "stripe.com",
        "legitimate_domains": ["stripe.com"],
        "keywords": ["stripe", "str1pe"]
    }
]

# Character substitution map (Homoglyphs / Typosquatting / Leetspeak)
CHAR_SUBSTITUTIONS = {
    '1': 'l',
    'l': 'i',
    '0': 'o',
    '5': 's',
    'vv': 'w',
    'rn': 'm',
    '@': 'a',
    '3': 'e',
    '8': 'b',
    'q': 'g'
}

class BrandAnalyzer:
    @classmethod
    def analyze_domain(cls, domain_or_url: str) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Analyzes a domain or URL for brand impersonation, typosquatting, and combosquatting.
        Returns:
            (best_brand_match_dict, list_of_indicators)
        """
        indicators = []
        if not domain_or_url:
            return None, indicators

        # Clean host/domain
        raw_host = domain_or_url.lower().strip()
        if "://" in raw_host:
            raw_host = raw_host.split("://")[1].split("/")[0].split("?")[0]
        else:
            raw_host = raw_host.split("/")[0].split("?")[0]
        if ":" in raw_host:
            raw_host = raw_host.split(":")[0]

        extracted = tldextract.extract(raw_host)
        top_domain = getattr(extracted, 'top_domain_under_public_suffix', None) or extracted.registered_domain
        reg_domain = top_domain.lower() if top_domain else raw_host
        domain_name = extracted.domain.lower() if extracted.domain else raw_host

        # Normalize leetspeak substitutions in domain name
        normalized_domain = domain_name
        techniques_detected = set()

        for char, repl in CHAR_SUBSTITUTIONS.items():
            if char in normalized_domain:
                # Check if replacing produces a known brand keyword
                trial = normalized_domain.replace(char, repl)
                for brand in AUTHENTIC_BRANDS:
                    if brand["name"].lower().replace(" ", "") in trial or any(k in trial for k in brand["keywords"]):
                        techniques_detected.add("character_substitution")
                        normalized_domain = trial
                        break

        best_match = None
        highest_similarity = 0.0

        for brand in AUTHENTIC_BRANDS:
            brand_name = brand["name"]
            primary_domain = brand["primary_domain"]
            legit_domains = [d.lower() for d in brand["legitimate_domains"]]

            # If it is legitimately the authentic domain, no impersonation
            if reg_domain in legit_domains or any(reg_domain.endswith("." + d) for d in legit_domains):
                continue

            brand_core = brand_name.lower().replace(" ", "").replace("-", "")

            # 1. Combosquatting / Suffix addition check (e.g. paypal-login, paypal-security, microsoft-online)
            if brand_core in domain_name or brand_core in normalized_domain:
                techniques_detected.add("combosquatting")
                techniques_detected.add("brand_impersonation")
                if any(s in domain_name for s in ["login", "verify", "security", "account", "support", "portal", "update", "service", "help"]):
                    techniques_detected.add("misleading_suffix")

                sim = 0.92
                if sim > highest_similarity:
                    highest_similarity = sim
                    best_match = {
                        "brand": brand_name,
                        "detected_domain": reg_domain,
                        "similarity": round(sim, 2),
                        "techniques": list(techniques_detected)
                    }

            # 2. Levenshtein / RapidFuzz string similarity check
            # Compare domain_name to brand core name
            ratio = fuzz.ratio(domain_name, brand_core) / 100.0
            norm_ratio = fuzz.ratio(normalized_domain, brand_core) / 100.0
            max_ratio = max(ratio, norm_ratio)

            # Also check partial ratio
            partial = fuzz.partial_ratio(brand_core, domain_name) / 100.0

            if max_ratio >= 0.75 or (partial >= 0.85 and len(domain_name) > len(brand_core)):
                if "character_substitution" not in techniques_detected and max_ratio != ratio:
                    techniques_detected.add("character_substitution")
                techniques_detected.add("brand_impersonation")
                techniques_detected.add("typosquatting")

                computed_sim = max(max_ratio, 0.88 if partial >= 0.85 else max_ratio)
                if computed_sim > highest_similarity:
                    highest_similarity = computed_sim
                    best_match = {
                        "brand": brand_name,
                        "detected_domain": reg_domain,
                        "similarity": round(computed_sim, 2),
                        "techniques": list(techniques_detected)
                    }

        if best_match and highest_similarity >= 0.75:
            indicators.append({
                "source": "brand_analysis",
                "category": "brand_impersonation",
                "indicator_code": "BRAND_LOOKALIKE_DOMAIN",
                "title": f"Target Brand Impersonation: {best_match['brand']}",
                "severity": "critical" if highest_similarity >= 0.85 else "high",
                "evidence": f"Domain '{reg_domain}' closely resembles authentic {best_match['brand']} infrastructure (similarity: {int(highest_similarity*100)}%). Techniques detected: {', '.join(best_match['techniques'])}.",
                "description": f"The domain mimics {best_match['brand']}. Attackers register lookalike domains using typosquatting, leetspeak character substitutions, and deceptive administrative suffixes to harvest credentials."
            })

        return best_match, indicators
