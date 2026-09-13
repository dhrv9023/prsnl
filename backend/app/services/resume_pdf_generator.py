# app/services/resume_pdf_generator.py
import io
import re
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, KeepTogether, Table, TableStyle

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


# ─────────────────────────────────────────────────────────────────────────────
# Structured Resume PDF Renderer (Resume Editor — Phase 2)
# ─────────────────────────────────────────────────────────────────────────────

def _s(text: object) -> str:
    """Safely escape arbitrary user text for ReportLab XML/Paragraph rendering."""
    return escape(str(text)) if text is not None else ""


def _build_styles(template_id: str) -> dict:
    """
    Returns a dict of named ParagraphStyle objects for the given template.

    Supported templates:
      "classic"   — Traditional single-column ATS layout, bold uppercase headers,
                    Helvetica/Helvetica-Bold, maximum ATS compatibility.
      "modern"    — Contemporary single-column layout, coloured section headers,
                    sans-serif, compact metadata row.
      "minimal"   — Minimalist executive layout, refined charcoal palette,
                    hairline dividers, generous whitespace.
      "technical" — High-density Ivy League / engineering layout, solid accent rules,
                    compact spacing maximizing bullet room.
    """
    styles = getSampleStyleSheet()

    if template_id == "modern":
        accent = colors.HexColor("#2563EB")   # Kareerist blue
        name_color = colors.HexColor("#0F172A")
        title_color = accent
        header_color = accent
        body_color = colors.HexColor("#334155")
        meta_color = colors.HexColor("#64748B")
        name_size = 22
        header_size = 10
        header_case = lambda t: t  # noqa: E731
    elif template_id == "minimal":
        accent = colors.HexColor("#475569")   # Slate charcoal
        name_color = colors.HexColor("#0F172A")
        title_color = colors.HexColor("#64748B")
        header_color = colors.HexColor("#334155")
        body_color = colors.HexColor("#334155")
        meta_color = colors.HexColor("#64748B")
        name_size = 20
        header_size = 9.5
        header_case = lambda t: t.upper()  # noqa: E731
    elif template_id == "technical":
        accent = colors.HexColor("#0D9488")   # Deep teal / engineering accent
        name_color = colors.HexColor("#0F172A")
        title_color = colors.HexColor("#0D9488")
        header_color = colors.HexColor("#0F172A")
        body_color = colors.HexColor("#1E293B")
        meta_color = colors.HexColor("#475569")
        name_size = 18
        header_size = 10
        header_case = lambda t: t.upper()  # noqa: E731
    else:  # "classic"
        accent = colors.black
        name_color = colors.black
        title_color = colors.black
        header_color = colors.black
        body_color = colors.black
        meta_color = colors.black
        name_size = 20
        header_size = 11
        header_case = lambda t: t  # noqa: E731

    is_classic = template_id == "classic"

    return {
        "name": ParagraphStyle(
            "RName",
            parent=styles["Normal"],
            fontName="Times-Bold" if is_classic else "Helvetica-Bold",
            fontSize=name_size,
            leading=name_size + 4,
            textColor=name_color,
            alignment=1 if is_classic else 0,
            spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "RTitle",
            parent=styles["Normal"],
            fontName="Times-Roman" if is_classic else "Helvetica",
            fontSize=10,
            leading=14,
            textColor=title_color,
            alignment=1 if is_classic else 0,
            spaceAfter=2,
        ),
        "contact": ParagraphStyle(
            "RContact",
            parent=styles["Normal"],
            fontName="Times-Roman" if is_classic else "Helvetica",
            fontSize=9 if is_classic else 8.5,
            leading=13 if is_classic else 12,
            textColor=meta_color,
            alignment=1 if is_classic else 0,
            spaceAfter=6 if is_classic else 8,
        ),
        "section": ParagraphStyle(
            "RSection",
            parent=styles["Normal"],
            fontName="Times-Bold" if is_classic else "Helvetica-Bold",
            fontSize=header_size,
            leading=14,
            textColor=header_color,
            spaceBefore=8 if is_classic else 10,
            spaceAfter=1 if is_classic else 2,
            keepWithNext=True,
        ),
        "entry_header": ParagraphStyle(
            "REntryHeader",
            parent=styles["Normal"],
            fontName="Times-Bold" if is_classic else "Helvetica-Bold",
            fontSize=10 if is_classic else 9.5,
            leading=13,
            textColor=colors.black if is_classic else colors.HexColor("#1E293B"),
            spaceBefore=3 if is_classic else 5,
            spaceAfter=1,
            keepWithNext=True,
        ),
        "entry_meta": ParagraphStyle(
            "REntryMeta",
            parent=styles["Normal"],
            fontName="Times-Italic" if is_classic else "Helvetica-Oblique",
            fontSize=9 if is_classic else 8.5,
            leading=12,
            textColor=colors.black if is_classic else meta_color,
            spaceAfter=2 if is_classic else 3,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "RBody",
            parent=styles["Normal"],
            fontName="Times-Roman" if is_classic else "Helvetica",
            fontSize=9.5 if is_classic else 9,
            leading=13.5 if is_classic else 13,
            textColor=body_color,
            spaceAfter=2 if is_classic else 3,
        ),
        "bullet": ParagraphStyle(
            "RBullet",
            parent=styles["Normal"],
            fontName="Times-Roman" if is_classic else "Helvetica",
            fontSize=9 if is_classic else 8.5,
            leading=12.5,
            textColor=body_color,
            leftIndent=14,
            firstLineIndent=-10,
            spaceAfter=1.5 if is_classic else 2.5,
        ),
        "skills_label": ParagraphStyle(
            "RSkillsLabel",
            parent=styles["Normal"],
            fontName="Times-Bold" if is_classic else "Helvetica-Bold",
            fontSize=9 if is_classic else 8.5,
            leading=12,
            textColor=body_color,
            spaceAfter=2,
        ),
        "_header_case": header_case,
        "_accent": accent,
        "_template": template_id,
    }


def _section_divider(styles: dict) -> list:
    """Return the appropriate section divider flowables for the template."""
    tmpl = styles["_template"]
    if tmpl == "modern":
        # Thin coloured rule (blue accent)
        return [
            HRFlowable(
                width="100%",
                thickness=1.5,
                color=styles["_accent"],
                spaceBefore=1,
                spaceAfter=4,
            )
        ]
    elif tmpl == "minimal":
        # Subtle hairline separator
        return [
            HRFlowable(
                width="100%",
                thickness=0.5,
                color=colors.HexColor("#CBD5E1"),
                spaceBefore=1,
                spaceAfter=4,
            )
        ]
    elif tmpl == "technical":
        # Crisp solid rule for engineering density
        return [
            HRFlowable(
                width="100%",
                thickness=1.0,
                color=styles["_accent"],
                spaceBefore=1,
                spaceAfter=3,
            )
        ]
    else:  # classic
        return [
            HRFlowable(
                width="100%",
                thickness=0.8,
                color=colors.black,
                spaceBefore=0.5,
                spaceAfter=3,
            )
        ]


def _render_section_header(title: str, styles: dict) -> list:
    """Render a labelled section header followed by the template's divider."""
    case_fn = styles["_header_case"]
    return [
        Paragraph(_s(case_fn(title)), styles["section"]),
        *_section_divider(styles),
    ]


def _format_markdown_bold(text: str) -> str:
    """Escapes XML and converts markdown **word** to <b>word</b> for ReportLab."""
    escaped = _s(text)
    return re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", escaped)


def _render_bullets(bullets: list[dict], styles: dict) -> list:
    """Render a list of ResumeBullet dicts as indented bullet paragraphs."""
    flowables = []
    for b in bullets:
        text = (b.get("text") or "").strip()
        if text:
            flowables.append(Paragraph(f"&bull; {_format_markdown_bold(text)}", styles["bullet"]))
    return flowables


def _render_contact_line(basics: dict, template_id: str = "classic") -> str:
    """Build a pipe-separated contact string from basics fields."""
    parts = []
    if template_id == "classic":
        for field in ("location", "phone", "email"):
            val = (basics.get(field) or "").strip()
            if val:
                parts.append(_s(val))
        for field, label in (("linkedin", "LinkedIn"), ("github", "GitHub"), ("portfolio", "Portfolio")):
            val = (basics.get(field) or "").strip()
            if val:
                url = val if val.startswith("http") else f"https://{val}"
                parts.append(f'<a href="{url}" color="black">{label}</a>')
    else:
        for field in ("email", "phone", "location", "linkedin", "github", "portfolio"):
            val = (basics.get(field) or "").strip()
            if val:
                parts.append(_s(val))
    return " &nbsp;|&nbsp; ".join(parts)


# ── Section renderers ─────────────────────────────────────────────────────────

def _render_summary(basics: dict, styles: dict) -> list:
    summary = (basics.get("summary") or "").strip()
    if not summary:
        return []
    header_name = "Summary" if styles.get("_template") == "classic" else "Professional Summary"
    return [
        *_render_section_header(header_name, styles),
        Paragraph(_format_markdown_bold(summary), styles["body"]),
    ]


def _render_experience(items: list[dict], styles: dict) -> list:
    if not items:
        return []
    flowables: list = [*_render_section_header("Experience", styles)]
    is_classic = styles.get("_template") == "classic"
    for item in items:
        company = _s(item.get("company") or "")
        role = _s(item.get("role") or "")
        location = _s(item.get("location") or "")
        start = _s(item.get("start_date") or "")
        end = _s("Present" if item.get("current") else item.get("end_date") or "")
        date_range = " \u2013 ".join(p for p in [start, end] if p)

        all_bullets = _render_bullets(item.get("bullets") or [], styles)

        if is_classic:
            left_parts = []
            if role:
                left_parts.append(f"<b>{role}</b>")
            if company:
                left_parts.append(f"— <b>{company}</b>" if role else f"<b>{company}</b>")
            if location:
                left_parts.append(f", {location}")
            left_html = " ".join(left_parts)
            right_html = f'<para align="right">{date_range}</para>' if date_range else ""

            p_left = Paragraph(left_html, styles["entry_header"])
            p_right = Paragraph(right_html, styles["entry_meta"])
            table = Table([[p_left, p_right]], colWidths=[410, 130])
            table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ]))
            flowables.append(KeepTogether([table] + all_bullets[:1]))
            flowables.extend(all_bullets[1:])
        else:
            meta_parts = [p for p in [company, location] if p]
            meta_line = "  &nbsp;&bull;&nbsp;  ".join(meta_parts)
            if date_range:
                meta_line = (
                    f"{meta_line}   <i>{date_range}</i>" if meta_line else f"<i>{date_range}</i>"
                )
            anchor = [
                Paragraph(role, styles["entry_header"]),
                Paragraph(meta_line, styles["entry_meta"]),
            ] + all_bullets[:1]
            flowables.append(KeepTogether(anchor))
            flowables.extend(all_bullets[1:])

    return flowables


def _render_education(items: list[dict], styles: dict) -> list:
    if not items:
        return []
    flowables: list = [*_render_section_header("Education", styles)]
    is_classic = styles.get("_template") == "classic"
    for item in items:
        institution = _s(item.get("institution") or "")
        degree = _s(item.get("degree") or "")
        field = _s(item.get("field_of_study") or "")
        location = _s(item.get("location") or "")
        start = _s(item.get("start_date") or "")
        end = _s(item.get("end_date") or "")
        gpa = _s(item.get("gpa") or "")

        degree_line = f"{degree} in {field}".strip() if field else degree
        if gpa and ("%" in degree_line or "gpa" in degree_line.lower()):
            pass
        elif gpa:
            degree_line = f"{degree_line} — {gpa}"
        date_range = " – ".join(p for p in [start, end] if p)

        if is_classic:
            p_left = Paragraph(f"<b>{degree_line}</b>", styles["entry_header"])
            p_right = Paragraph(f'<para align="right">{date_range}</para>', styles["entry_meta"])
            table = Table([[p_left, p_right]], colWidths=[410, 130])
            table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ]))
            inst_line = f"{institution}{', ' + location if location else ''}"
            entry = [table, Paragraph(inst_line, styles["body"])]
            flowables.append(KeepTogether(entry))
        else:
            meta_parts = [p for p in [institution, location] if p]
            if gpa:
                date_range = f"{date_range}   GPA: {gpa}".strip("   ")
            meta_line = "  &nbsp;&bull;&nbsp;  ".join(meta_parts)
            if date_range:
                meta_line = f"{meta_line}   <i>{date_range}</i>" if meta_line else f"<i>{date_range}</i>"

            flowables.extend([
                KeepTogether([
                    Paragraph(degree_line, styles["entry_header"]),
                    Paragraph(meta_line, styles["entry_meta"]),
                ]),
                *_render_bullets(item.get("bullets") or [], styles),
            ])
    return flowables


def _render_skills(categories: list[dict], styles: dict) -> list:
    if not categories:
        return []
    is_classic = styles.get("_template") == "classic"
    header_name = "Technical Skills" if is_classic else "Skills"
    flowables: list = [*_render_section_header(header_name, styles)]
    for cat in categories:
        label = _s(cat.get("category") or "")
        items = [_s(i) for i in (cat.get("items") or []) if i]
        if not items:
            continue
        sep = " &middot; " if is_classic else ",  "
        items_str = sep.join(items)
        if label and label.lower() not in ("general", ""):
            line = f"<b>{label}:</b>  {items_str}"
        else:
            line = items_str
        flowables.append(Paragraph(line, styles["body"]))
    return flowables


def _render_projects(items: list[dict], styles: dict) -> list:
    if not items:
        return []
    flowables: list = [*_render_section_header("Projects", styles)]
    is_classic = styles.get("_template") == "classic"
    for item in items:
        name = _s(item.get("name") or "")
        desc = _s(item.get("description") or "")
        link = _s(item.get("link") or "")
        techs = [_s(t) for t in (item.get("technologies") or []) if t]

        if is_classic:
            left_html = f"<b>{name}</b>"
            if desc:
                left_html += f" — <b>{desc}</b>"
            right_html = f'<para align="right"><i>{link}</i></para>' if link else ""
            p_left = Paragraph(left_html, styles["entry_header"])
            p_right = Paragraph(right_html, styles["entry_meta"])
            table = Table([[p_left, p_right]], colWidths=[410, 130])
            table.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 1),
                ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ]))
            entry = [table]
            if techs:
                tech_line = ", ".join(techs)
                entry.append(Paragraph(f"<i>{tech_line}</i>", styles["entry_meta"]))
            bullets = _render_bullets(item.get("bullets") or [], styles)
            flowables.append(KeepTogether(entry + bullets[:1]))
            flowables.extend(bullets[1:])
        else:
            title_line = f"<b>{name}</b>"
            if link:
                title_line += f"  —  <i>{link}</i>"

            meta_parts = []
            if techs:
                meta_parts.append(", ".join(techs))
            meta_line = " &nbsp;|&nbsp; ".join(meta_parts) if meta_parts else ""

            entry = [Paragraph(title_line, styles["entry_header"])]
            if meta_line:
                entry.append(Paragraph(meta_line, styles["entry_meta"]))
            bullets = _render_bullets(item.get("bullets") or [], styles)
            flowables.append(KeepTogether(entry + bullets[:1]))
            flowables.extend(bullets[1:])
    return flowables


def _render_certifications(items: list[dict], styles: dict) -> list:
    if not items:
        return []
    flowables: list = [*_render_section_header("Certifications", styles)]
    is_classic = styles.get("_template") == "classic"
    for item in items:
        name = _s(item.get("name") or "")
        issuer = _s(item.get("issuer") or "")
        date = _s(item.get("date") or "")

        if is_classic:
            cert_text = name
            if issuer and issuer.lower() not in name.lower():
                cert_text = f"{name} — {issuer}"
            if date:
                p_left = Paragraph(cert_text, styles["body"])
                p_right = Paragraph(f'<para align="right">{date}</para>', styles["entry_meta"])
                table = Table([[p_left, p_right]], colWidths=[420, 120])
                table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0.5),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
                ]))
                flowables.append(table)
            else:
                flowables.append(Paragraph(cert_text, styles["body"]))
        else:
            meta_parts = [p for p in [issuer, date] if p]
            meta_line = "  &nbsp;&bull;&nbsp;  ".join(meta_parts)
            flowables.extend([
                KeepTogether([
                    Paragraph(name, styles["entry_header"]),
                    Paragraph(meta_line, styles["entry_meta"]) if meta_line else Spacer(1, 2),
                ])
            ])
    return flowables


_SECTION_RENDERERS = {
    "summary": lambda data, styles: _render_summary(data.get("basics", {}), styles),
    "experience": lambda data, styles: _render_experience(data.get("experience") or [], styles),
    "education": lambda data, styles: _render_education(data.get("education") or [], styles),
    "skills": lambda data, styles: _render_skills(data.get("skills") or [], styles),
    "projects": lambda data, styles: _render_projects(data.get("projects") or [], styles),
    "certifications": lambda data, styles: _render_certifications(data.get("certifications") or [], styles),
}


# ── Public entry point ────────────────────────────────────────────────────────

def render_structured_resume_pdf(resume_data: dict, template_id: str = "classic") -> bytes:
    """
    Renders a StructuredResume dictionary into an ATS-compliant, professionally
    styled PDF using ReportLab Platypus.

    Args:
        resume_data: A dict matching the StructuredResume schema (as returned by
                     StructuredResume.to_editor_dict() or the parser).
        template_id: "classic" (default) or "modern". Controls typographic style.

    Returns:
        Raw PDF bytes suitable for streaming directly to the client.

    Safety:
        All user-supplied text is passed through xml.sax.saxutils.escape()
        before being wrapped in ReportLab Paragraph flowables. This prevents
        XML parse crashes from characters like &, <, >, ", '.
    """
    if template_id not in ("classic", "modern"):
        template_id = "classic"

    styles = _build_styles(template_id)
    basics: dict = resume_data.get("basics") or {}
    meta: dict = resume_data.get("meta") or {}
    section_order: list[str] = meta.get("section_order") or [
        "summary", "experience", "education", "skills", "projects", "certifications"
    ]

    # Page margins: compact / normal / spacious
    _margins = {"compact": 28, "normal": 36, "spacious": 50}
    margin_pt = _margins.get(str(meta.get("margins", "normal")), 36)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=margin_pt,
        rightMargin=margin_pt,
        topMargin=margin_pt,
        bottomMargin=margin_pt,
    )

    story: list = []

    # ── Document header ──────────────────────────────────────────────────────
    name = (basics.get("name") or "").strip()
    title_text = (basics.get("title") or "").strip()
    contact_line = _render_contact_line(basics, template_id=template_id)

    if name:
        story.append(Paragraph(_s(name), styles["name"]))
    if title_text:
        story.append(Paragraph(_s(title_text), styles["title"]))
    if contact_line:
        story.append(Paragraph(contact_line, styles["contact"]))
    elif name:
        story.append(Spacer(1, 6))

    # ── Sections in user-defined order ───────────────────────────────────────
    for section_key in section_order:
        renderer = _SECTION_RENDERERS.get(section_key)
        if renderer:
            section_flowables = renderer(resume_data, styles)
            story.extend(section_flowables)

    if not story:
        story.append(Paragraph("Resume content is empty.", styles["body"]))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
