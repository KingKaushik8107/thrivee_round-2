import re
from typing import Dict, Any, List

EXECUTABLE_EXTENSIONS = {
    "exe", "scr", "bat", "cmd", "com", "pif", "cpl", "msi", "jar", "bin"
}

SCRIPT_EXTENSIONS = {
    "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "ps2", "sh", "hta", "reg"
}

MACRO_EXTENSIONS = {
    "docm", "xlsm", "pptm", "dotm", "xltm", "xlam", "docb"
}

CONTAINER_ARCHIVE_EXTENSIONS = {
    "iso", "img", "vhd", "vhdx", "ace", "cab", "arj", "lzh"
}

class AttachmentAnalyzer:
    @classmethod
    def analyze_attachments(cls, attachments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        indicators = []
        if not attachments:
            return indicators

        for att in attachments:
            filename = att.get("filename", "unnamed").strip()
            ext = att.get("extension", "").lower().strip()
            mime = att.get("content_type", "").lower().strip()

            # 1. Double Extension Detection (e.g. invoice.pdf.exe, report.docx.vbs)
            parts = filename.split(".")
            if len(parts) >= 3:
                second_last_ext = parts[-2].lower()
                final_ext = parts[-1].lower()
                if second_last_ext in ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png", "txt"]:
                    if final_ext in EXECUTABLE_EXTENSIONS or final_ext in SCRIPT_EXTENSIONS or final_ext == "iso":
                        indicators.append({
                            "source": "attachment_analysis",
                            "category": "double_extension",
                            "indicator_code": "DECEPTIVE_DOUBLE_EXTENSION",
                            "title": "Deceptive Double Extension in Attachment",
                            "severity": "critical",
                            "evidence": f"Attachment '{filename}' uses a masquerading double extension (.{second_last_ext}.{final_ext}).",
                            "description": "Double extension filenames disguise malicious executables or scripts as innocuous documents or images to trick victims into opening them."
                        })

            # 2. Direct Executable Binary Detection
            if ext in EXECUTABLE_EXTENSIONS:
                indicators.append({
                    "source": "attachment_analysis",
                    "category": "executable_attachment",
                    "indicator_code": "EXECUTABLE_BINARY_PAYLOAD",
                    "title": "High-Risk Executable Binary Attachment",
                    "severity": "critical",
                    "evidence": f"Attachment '{filename}' is a raw binary/executable format (.{ext}).",
                    "description": "Direct transmission of executable binaries via email is prohibited by secure email gateways due to immediate arbitrary code execution risk."
                })
                continue

            # 3. Script Payload Detection
            if ext in SCRIPT_EXTENSIONS:
                indicators.append({
                    "source": "attachment_analysis",
                    "category": "script_payload",
                    "indicator_code": "SCRIPT_FILE_PAYLOAD",
                    "title": "Executable Script Attachment (VBS/JS/PowerShell)",
                    "severity": "critical",
                    "evidence": f"Attachment '{filename}' is an executable script format (.{ext}).",
                    "description": "Malicious scripts (VBScript, JavaScript, PowerShell) are widely utilized as initial downloaders to fetch secondary malware stages."
                })
                continue

            # 4. Macro-Enabled Document Detection
            if ext in MACRO_EXTENSIONS:
                indicators.append({
                    "source": "attachment_analysis",
                    "category": "macro_document",
                    "indicator_code": "MACRO_ENABLED_OFFICE_DOCUMENT",
                    "title": "Macro-Enabled Office Document Attached",
                    "severity": "high",
                    "evidence": f"Attachment '{filename}' is a macro-enabled Office container (.{ext}).",
                    "description": "Macro-enabled documents (.docm, .xlsm) frequently contain weaponized VBA macros programmed to execute shellcode upon opening."
                })
                continue

            # 5. Container / Disc Image Archive (Bypasses Mark-of-the-Web)
            if ext in CONTAINER_ARCHIVE_EXTENSIONS:
                indicators.append({
                    "source": "attachment_analysis",
                    "category": "motw_bypass_container",
                    "indicator_code": "DISC_IMAGE_CONTAINER_ARCHIVE",
                    "title": "Disc Image / Container Attachment (MOTW Bypass)",
                    "severity": "high",
                    "evidence": f"Attachment '{filename}' is a virtual disk or specialized container format (.{ext}).",
                    "description": "Adversaries deliver .iso/.vhd containers because when mounted by the operating system, inner files may evade Windows Mark-of-the-Web security flags."
                })
                continue

            # 6. MIME Type vs Extension Mismatch
            if "executable" in mime or "x-dosexec" in mime or "x-msdownload" in mime:
                if ext not in EXECUTABLE_EXTENSIONS:
                    indicators.append({
                        "source": "attachment_analysis",
                        "category": "mime_mismatch",
                        "indicator_code": "MIME_EXTENSION_ANOMALY",
                        "title": "MIME Type & File Extension Mismatch",
                        "severity": "high",
                        "evidence": f"Attachment '{filename}' has extension '.{ext}' but MIME type indicates executable code ('{mime}').",
                        "description": "Spoofed MIME headers attempt to disguise binary malware as benign documents during gateway content inspection."
                    })

        return indicators
