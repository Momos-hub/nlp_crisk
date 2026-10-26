"""Document parsers — TXT/MD, PDF, DOCX -> plain text."""
import io


def extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _from_pdf(data)
    if name.endswith(".docx"):
        return _from_docx(data)
    # txt / md / unknown -> decode
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _from_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:
        raise RuntimeError("PDF support requires 'pypdf' — pip install pypdf")
    reader = PdfReader(io.BytesIO(data))
    pages = [(page.extract_text() or "") for page in reader.pages]
    return "\n\n".join(p.strip() for p in pages if p.strip())


def _from_docx(data: bytes) -> str:
    try:
        import docx
    except ImportError:
        raise RuntimeError("DOCX support requires 'python-docx' — pip install python-docx")
    document = docx.Document(io.BytesIO(data))
    return "\n\n".join(p.text.strip() for p in document.paragraphs if p.text.strip())
