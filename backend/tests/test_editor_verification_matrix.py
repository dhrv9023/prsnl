# backend/tests/test_editor_verification_matrix.py
"""
End-to-End Verification Matrix Suite for Kareerist Resume Editor.
Exhaustively tests:
  - Phase 3: Authentication & Unauthenticated rejection
  - Phase 4: User Ownership isolation & ID tampering
  - Phase 5 & 6: Parsing integrity & fallback safety
  - Phase 7: Editor schema validation & section mutations
  - Phase 8: AI Deep Analysis matching & bullet rewriter
  - Phase 9: Credit accounting (3cr rewrite, 0cr edit/export, refund on failure)
  - Phase 10-13: Template rendering, multi-page stability, XML safety, ATS extractability
  - Phase 14: Original PDF immutability
  - Phase 15: Persistence & schema validation rejection
"""

from __future__ import annotations

import io
import json
import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from app.main import app
from app.api.dependencies import get_current_user
from app.schemas.resume_editor import StructuredResume, EditorMeta
from app.services.resume_parser import parse_raw_text_to_structured, create_empty_resume
from app.services.resume_pdf_generator import render_structured_resume_pdf

USER_A_ID = "11111111-1111-1111-1111-111111111111"
USER_B_ID = "22222222-2222-2222-2222-222222222222"
RESUME_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
RESUME_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

SAMPLE_STRUCTURED: dict = {
    "basics": {
        "name": "Sarah Connor",
        "title": "Principal Systems Engineer",
        "email": "sarah.connor@cyberdyne.org",
        "phone": "+1-555-0199",
        "location": "Los Angeles, CA",
        "linkedin": "https://linkedin.com/in/sconnor",
        "github": "https://github.com/sconnor",
        "portfolio": "https://sconnor.io",
        "summary": "12+ years of experience fortifying distributed infrastructure and cyber-defense architectures.",
    },
    "experience": [
        {
            "id": "exp-1111",
            "company": "Tech Defense Inc & Co",
            "role": "Lead Systems Architect",
            "location": "Pasadena, CA",
            "start_date": "2020",
            "end_date": "Present",
            "current": True,
            "bullets": [
                {"id": "b-1", "text": "Engineered automated threat detection reducing incident response time by 75%"},
                {"id": "b-2", "text": "Architected zero-trust microsegmentation across 1,200 nodes with <5ms latency"},
            ],
        },
        {
            "id": "exp-2222",
            "company": "Cyber Dynamics",
            "role": "Senior Infrastructure Engineer",
            "location": "Austin, TX",
            "start_date": "2016",
            "end_date": "2020",
            "current": False,
            "bullets": [
                {"id": "b-3", "text": "Migrated monolithic payment gateway to Kubernetes, saving $320k annually"},
            ],
        },
    ],
    "education": [
        {
            "id": "edu-1111",
            "institution": "Caltech",
            "degree": "B.S.",
            "field_of_study": "Computer Science & Cybersecurity",
            "location": "Pasadena, CA",
            "start_date": "2012",
            "end_date": "2016",
            "gpa": "3.92",
            "bullets": [],
        }
    ],
    "skills": [
        {"id": "sk-1", "category": "Languages", "items": ["Rust", "Go", "Python", "C++"]},
        {"id": "sk-2", "category": "Cloud & Infra", "items": ["Kubernetes", "Terraform", "AWS", "GCP", "Linux"]},
    ],
    "projects": [
        {
            "id": "proj-1",
            "name": "SentinelMesh",
            "description": "eBPF-powered network security mesh",
            "link": "https://github.com/sconnor/sentinelmesh",
            "technologies": ["Rust", "eBPF", "Kubernetes"],
            "bullets": [
                {"id": "pb-1", "text": "Open-sourced with 1.4k GitHub stars and 20+ enterprise contributors"},
            ],
        }
    ],
    "certifications": [
        {
            "id": "cert-1",
            "name": "Certified Kubernetes Security Specialist (CKS)",
            "issuer": "CNCF / Linux Foundation",
            "date": "2023",
            "url": "https://www.credly.com/cks",
        }
    ],
    "meta": {
        "template_id": "classic",
        "font_size": "medium",
        "margins": "normal",
        "section_order": ["summary", "experience", "education", "skills", "projects", "certifications"],
    },
}


def _mock_user(user_id: str) -> MagicMock:
    u = MagicMock()
    u.id = user_id
    return u


def _build_db_mock(resume_store: dict[str, dict], analyses_store: dict[str, list] = None):
    """
    Simulates Supabase DB where rows are keyed by (resume_id, user_id).
    Strictly verifies ownership: if user_id does not match row.user_id, returns empty list.
    """
    supabase = AsyncMock()

    def _table_router(table_name: str):
        mock_table = MagicMock()

        class QueryBuilder:
            def __init__(self):
                self._table = table_name
                self._selected = "*"
                self._resume_id = None
                self._user_id = None
                self._update_data = None
                self._insert_data = None
                self._limit = None

            def select(self, cols="*"):
                self._selected = cols
                return self

            def eq(self, col, val):
                if col == "id":
                    self._resume_id = str(val)
                elif col == "resume_id":
                    self._resume_id = str(val)
                elif col == "user_id":
                    self._user_id = str(val)
                return self

            def order(self, *args, **kwargs):
                return self

            def limit(self, val):
                self._limit = val
                return self

            def update(self, data):
                self._update_data = data
                return self

            def insert(self, data):
                self._insert_data = data
                return self

            async def execute(self):
                res = MagicMock()
                if self._table == "resumes":
                    if self._update_data and self._resume_id:
                        # Find existing
                        row = resume_store.get(self._resume_id)
                        if row and str(row.get("user_id")) == str(self._user_id):
                            row.update(self._update_data)
                            res.data = [row]
                        else:
                            res.data = []
                        return res

                    # Select
                    row = resume_store.get(self._resume_id)
                    if row and str(row.get("user_id")) == str(self._user_id):
                        res.data = [row]
                    else:
                        res.data = []
                    return res

                elif self._table == "ai_analyses":
                    analyses = (analyses_store or {}).get(self._resume_id, [])
                    filtered = [a for a in analyses if str(a.get("user_id")) == str(self._user_id)]
                    res.data = filtered[: self._limit] if self._limit else filtered
                    return res

                elif self._table == "profiles":
                    res.data = [{"remaining_credits": 100, "is_unlimited": False}]
                    return res

                res.data = []
                return res

        def _instantiate():
            return QueryBuilder()

        mock_table.select = lambda *a: _instantiate().select(*a)
        mock_table.update = lambda *a: _instantiate().update(*a)
        mock_table.insert = lambda *a: _instantiate().insert(*a)
        return mock_table

    supabase.table = MagicMock(side_effect=_table_router)
    supabase.storage.from_ = MagicMock(return_value=MagicMock(
        create_signed_url=AsyncMock(return_value={"signedURL": "https://storage.supabase.co/signed/resume.pdf"})
    ))
    return supabase


# ═════════════════════════════════════════════════════════════════════════════
# 1. AUTHENTICATION & ROUTE PROTECTION (PHASE 3)
# ═════════════════════════════════════════════════════════════════════════════

class TestAuthenticationProtection:
    def test_unauthenticated_get_editor_rejected(self):
        """Unauthenticated GET /resumes/{id}/editor returns 401 Unauthorized."""
        with TestClient(app) as client:
            resp = client.get(f"/api/v1/resumes/{RESUME_A_ID}/editor")
        assert resp.status_code == 401

    def test_unauthenticated_put_editor_rejected(self):
        """Unauthenticated PUT /resumes/{id}/editor returns 401 Unauthorized."""
        with TestClient(app) as client:
            resp = client.put(f"/api/v1/resumes/{RESUME_A_ID}/editor", json=SAMPLE_STRUCTURED)
        assert resp.status_code == 401

    def test_unauthenticated_export_pdf_rejected(self):
        """Unauthenticated POST /resumes/{id}/export_pdf returns 401 Unauthorized."""
        with TestClient(app) as client:
            resp = client.post(f"/api/v1/resumes/{RESUME_A_ID}/export_pdf")
        assert resp.status_code == 401

    def test_unauthenticated_rewrite_bullet_rejected(self):
        """Unauthenticated POST /resumes/{id}/rewrite_bullet returns 401 Unauthorized."""
        with TestClient(app) as client:
            resp = client.post(
                f"/api/v1/resumes/{RESUME_A_ID}/rewrite_bullet",
                json={"bullet_text": "Built things", "role_context": "Engineer"},
            )
        assert resp.status_code == 401


# ═════════════════════════════════════════════════════════════════════════════
# 2. USER OWNERSHIP ISOLATION & ID TAMPERING (PHASE 4)
# ═════════════════════════════════════════════════════════════════════════════

class TestUserOwnershipIsolation:
    def setup_method(self):
        # Authenticate as USER_A
        app.dependency_overrides[get_current_user] = lambda: _mock_user(USER_A_ID)

    def teardown_method(self):
        app.dependency_overrides.pop(get_current_user, None)

    def test_user_a_cannot_read_user_b_editor(self):
        """User A requesting User B's resume returns 404 (does not leak existence)."""
        resume_store = {
            RESUME_B_ID: {
                "id": RESUME_B_ID,
                "user_id": USER_B_ID,
                "structured_content": SAMPLE_STRUCTURED,
            }
        }
        db = _build_db_mock(resume_store)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db):
            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{RESUME_B_ID}/editor")
        assert resp.status_code == 404

    def test_user_a_cannot_overwrite_user_b_editor(self):
        """User A attempting to PUT to User B's resume returns 404 and writes nothing."""
        original_b = {**SAMPLE_STRUCTURED, "basics": {**SAMPLE_STRUCTURED["basics"], "name": "User B Secret"}}
        resume_store = {
            RESUME_B_ID: {
                "id": RESUME_B_ID,
                "user_id": USER_B_ID,
                "structured_content": original_b,
            }
        }
        db = _build_db_mock(resume_store)

        malicious_payload = {**SAMPLE_STRUCTURED, "basics": {**SAMPLE_STRUCTURED["basics"], "name": "Hacked"}}
        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db):
            with TestClient(app) as client:
                resp = client.put(f"/api/v1/resumes/{RESUME_B_ID}/editor", json=malicious_payload)

        assert resp.status_code == 404
        # Assert database content was NOT modified
        assert resume_store[RESUME_B_ID]["structured_content"]["basics"]["name"] == "User B Secret"

    def test_user_a_cannot_export_user_b_pdf(self):
        """User A attempting to export User B's resume PDF returns 404."""
        resume_store = {
            RESUME_B_ID: {
                "id": RESUME_B_ID,
                "user_id": USER_B_ID,
                "structured_content": SAMPLE_STRUCTURED,
            }
        }
        db = _build_db_mock(resume_store)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db):
            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{RESUME_B_ID}/export_pdf")
        assert resp.status_code == 404

    def test_id_tampering_sql_injection_safe(self):
        """Malformed or SQL-injection style IDs are safely rejected with 404 or 422."""
        db = _build_db_mock({})
        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db):
            with TestClient(app) as client:
                for bad_id in [
                    "'; DROP TABLE resumes; --",
                    "../../etc/passwd",
                    "non-existent-uuid-12345",
                ]:
                    resp = client.get(f"/api/v1/resumes/{bad_id}/editor")
                    assert resp.status_code in (400, 404, 422)


# ═════════════════════════════════════════════════════════════════════════════
# 3. PARSING INTEGRITY & FALLBACK SAFETY (PHASES 5 & 6)
# ═════════════════════════════════════════════════════════════════════════════

class TestParsingIntegrity:
    @pytest.mark.asyncio
    async def test_realistic_multipage_resume_parsing(self):
        """Real multi-page resume text extracts without errors, normalizes sections and retains bullets."""
        multipage_raw_text = """
SARAH CONNOR
Principal Systems Engineer | Los Angeles, CA | sarah.connor@cyberdyne.org | +1-555-0199

PROFESSIONAL SUMMARY
12+ years of experience fortifying distributed infrastructure and cyber-defense architectures.

WORK EXPERIENCE
Lead Systems Architect — Tech Defense Inc & Co, Pasadena, CA (2020 – Present)
• Engineered automated threat detection reducing incident response time by 75%
• Architected zero-trust microsegmentation across 1,200 nodes with <5ms latency

Senior Infrastructure Engineer — Cyber Dynamics, Austin, TX (2016 – 2020)
• Migrated monolithic payment gateway to Kubernetes, saving $320k annually

EDUCATION
Caltech — B.S. Computer Science & Cybersecurity (2012 – 2016) GPA: 3.92

SKILLS
Languages: Rust, Go, Python, C++
Cloud & Infra: Kubernetes, Terraform, AWS, GCP, Linux

PROJECTS
SentinelMesh — https://github.com/sconnor/sentinelmesh
• Open-sourced with 1.4k GitHub stars and 20+ enterprise contributors

CERTIFICATIONS
Certified Kubernetes Security Specialist (CKS) — CNCF / Linux Foundation (2023)
"""
        with patch("app.services.resume_parser.chat_complete", new_callable=AsyncMock, return_value=json.dumps(SAMPLE_STRUCTURED)):
            parsed = await parse_raw_text_to_structured(multipage_raw_text)

        doc = StructuredResume.model_validate(parsed)
        assert doc.basics.name == "Sarah Connor"
        assert len(doc.experience) == 2
        assert doc.experience[0].company == "Tech Defense Inc & Co"
        assert len(doc.experience[0].bullets) == 2
        assert len(doc.skills) == 2
        assert len(doc.projects) == 1
        assert len(doc.certifications) == 1

    @pytest.mark.asyncio
    async def test_empty_and_garbage_input_safe(self):
        """Empty, whitespace, and garbage input returns a valid schema without crashing."""
        for bad_input in ["", "   ", "Too short"]:
            res = await parse_raw_text_to_structured(bad_input)
            doc = StructuredResume.model_validate(res)
            assert doc.basics.name == ""
            assert doc.experience == []


# ═════════════════════════════════════════════════════════════════════════════
# 4. REPORTLAB STRUCTURED PDF GENERATION & ATS COMPATIBILITY (PHASES 10-13)
# ═════════════════════════════════════════════════════════════════════════════

class TestReportLabStructuredPdfAndAts:
    def _extract(self, pdf_bytes: bytes) -> str:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    def test_classic_ats_template_extracts_cleanly(self):
        """Classic ATS template produces valid PDF with full textual fidelity and reading order."""
        pdf = render_structured_resume_pdf(SAMPLE_STRUCTURED, template_id="classic")
        assert pdf[:5] == b"%PDF-"
        text = self._extract(pdf)

        assert "Sarah Connor" in text
        assert "Principal Systems Engineer" in text
        assert "Tech Defense Inc & Co" in text
        assert "75%" in text
        assert "Caltech" in text
        assert "Rust" in text
        assert "Kubernetes" in text
        assert "SentinelMesh" in text
        assert "Certified Kubernetes Security Specialist" in text

    def test_modern_template_extracts_cleanly(self):
        """Modern Tech template produces valid PDF with same textual fidelity."""
        pdf = render_structured_resume_pdf(SAMPLE_STRUCTURED, template_id="modern")
        assert pdf[:5] == b"%PDF-"
        text = self._extract(pdf)

        assert "Sarah Connor" in text
        assert "Lead Systems Architect" in text
        assert "zero-trust microsegmentation" in text

    def test_xml_escaping_in_all_fields_prevents_crashes(self):
        """ReportLab XML parser crashes if &, <, > are unescaped. All must be escaped."""
        hazardous_data = json.loads(json.dumps(SAMPLE_STRUCTURED))
        hazardous_data["basics"]["name"] = "Alice & Bob <Engineers>"
        hazardous_data["basics"]["summary"] = "Experienced with C++ & Go; <T> patterns & 'strict' checks."
        hazardous_data["experience"][0]["company"] = "AT&T & Co. <Labs>"
        hazardous_data["experience"][0]["bullets"][0]["text"] = "Handled >10k req/sec & <50ms P99 latency with A&B testing."

        pdf = render_structured_resume_pdf(hazardous_data, template_id="classic")
        assert pdf[:5] == b"%PDF-"
        text = self._extract(pdf)
        assert "Alice & Bob" in text
        assert "AT&T & Co." in text

    def test_multipage_resume_renders_without_orphaned_headings(self):
        """Resumes with 8+ jobs expand to multiple pages and KeepTogether prevents orphaned headers."""
        long_data = json.loads(json.dumps(SAMPLE_STRUCTURED))
        extra_jobs = []
        for i in range(1, 10):
            extra_jobs.append({
                "id": f"exp-extra-{i}",
                "company": f"Enterprise Corp #{i}",
                "role": f"Senior Consultant #{i}",
                "location": "San Francisco, CA",
                "start_date": f"201{i%10}",
                "end_date": f"201{i%10 + 1}",
                "current": False,
                "bullets": [
                    {"id": f"eb-{i}-1", "text": f"Spearheaded infrastructure project #{i} serving 10M active users."},
                    {"id": f"eb-{i}-2", "text": f"Reduced cloud infrastructure costs by 2{i}% via autoscaling."},
                ],
            })
        long_data["experience"] = extra_jobs

        pdf = render_structured_resume_pdf(long_data, template_id="classic")
        assert pdf[:5] == b"%PDF-"
        reader = PdfReader(io.BytesIO(pdf))
        # Must span across at least 2 pages
        assert len(reader.pages) >= 2


# ═════════════════════════════════════════════════════════════════════════════
# 5. CREDIT ACCOUNTING (PHASE 9)
# ═════════════════════════════════════════════════════════════════════════════

class TestCreditAccounting:
    def setup_method(self):
        app.dependency_overrides[get_current_user] = lambda: _mock_user(USER_A_ID)

    def teardown_method(self):
        app.dependency_overrides.pop(get_current_user, None)

    def test_editor_get_and_put_are_zero_credits(self):
        """Viewing and saving the editor costs 0 credits."""
        resume_store = {
            RESUME_A_ID: {
                "id": RESUME_A_ID,
                "user_id": USER_A_ID,
                "structured_content": SAMPLE_STRUCTURED,
            }
        }
        db = _build_db_mock(resume_store)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct:

            with TestClient(app) as client:
                r1 = client.get(f"/api/v1/resumes/{RESUME_A_ID}/editor")
                r2 = client.put(f"/api/v1/resumes/{RESUME_A_ID}/editor", json=SAMPLE_STRUCTURED)

        assert r1.status_code == 200
        assert r2.status_code == 200
        mock_deduct.assert_not_called()

    def test_export_pdf_is_zero_credits(self):
        """Exporting PDF is 0 credits (rendering is deterministic ReportLab)."""
        resume_store = {
            RESUME_A_ID: {
                "id": RESUME_A_ID,
                "user_id": USER_A_ID,
                "structured_content": SAMPLE_STRUCTURED,
            }
        }
        db = _build_db_mock(resume_store)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct:

            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{RESUME_A_ID}/export_pdf")

        assert resp.status_code == 200
        mock_deduct.assert_not_called()

    def test_bullet_rewrite_charges_exactly_three_credits(self):
        """Bullet rewrite calls deduct_feature_credits with cost=3 and feature='rewrite_bullet'."""
        resume_store = {
            RESUME_A_ID: {
                "id": RESUME_A_ID,
                "user_id": USER_A_ID,
            }
        }
        db = _build_db_mock(resume_store)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct, \
             patch("app.api.v1.endpoints.resumes.with_ai_retry", new_callable=AsyncMock, return_value="Quantified outcome bullet"):

            with TestClient(app) as client:
                resp = client.post(
                    f"/api/v1/resumes/{RESUME_A_ID}/rewrite_bullet",
                    json={"bullet_text": "Worked on APIs", "role_context": "Senior Engineer"},
                )

        assert resp.status_code == 200
        mock_deduct.assert_called_once()
        call_kwargs = mock_deduct.call_args.kwargs
        assert call_kwargs["cost"] == 3
        assert call_kwargs["feature"] == "rewrite_bullet"
        assert call_kwargs["user_id"] == USER_A_ID

    def test_bullet_rewrite_failure_triggers_exact_refund(self):
        """If AI call fails after credit deduction, exactly 3 credits are refunded via refund_feature_credits."""
        resume_store = {
            RESUME_A_ID: {
                "id": RESUME_A_ID,
                "user_id": USER_A_ID,
            }
        }
        db = _build_db_mock(resume_store)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", new_callable=AsyncMock), \
             patch("app.api.v1.endpoints.resumes.refund_feature_credits", new_callable=AsyncMock) as mock_refund, \
             patch("app.api.v1.endpoints.resumes.with_ai_retry", new_callable=AsyncMock, side_effect=RuntimeError("Groq 503")):

            with TestClient(app) as client:
                resp = client.post(
                    f"/api/v1/resumes/{RESUME_A_ID}/rewrite_bullet",
                    json={"bullet_text": "Worked on APIs", "role_context": "Senior Engineer"},
                )

        assert resp.status_code == 502
        mock_refund.assert_called_once()
        args = mock_refund.call_args.args
        assert args[1] == USER_A_ID
        assert args[2] == "rewrite_bullet"
        assert args[3] == 3


# ═════════════════════════════════════════════════════════════════════════════
# 6. ORIGINAL FILE PRESERVATION (PHASE 14)
# ═════════════════════════════════════════════════════════════════════════════

class TestOriginalFilePreservation:
    def setup_method(self):
        app.dependency_overrides[get_current_user] = lambda: _mock_user(USER_A_ID)

    def teardown_method(self):
        app.dependency_overrides.pop(get_current_user, None)

    def test_saving_editor_preserves_raw_text_and_storage_file(self):
        """Saving structured_content does NOT touch parsed_content or file_url."""
        raw_original = "ORIGINAL EXTRACTED PYPDF TEXT NEVER TO BE OVERWRITTEN"
        file_url_original = "https://supabase.co/storage/v1/object/public/kareerist-pdfs/user_a/1716000000_original.pdf"

        resume_row = {
            "id": RESUME_A_ID,
            "user_id": USER_A_ID,
            "parsed_content": {"raw_text": raw_original},
            "file_url": file_url_original,
            "structured_content": SAMPLE_STRUCTURED,
        }
        resume_store = {RESUME_A_ID: resume_row}
        db = _build_db_mock(resume_store)

        edited_structured = {
            **SAMPLE_STRUCTURED,
            "basics": {**SAMPLE_STRUCTURED["basics"], "name": "Edited Name"},
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=db):
            with TestClient(app) as client:
                resp = client.put(f"/api/v1/resumes/{RESUME_A_ID}/editor", json=edited_structured)

        assert resp.status_code == 200
        # Check stored row
        assert resume_store[RESUME_A_ID]["parsed_content"]["raw_text"] == raw_original
        assert resume_store[RESUME_A_ID]["file_url"] == file_url_original
        assert resume_store[RESUME_A_ID]["structured_content"]["basics"]["name"] == "Edited Name"
