# tests/test_resume_pdf_generator.py
import pytest
from app.services.resume_pdf_generator import (
    generate_resume_pdf,
    apply_replacements,
    parse_issue_string,
    is_section_header,
)


def test_parse_issue_string():
    # 3 parts with unicode arrow
    s1 = "Analyzed data → Missing metrics → Fix: Analyzed 2M+ records reducing error rate by 40%"
    p1 = parse_issue_string(s1)
    assert p1["is_structured"] is True
    assert p1["original"] == "Analyzed data"
    assert p1["critique"] == "Missing metrics"
    assert "Analyzed 2M+ records" in p1["fix"]

    # 2 parts with ascii arrow
    s2 = "Managed servers -> Fix: Administered 50+ Linux servers with 99.99% uptime"
    p2 = parse_issue_string(s2)
    assert p2["is_structured"] is True
    assert p2["original"] == "Managed servers"
    assert "Administered 50+ Linux servers" in p2["fix"]

    # Unstructured
    s3 = "Just a general recommendation to improve formatting"
    p3 = parse_issue_string(s3)
    assert p3["is_structured"] is False


def test_apply_replacements():
    text = "Jane Doe\nExperience\n• Built web apps with Django\n• Wrote SQL queries"
    replacements = [
        {
            "original": "Built web apps with Django",
            "fix": "Architected high-throughput Django web applications serving 100k users",
        }
    ]
    replaced = apply_replacements(text, replacements)
    assert "Architected high-throughput Django web applications" in replaced
    assert "Built web apps with Django" not in replaced
    assert "Wrote SQL queries" in replaced


def test_generate_resume_pdf_valid_bytes():
    text = """Alex Smith
San Francisco, CA | 555-0199 | alex@example.com | linkedin.com/in/alexsmith
Summary
Experienced Full Stack Engineer passionate about distributed systems.
Experience
Senior Software Engineer — TechCorp Jan 2023 - Present
• Led migration from monolith to microservices using FastAPI and Kubernetes.
• Wrote database migrations and reduced query latency by 45%.
Education
B.S. in Computer Science — Stanford University 2022
Technical Skills
Python, Go, Docker, PostgreSQL, Redis
"""
    replacements = [
        {
            "original": "Led migration from monolith to microservices using FastAPI and Kubernetes.",
            "fix": "Spearheaded microservices migration slashing API latency by 60% across 12 services.",
        }
    ]

    pdf_bytes = generate_resume_pdf(text, replacements)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")


def test_is_section_header():
    assert is_section_header("Experience") is True
    assert is_section_header("WORK EXPERIENCE:") is True
    assert is_section_header("## Technical Skills") is True
    assert is_section_header("random line about coding") is False


def test_optimized_pdf_endpoint():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.dependencies import get_current_user
    from types import SimpleNamespace
    from unittest.mock import AsyncMock, MagicMock, patch

    test_user = SimpleNamespace(id="user-owner-1", email="user1@example.com")
    resume_record = [{
        "id": "res-123",
        "user_id": "user-owner-1",
        "parsed_content": {
            "raw_text": "Alex Dev\nEmail: alex@dev.com\nExperience\n• Built web apps"
        }
    }]

    mock_sb = MagicMock()
    mock_resume_exec = AsyncMock(return_value=MagicMock(data=resume_record))
    mock_eq2 = MagicMock()
    mock_eq2.execute = mock_resume_exec
    mock_eq1 = MagicMock()
    mock_eq1.eq = MagicMock(return_value=mock_eq2)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq1)
    mock_table = MagicMock()
    mock_table.select = MagicMock(return_value=mock_select)
    mock_sb.table = MagicMock(return_value=mock_table)

    with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock) as mock_get_db:
        mock_get_db.return_value = mock_sb
        app.dependency_overrides[get_current_user] = lambda: test_user
        client = TestClient(app, raise_server_exceptions=False)

        try:
            response = client.post(
                "/api/v1/resumes/res-123/optimized_pdf",
                json={
                    "replacements": [
                        {"original": "Built web apps", "fix": "Engineered high-scale web platforms"}
                    ]
                }
            )
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")

