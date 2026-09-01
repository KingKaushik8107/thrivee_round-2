import re
import email
from email import policy
from email.parser import BytesParser, Parser
from typing import Dict, Any, List, Optional, Tuple
import hashlib
from html.parser import HTMLParser

class SimpleHTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.links: List[Tuple[str, str]] = []  # (anchor_text, href)
        self._current_href = None
        self._current_anchor_text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            for attr, val in attrs:
                if attr.lower() == "href" and val:
                    self._current_href = val.strip()
                    self._current_anchor_text = []

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._current_href:
            anchor_str = "".join(self._current_anchor_text).strip()
            self.links.append((anchor_str, self._current_href))
            self._current_href = None
            self._current_anchor_text = []

    def handle_data(self, data):
        clean_data = data.strip()
        if clean_data:
            self.text_parts.append(clean_data)
        if self._current_href is not None:
            self._current_anchor_text.append(data)

    def get_text(self) -> str:
        return " ".join(self.text_parts)


class EmailParser:
    URL_REGEX = re.compile(
        r'(?:https?://|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))\)|[^\s`!()\[\]{};:\'\".,<>?«»“”‘’])',
        re.IGNORECASE
    )

    @classmethod
    def parse_raw_email(cls, raw_input: str) -> Dict[str, Any]:
        """
        Parses raw email text or RFC 822 format into a structured dictionary.
        Gracefully falls back to heuristic extraction if headers are not strictly formatted.
        """
        if not raw_input or not isinstance(raw_input, str):
            return cls._empty_parsed_email()

        raw_str = raw_input.strip()
        
        # Check if it looks like an RFC 822 message (contains From: or Subject: or Received:)
        try:
            msg = Parser(policy=policy.default).parsestr(raw_str)
            # If msg has standard headers
            if msg["From"] or msg["Subject"] or msg["To"] or msg["Date"]:
                return cls._extract_from_email_message(msg, raw_str)
        except Exception:
            pass

        # Fallback heuristic parser for pasted body/header text
        return cls._heuristic_parse(raw_str)

    @classmethod
    def parse_bytes(cls, raw_bytes: bytes) -> Dict[str, Any]:
        """
        Parses raw bytes from an uploaded .eml file.
        """
        try:
            msg = BytesParser(policy=policy.default).parsebytes(raw_bytes)
            raw_str = raw_bytes.decode("utf-8", errors="replace")
            return cls._extract_from_email_message(msg, raw_str)
        except Exception:
            # Fallback to string decode and heuristic parsing
            raw_str = raw_bytes.decode("utf-8", errors="replace")
            return cls.parse_raw_email(raw_str)

    @classmethod
    def _extract_from_email_message(cls, msg: email.message.EmailMessage, raw_str: str) -> Dict[str, Any]:
        # Sender extraction
        from_header = msg.get("From", "")
        sender_email, display_name = cls._parse_address_header(from_header)

        to_header = msg.get("To", "")
        receiver_email, _ = cls._parse_address_header(to_header)

        reply_to_header = msg.get("Reply-To", "")
        reply_to_email, _ = cls._parse_address_header(reply_to_header)

        subject = msg.get("Subject", "") or ""
        date_header = msg.get("Date", "") or ""
        message_id = msg.get("Message-ID", "") or ""

        # Extract headers dictionary
        headers_dict = {}
        for key in msg.keys():
            headers_dict[key] = msg.get_all(key) if len(msg.get_all(key)) > 1 else msg.get(key)

        # Body and Attachments
        body_text_parts = []
        body_html_parts = []
        attachments = []
        links = []

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))

                if "attachment" in content_disposition:
                    cls._process_attachment_part(part, attachments)
                elif content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            body_text_parts.append(payload.decode("utf-8", errors="replace"))
                    except Exception:
                        pass
                elif content_type == "text/html":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            html_str = payload.decode("utf-8", errors="replace")
                            body_html_parts.append(html_str)
                            # Extract text & links from HTML
                            html_parser = SimpleHTMLTextExtractor()
                            html_parser.feed(html_str)
                            body_text_parts.append(html_parser.get_text())
                            links.extend(html_parser.links)
                    except Exception:
                        pass
                elif "image" in content_type or "application" in content_type:
                    cls._process_attachment_part(part, attachments)
        else:
            content_type = msg.get_content_type()
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    decoded = payload.decode("utf-8", errors="replace")
                    if content_type == "text/html":
                        body_html_parts.append(decoded)
                        html_parser = SimpleHTMLTextExtractor()
                        html_parser.feed(decoded)
                        body_text_parts.append(html_parser.get_text())
                        links.extend(html_parser.links)
                    else:
                        body_text_parts.append(decoded)
                else:
                    body_text_parts.append(str(msg.get_payload()))
            except Exception:
                body_text_parts.append(str(msg.get_payload()))

        full_body_text = "\n".join([p for p in body_text_parts if p]).strip()
        full_body_html = "\n".join([p for p in body_html_parts if p]).strip()

        # If body is still empty, look at the whole raw string
        if not full_body_text and not full_body_html:
            full_body_text = raw_str

        # URLs extraction from text and links
        urls = cls._extract_urls(full_body_text, links, raw_str)

        return {
            "sender": sender_email or cls._regex_find_sender(raw_str),
            "reply_to": reply_to_email or "",
            "display_name": display_name or "",
            "receiver": receiver_email or cls._regex_find_receiver(raw_str),
            "subject": subject or cls._regex_find_subject(raw_str),
            "date": date_header,
            "message_id": message_id,
            "body": full_body_text,
            "html": full_body_html,
            "headers": headers_dict,
            "urls": urls,
            "links": [{"text": l[0], "url": l[1]} for l in links],
            "attachments": attachments,
            "raw_content": raw_str
        }

    @classmethod
    def _heuristic_parse(cls, raw_str: str) -> Dict[str, Any]:
        """
        Parses informal email text such as:
        From: security@paypa1-login.com
        Subject: Alert
        Body text...
        URL: http://...
        """
        sender = cls._regex_find_sender(raw_str)
        subject = cls._regex_find_subject(raw_str)
        receiver = cls._regex_find_receiver(raw_str)
        reply_to = cls._regex_find_reply_to(raw_str)

        # Remove header lines from body
        body_lines = []
        for line in raw_str.splitlines():
            line_s = line.strip()
            if re.match(r'^(from|to|subject|reply-to|date|url|attachment):\s*', line_s, re.I):
                continue
            body_lines.append(line)
        
        body_text = "\n".join(body_lines).strip()
        if not body_text:
            body_text = raw_str

        # Find all URLs in raw text
        urls = cls._extract_urls(raw_str, [], raw_str)
        
        # Find explicit attachments mentioned in text (e.g. Attachment: invoice.pdf.exe)
        attachments = []
        att_matches = re.findall(r'(?:attachment|attached|file):\s*([a-zA-Z0-9_\-\.\s]+\.[a-zA-Z0-9]{2,5})', raw_str, re.I)
        for att in att_matches:
            att_clean = att.strip()
            ext = att_clean.split(".")[-1] if "." in att_clean else ""
            attachments.append({
                "filename": att_clean,
                "extension": ext,
                "content_type": f"application/{ext}",
                "size_bytes": 0,
                "sha256": hashlib.sha256(att_clean.encode()).hexdigest()
            })

        return {
            "sender": sender,
            "reply_to": reply_to,
            "display_name": "",
            "receiver": receiver,
            "subject": subject,
            "date": "",
            "message_id": "",
            "body": body_text,
            "html": "",
            "headers": {},
            "urls": urls,
            "links": [],
            "attachments": attachments,
            "raw_content": raw_str
        }

    @classmethod
    def _parse_address_header(cls, header_val: str) -> Tuple[str, str]:
        if not header_val:
            return "", ""
        parsed = email.utils.parseaddr(header_val)
        display_name = parsed[0].strip() if parsed[0] else ""
        email_addr = parsed[1].strip() if parsed[1] else ""
        return email_addr, display_name

    @classmethod
    def _process_attachment_part(cls, part, attachments: List[Dict[str, Any]]):
        filename = part.get_filename() or "unnamed_attachment"
        content_type = part.get_content_type()
        payload = part.get_payload(decode=True)
        size_bytes = len(payload) if payload else 0
        sha256_hash = hashlib.sha256(payload).hexdigest() if payload else ""

        ext = filename.split(".")[-1].lower() if "." in filename else ""

        attachments.append({
            "filename": filename,
            "extension": ext,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "sha256": sha256_hash
        })

    @classmethod
    def _extract_urls(cls, body: str, links: List[Tuple[str, str]], raw_str: str) -> List[str]:
        found_urls = set()

        # From explicit links
        for _, url in links:
            if url and url.startswith(("http://", "https://", "ftp://")):
                found_urls.add(url.strip())

        # From text via regex
        for text in [body, raw_str]:
            for match in cls.URL_REGEX.finditer(text):
                url = match.group(0).strip()
                # Normalize if starts with www.
                if url.startswith("www."):
                    url = "http://" + url
                found_urls.add(url)

        # Look for explicit URL: or Link: lines
        explicit_urls = re.findall(r'(?:url|link|href):\s*(https?://[^\s]+)', raw_str, re.I)
        for u in explicit_urls:
            found_urls.add(u.strip())

        return list(found_urls)

    @classmethod
    def _regex_find_sender(cls, text: str) -> str:
        m = re.search(r'From:\s*(?:[^\n<]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?', text, re.I)
        if m:
            return m.group(1).strip()
        # Look for standalone email pattern
        m2 = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', text)
        return m2.group(0).strip() if m2 else ""

    @classmethod
    def _regex_find_receiver(cls, text: str) -> str:
        m = re.search(r'To:\s*(?:[^\n<]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?', text, re.I)
        return m.group(1).strip() if m else ""

    @classmethod
    def _regex_find_reply_to(cls, text: str) -> str:
        m = re.search(r'Reply-To:\s*(?:[^\n<]*<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?', text, re.I)
        return m.group(1).strip() if m else ""

    @classmethod
    def _regex_find_subject(cls, text: str) -> str:
        m = re.search(r'Subject:\s*([^\n\r]+)', text, re.I)
        return m.group(1).strip() if m else ""

    @classmethod
    def _empty_parsed_email(cls) -> Dict[str, Any]:
        return {
            "sender": "",
            "reply_to": "",
            "display_name": "",
            "receiver": "",
            "subject": "",
            "date": "",
            "message_id": "",
            "body": "",
            "html": "",
            "headers": {},
            "urls": [],
            "links": [],
            "attachments": [],
            "raw_content": ""
        }
