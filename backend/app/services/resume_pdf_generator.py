# app/services/resume_pdf_generator.py
import io
import re
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable

SECTION_KEYWORDS = {
    "summary", "professional summary", "profile", "about me", "executive summary",
    "experience", "work experience", "professional experience", "employment history",
    "projects", "technical projects", "key projects", "academic projects", "personal projects",
    "education", "academic background", "education & certifications", "qualifications",
    "skills", "technical skills", "core competencies", "skills & tools", "skills & abilities",
    "certifications", "licenses & certifications", "courses", "certificates",
    "achievements", "awards", "honors", "publications", "leadership", "extracurricular"
}


def is_section_header(line: str) -> bool:
    clean = re.sub(r"[:\-_#*]", "", line).strip().lower()
    return clean in SECTION_KEYWORDS


def parse_issue_string(text: str) -> dict:
    """
    Parses a string formatted as:
    Original bullet → Critique → Fix: ...
    or
    Original bullet -> Fix: ...
    """
    if not text or not isinstance(text, str):
        return {"original": "", "critique": "", "fix": "", "is_structured": False}

    parts = re.split(r"\s*→\s*|\s*->\s*", text)
    if len(parts) >= 3:
        clean = lambda s: s.strip().strip("'\"`[]")
        return {
            "original": clean(parts[0]),
            "critique": clean(parts[1]),
            "fix": clean(" → ".join(parts[2:])),
            "is_structured": True,
        }
    elif len(parts) == 2:
        clean = lambda s: s.strip().strip("'\"`[]")
        return {
            "original": clean(parts[0]),
            "critique": "",
            "fix": clean(parts[1]),
            "is_structured": True,
        }

    return {"original": "", "critique": "", "fix": "", "is_structured": False}


def apply_replacements(text: str, replacements: list[dict] | None) -> str:
    """
    Replaces original weak bullets in resume_text with their AI-improved versions.
    Handles exact matches, whitespace variations, and common bullet prefixes.
    """
    if not replacements or not text:
        return text or ""

    result = text
    for rep in replacements:
        orig = rep.get("original", "").strip()
        fix = rep.get("fix", "").strip()
        if not orig or not fix:
            continue

        # Clean AI action prefixes (e.g. "Fix:", "Rewrite:", "Add:")
        clean_fix = re.sub(r"^(?:Add|Rewrite|Fix):\s*", "", fix, flags=re.I).strip()

        # Clean leading bullet symbol on orig if present
        clean_orig = re.sub(r"^[\u2022\u25E6\u25AA\-\*]\s*", "", orig).strip()

        # 1. Direct match with exact original string
        if orig in result:
            result = result.replace(orig, clean_fix, 1)
            continue

        # 2. Match with cleaned original string (stripped bullet symbol)
        if clean_orig and clean_orig in result:
            result = result.replace(clean_orig, clean_fix, 1)
            continue

        # 3. Whitespace-normalized regex match
        norm_orig = " ".join(clean_orig.split())
        norm_result = " ".join(result.split())
        if norm_orig and norm_orig in norm_result:
            escaped = re.escape(clean_orig)
            regex_str = re.sub(r"\\\s+", r"\\s+", escaped)
            try:
                result = re.sub(regex_str, lambda m: clean_fix, result, count=1, flags=re.I)
            except Exception:
                pass

    return result


def generate_resume_pdf(resume_text: str, replacements: list[dict] | None = None) -> bytes:
    """
    Applies AI fixes to resume_text and renders an ATS-compliant, professionally styled PDF.
    Returns the binary content (bytes) of the generated PDF document.
    """
    text = apply_replacements(resume_text or "", replacements)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Define custom ATS-friendly typography styles
    name_style = ParagraphStyle(
        "ResumeName",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        alignment=0,
        spaceAfter=2,
    )

    contact_style = ParagraphStyle(
        "ResumeContact",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#475569"),
        alignment=0,
        spaceAfter=8,
    )

    section_style = ParagraphStyle(
        "ResumeSection",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True,
    )

    job_title_style = ParagraphStyle(
        "ResumeJobTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "ResumeBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=3,
    )

    bullet_style = ParagraphStyle(
        "ResumeBullet",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=2.5,
    )

    story = []
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    if not lines:
        story.append(Paragraph("Resume text is empty.", body_style))
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

    # First line: Name
    name_line = lines[0]
    story.append(Paragraph(escape(name_line), name_style))

    # Second line: Contact details if it looks like contact info
    idx = 1
    if len(lines) > 1:
        second_line = lines[1]
        if any(token in second_line.lower() for token in ["@", "|", "+", "linkedin", "github", "phone", "email", ".com", ".me", ".io", ".dev"]):
            story.append(Paragraph(escape(second_line), contact_style))
            idx = 2
        else:
            story.append(Spacer(1, 4))

    # Process remaining lines
    for line in lines[idx:]:
        if is_section_header(line):
            clean_hdr = re.sub(r"[:\-_#*]", "", line).strip().upper()
            story.append(Spacer(1, 5))
            story.append(Paragraph(escape(clean_hdr), section_style))
            story.append(HRFlowable(
                width="100%",
                thickness=0.75,
                color=colors.HexColor("#CBD5E1"),
                spaceBefore=1,
                spaceAfter=4,
            ))
            continue

        # Bullet line
        if re.match(r"^[\u2022\u25E6\u25AA\-\*]\s*", line) or line.startswith("&bull;"):
            clean_bullet = re.sub(r"^[\u2022\u25E6\u25AA\-\*]\s*", "", line).strip()
            bullet_html = f"&bull; {escape(clean_bullet)}"
            story.append(Paragraph(bullet_html, bullet_style))
            continue

        # Subheading / Job title (e.g. contains "—" or " - " or dates like "2024", "Present")
        if ("—" in line or " - " in line or "|" in line) and len(line) < 100:
            story.append(Paragraph(escape(line), job_title_style))
            continue

        # Regular body paragraph
        story.append(Paragraph(escape(line), body_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
