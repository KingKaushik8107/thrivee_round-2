from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

class BaseThreatIntelProvider(ABC):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or ""
        self.name = "BaseProvider"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 4)

    @abstractmethod
    async def lookup_ioc(self, ioc_type: str, ioc_value: str) -> Dict[str, Any]:
        pass

    def default_unconfigured_response(self, ioc_type: str, ioc_value: str) -> Dict[str, Any]:
        return {
            "provider": self.name,
            "ioc_type": ioc_type,
            "ioc_value": ioc_value,
            "status": "unknown",
            "status_label": "Unknown / Not checked",
            "reputation_score": 0.0,
            "confidence": 0.0,
            "last_checked": datetime.now(timezone.utc).isoformat(),
            "source": f"{self.name} (API key not configured)",
            "details": {"message": f"External {self.name} API key not provided in environment variables."}
        }
