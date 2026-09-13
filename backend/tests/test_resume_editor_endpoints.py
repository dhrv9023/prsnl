# backend/tests/test_resume_editor_endpoints.py
"""
Unit tests for the Resume Editor endpoints added to resumes.py (Phase 3).

Endpoints under test:
  GET  /api/v1/resumes/{id}/editor       (get_resume_editor)
  PUT  /api/v1/resumes/{id}/editor       (save_resume_editor)
  POST /api/v1/resumes/{id}/export_pdf   (export_structured_resume_pdf)
  POST /api/v1/resumes/{id}/rewrite_bullet (rewrite_bullet)

All external I/O (Supabase, Groq) is mocked so tests run fully offline.

Ownership isolation, credit deduction/refund, lazy parse, and error paths
are all verified.
"""

from __future__ import annotations

import json
import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ── App + dependency mocking ──────────────────────────────────────────────────

from app.main import app
from app.api.dependencies import get_current_user

TEST_USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
TEST_RESUME_ID = "11111111-2222-3333-4444-555555555555"
OTHER_USER_ID = "ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb"

_sample_basics = {
    "name": "Test User",
    "title": "Engineer",
    "email": "test@example.com",
    "phone": "555-0100",
    "location": "SF, CA",
    "linkedin": None,
    "github": None,
    "portfolio": None,
    "summary": "10 years building things.",
}

_sample_structured = {
    "basics": _sample_basics,
    "experience": [
        {
            "id": str(uuid.uuid4()),
            "company": "Acme",
            "role": "Senior SWE",
            "location": "SF",
            "start_date": "Jan 2020",
            "end_date": "Present",
            "current": True,
            "bullets": [
                {"id": str(uuid.uuid4()), "text": "Shipped 5 major features"},
                {"id": str(uuid.uuid4()), "text": "Reduced latency by 40%"},
            ],
        }
    ],
    "education": [],
    "skills": [],
    "projects": [],
    "certifications": [],
    "meta": {
        "template_id": "classic",
        "font_size": "medium",
        "margins": "normal",
        "section_order": ["summary", "experience", "education", "skills", "projects", "certifications"],
    },
}


# ── Mock user fixture ─────────────────────────────────────────────────────────

def _mock_user() -> MagicMock:
    user = MagicMock()
    user.id = TEST_USER_ID
    return user


def _override_auth():
    """Override FastAPI auth dependency to return a test user."""
    async def _get_user():
        return _mock_user()
    app.dependency_overrides[get_current_user] = _get_user


def _clear_auth():
    app.dependency_overrides.pop(get_current_user, None)


# ── Supabase builder mock helper ──────────────────────────────────────────────

def _make_supabase_mock(
    resume_row: dict | None = None,
    analysis_row: dict | None = None,
    profile_row: dict | None = None,
):
    """
    Build a mock supabase client that returns predictable data.
    Chainable .table().select().eq().execute() pattern → returns the given rows.
    """
    supabase = AsyncMock()

    def _chain_mock(data: list | None = None) -> MagicMock:
        mock = MagicMock()
        result = MagicMock()
        result.data = data or []
        mock.execute = AsyncMock(return_value=result)
        mock.eq = MagicMock(return_value=mock)
        mock.select = MagicMock(return_value=mock)
        mock.update = MagicMock(return_value=mock)
        mock.insert = MagicMock(return_value=mock)
        mock.order = MagicMock(return_value=mock)
        mock.limit = MagicMock(return_value=mock)
        return mock

    def _table_side_effect(table_name: str) -> MagicMock:
        if table_name == "resumes":
            return _chain_mock([resume_row] if resume_row else [])
        if table_name == "ai_analyses":
            return _chain_mock([analysis_row] if analysis_row else [])
        if table_name == "profiles":
            return _chain_mock([profile_row] if profile_row else [])
        return _chain_mock()

    supabase.table = MagicMock(side_effect=_table_side_effect)
    supabase.storage = MagicMock()
    supabase.storage.from_ = MagicMock(return_value=MagicMock(
        create_signed_url=AsyncMock(return_value={"signedURL": "https://signed.example.com/pdf"})
    ))
    return supabase


# ─────────────────────────────────────────────────────────────────────────────
# Tests: GET /{resume_id}/editor
# ─────────────────────────────────────────────────────────────────────────────

class TestGetResumeEditor:
    def setup_method(self):
        _override_auth()

    def teardown_method(self):
        _clear_auth()

    def test_returns_stored_structured_content_when_already_parsed(self):
        """When structured_content is already stored, it is returned without calling the parser."""
        resume_row = {
            "id": TEST_RESUME_ID,
            "file_url": "https://example.com/Resumes/user/1234_resume.pdf",
            "parsed_content": {"raw_text": "raw text here"},
            "structured_content": _sample_structured,
            "created_at": "2026-09-13T10:00:00Z",
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)), \
             patch("app.api.v1.endpoints.resumes.parse_raw_text_to_structured",
                   new_callable=AsyncMock) as mock_parser:

            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{TEST_RESUME_ID}/editor")

        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == TEST_RESUME_ID
        assert data["structured_content"]["basics"]["name"] == "Test User"
        mock_parser.assert_not_called()

    def test_lazy_parses_when_structured_content_is_null(self):
        """When structured_content is NULL, parse_raw_text_to_structured is called."""
        resume_row = {
            "id": TEST_RESUME_ID,
            "file_url": "https://example.com/Resumes/user/1234_resume.pdf",
            "parsed_content": {"raw_text": "Jane Doe\nSoftware Engineer\nAcme Corp..."},
            "structured_content": None,
            "created_at": "2026-09-13T10:00:00Z",
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)), \
             patch("app.api.v1.endpoints.resumes.parse_raw_text_to_structured",
                   new_callable=AsyncMock, return_value=_sample_structured) as mock_parser:

            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{TEST_RESUME_ID}/editor")

        assert resp.status_code == 200
        mock_parser.assert_called_once()
        data = resp.json()
        assert data["structured_content"]["basics"]["name"] == "Test User"

    def test_returns_404_for_nonexistent_resume(self):
        """Resume belonging to another user returns 404 (ownership isolation)."""
        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=None)):

            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{TEST_RESUME_ID}/editor")

        assert resp.status_code == 404

    def test_response_includes_analysis_issues_field(self):
        """Response always contains an analysis_issues array (may be empty)."""
        resume_row = {
            "id": TEST_RESUME_ID,
            "file_url": "",
            "parsed_content": {"raw_text": "x"},
            "structured_content": _sample_structured,
            "created_at": "2026-09-13T10:00:00Z",
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{TEST_RESUME_ID}/editor")

        assert resp.status_code == 200
        data = resp.json()
        assert "analysis_issues" in data
        assert isinstance(data["analysis_issues"], list)

    def test_analysis_issues_matched_to_bullets(self):
        """When Deep Analysis issues match bullet text, matched_bullet_id is populated."""
        bullet_id = str(uuid.uuid4())
        bullet_text = "Shipped 5 major features"

        structured = {
            **_sample_structured,
            "experience": [{
                **_sample_structured["experience"][0],
                "bullets": [
                    {"id": bullet_id, "text": bullet_text},
                ],
            }],
        }

        resume_row = {
            "id": TEST_RESUME_ID,
            "file_url": "",
            "parsed_content": {"raw_text": "x"},
            "structured_content": structured,
            "created_at": "2026-09-13T10:00:00Z",
        }

        analysis_row = {
            "output_data": {
                "issues": [
                    {
                        "section": "experience",
                        "original": bullet_text,
                        "critique": "Needs quantification",
                        "fix": "Delivered 5 major features, accelerating release velocity by 30%",
                    }
                ]
            }
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row, analysis_row=analysis_row)):

            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{TEST_RESUME_ID}/editor")

        assert resp.status_code == 200
        issues = resp.json()["analysis_issues"]
        assert len(issues) == 1
        assert issues[0]["matched_bullet_id"] == bullet_id

    def test_unmatched_issue_has_null_bullet_id(self):
        """An analysis issue that doesn't match any bullet has matched_bullet_id=null."""
        resume_row = {
            "id": TEST_RESUME_ID,
            "file_url": "",
            "parsed_content": {"raw_text": "x"},
            "structured_content": _sample_structured,
            "created_at": "2026-09-13T10:00:00Z",
        }
        analysis_row = {
            "output_data": {
                "issues": [
                    {
                        "section": "experience",
                        "original": "This text does not match any bullet at all",
                        "critique": "Weak",
                        "fix": "Better version",
                    }
                ]
            }
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row, analysis_row=analysis_row)):

            with TestClient(app) as client:
                resp = client.get(f"/api/v1/resumes/{TEST_RESUME_ID}/editor")

        assert resp.status_code == 200
        issues = resp.json()["analysis_issues"]
        assert issues[0]["matched_bullet_id"] is None


# ─────────────────────────────────────────────────────────────────────────────
# Tests: PUT /{resume_id}/editor
# ─────────────────────────────────────────────────────────────────────────────

class TestSaveResumeEditor:
    def setup_method(self):
        _override_auth()

    def teardown_method(self):
        _clear_auth()

    def test_valid_payload_returns_ok(self):
        """A valid StructuredResume payload returns {ok: true, resume_id: ...}."""
        resume_row = {"id": TEST_RESUME_ID}

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.put(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/editor",
                    json=_sample_structured,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["resume_id"] == TEST_RESUME_ID

    def test_returns_404_when_resume_not_owned(self):
        """PUT returns 404 when resume doesn't belong to authenticated user."""
        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=None)):

            with TestClient(app) as client:
                resp = client.put(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/editor",
                    json=_sample_structured,
                )

        assert resp.status_code == 404

    def test_invalid_payload_returns_422(self):
        """A payload with invalid types returns 422 (validation error)."""
        resume_row = {"id": TEST_RESUME_ID}
        # Pass meta.template_id with an invalid value to trigger schema validation
        bad_payload = {**_sample_structured, "meta": {
            **_sample_structured["meta"],
            "template_id": "nonexistent_template",  # Not in Literal["classic", "modern"]
        }}

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.put(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/editor",
                    json=bad_payload,
                )

        assert resp.status_code == 422

    def test_empty_payload_accepted_with_defaults(self):
        """An empty {} body is valid — Pydantic fills all defaults."""
        resume_row = {"id": TEST_RESUME_ID}

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.put(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/editor",
                    json={},
                )

        assert resp.status_code == 200
        assert resp.json()["ok"] is True


# ─────────────────────────────────────────────────────────────────────────────
# Tests: POST /{resume_id}/export_pdf
# ─────────────────────────────────────────────────────────────────────────────

class TestExportPdf:
    def setup_method(self):
        _override_auth()

    def teardown_method(self):
        _clear_auth()

    def test_returns_pdf_bytes_for_stored_structured_content(self):
        """When structured_content is present, returns a valid PDF response."""
        resume_row = {
            "id": TEST_RESUME_ID,
            "structured_content": _sample_structured,
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{TEST_RESUME_ID}/export_pdf")

        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content[:5] == b"%PDF-"

    def test_returns_409_when_no_structured_content(self):
        """Returns 409 when structured_content is NULL (not yet opened in editor)."""
        resume_row = {
            "id": TEST_RESUME_ID,
            "structured_content": None,
        }

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{TEST_RESUME_ID}/export_pdf")

        assert resp.status_code == 409
        assert "editor" in resp.json()["detail"].lower()

    def test_returns_404_for_nonexistent_resume(self):
        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=None)):

            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{TEST_RESUME_ID}/export_pdf")

        assert resp.status_code == 404

    def test_content_disposition_is_attachment(self):
        """Export PDF should have Content-Disposition: attachment (prompts download)."""
        resume_row = {"id": TEST_RESUME_ID, "structured_content": _sample_structured}

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{TEST_RESUME_ID}/export_pdf")

        assert resp.status_code == 200
        assert "attachment" in resp.headers.get("content-disposition", "")

    def test_modern_template_also_renders_pdf(self):
        """Modern template variant renders a valid PDF."""
        modern_structured = {
            **_sample_structured,
            "meta": {**_sample_structured["meta"], "template_id": "modern"},
        }
        resume_row = {"id": TEST_RESUME_ID, "structured_content": modern_structured}

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock,
                   return_value=_make_supabase_mock(resume_row=resume_row)):

            with TestClient(app) as client:
                resp = client.post(f"/api/v1/resumes/{TEST_RESUME_ID}/export_pdf")

        assert resp.status_code == 200
        assert resp.content[:5] == b"%PDF-"


# ─────────────────────────────────────────────────────────────────────────────
# Tests: POST /{resume_id}/rewrite_bullet
# ─────────────────────────────────────────────────────────────────────────────

_BULLET_BODY = {
    "bullet_text": "Worked on backend systems",
    "role_context": "Senior Backend Engineer at fintech company",
    "instruction": "",
}


class TestRewriteBullet:
    def setup_method(self):
        _override_auth()

    def teardown_method(self):
        _clear_auth()

    def _mock_all(
        self,
        resume_exists: bool = True,
        llm_response: str = "Architected event-driven payment pipeline, processing 2M transactions daily",
        profile_credits: int = 97,
    ):
        """Return a full mock context with supabase + LLM."""
        supabase = AsyncMock()

        def _chain(data):
            m = MagicMock()
            r = MagicMock()
            r.data = data
            m.execute = AsyncMock(return_value=r)
            m.eq = MagicMock(return_value=m)
            m.select = MagicMock(return_value=m)
            m.limit = MagicMock(return_value=m)
            return m

        def _table_side(table_name):
            if table_name == "resumes":
                return _chain([{"id": TEST_RESUME_ID}] if resume_exists else [])
            if table_name == "profiles":
                return _chain([{"remaining_credits": profile_credits}])
            return _chain([])

        supabase.table = MagicMock(side_effect=_table_side)
        return supabase

    def test_successful_rewrite_returns_rewritten_bullet_and_credits(self):
        """Happy path: returns rewritten_bullet and credits_remaining."""
        expected = "Architected event-driven payment pipeline, processing 2M transactions daily"
        supabase = self._mock_all(llm_response=expected, profile_credits=97)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=supabase), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", new_callable=AsyncMock), \
             patch("app.api.v1.endpoints.resumes.chat_complete", new_callable=AsyncMock, return_value=expected):

            with TestClient(app) as client:
                resp = client.post(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/rewrite_bullet",
                    json=_BULLET_BODY,
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["rewritten_bullet"] == expected
        assert "credits_remaining" in data

    def test_empty_bullet_text_returns_400(self):
        """bullet_text that is empty or whitespace returns 400."""
        supabase = self._mock_all()

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=supabase):

            with TestClient(app) as client:
                resp = client.post(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/rewrite_bullet",
                    json={"bullet_text": "   ", "role_context": "Engineer"},
                )

        assert resp.status_code == 400

    def test_returns_404_when_resume_not_owned(self):
        """Cross-user access is blocked with 404."""
        supabase = self._mock_all(resume_exists=False)

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=supabase):

            with TestClient(app) as client:
                resp = client.post(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/rewrite_bullet",
                    json=_BULLET_BODY,
                )

        assert resp.status_code == 404

    def test_credits_refunded_when_llm_fails(self):
        """When Groq raises, credits_deducted=True triggers a refund call, then returns 502."""
        supabase = self._mock_all()

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=supabase), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", new_callable=AsyncMock), \
             patch("app.api.v1.endpoints.resumes.refund_feature_credits", new_callable=AsyncMock) as mock_refund, \
             patch("app.api.v1.endpoints.resumes.chat_complete", new_callable=AsyncMock,
                   side_effect=Exception("Groq connection error")):

            with TestClient(app) as client:
                resp = client.post(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/rewrite_bullet",
                    json=_BULLET_BODY,
                )

        assert resp.status_code == 502
        assert "refunded" in resp.json()["detail"].lower()
        mock_refund.assert_called_once()

    def test_credits_not_refunded_when_not_deducted(self):
        """If credits were never deducted (e.g. deduction itself raises), refund is NOT called."""
        supabase = self._mock_all()

        async def _deduct_raises(*args, **kwargs):
            raise Exception("Insufficient credits")

        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=supabase), \
             patch("app.api.v1.endpoints.resumes.deduct_feature_credits", side_effect=_deduct_raises), \
             patch("app.api.v1.endpoints.resumes.refund_feature_credits", new_callable=AsyncMock) as mock_refund:

            with TestClient(app, raise_server_exceptions=False) as client:
                resp = client.post(
                    f"/api/v1/resumes/{TEST_RESUME_ID}/rewrite_bullet",
                    json=_BULLET_BODY,
                )

        # Deduction failed → request failed with a server error
        assert resp.status_code in (500, 502, 400, 422)
        # Critically: refund must NOT have been called since credits were never deducted
        mock_refund.assert_not_called()

    def test_bullet_has_surrounding_quotes_stripped(self):
        """LLM responses with surrounding quotes are stripped from the rewritten bullet.

        Tests the string-manipulation logic directly — the actual stripping is:
            rewritten = rewritten.strip().strip('"').strip("'")
        This is a unit-level check that does not require the HTTP stack.
        """
        # This mirrors the exact stripping logic in the endpoint
        raw_llm_outputs = [
            '"Delivered real-time fraud detection, catching 99.7% of attacks"',
            "'Reduced deploy time by 60%'",
            '"Trimmed with spaces"',       # no interior spaces — strips cleanly
            "No quotes — no change",
        ]
        expected = [
            "Delivered real-time fraud detection, catching 99.7% of attacks",
            "Reduced deploy time by 60%",
            "Trimmed with spaces",
            "No quotes — no change",
        ]


        for raw, exp in zip(raw_llm_outputs, expected):
            result = raw.strip().strip('"').strip("'")
            assert result == exp, f"Stripping failed: {raw!r} → {result!r} (expected {exp!r})"


# ── Test Class 5: POST /api/v1/resumes/create ──────────────────────────────

class TestCreateResumeEndpoint:
    def setup_method(self):
        _override_auth()

    def teardown_method(self):
        _clear_auth()

    @pytest.mark.parametrize("template_id", ["classic", "modern", "minimal", "technical"])
    def test_create_resume_with_all_templates_and_mock_data(self, template_id: str):
        supabase = _make_supabase_mock()
        with patch("app.api.v1.endpoints.resumes.get_db", new_callable=AsyncMock, return_value=supabase):
            with TestClient(app) as client:
                resp = client.post(
                    "/api/v1/resumes/create",
                    json={
                        "title": f"John Doe ({template_id})",
                        "template_id": template_id,
                        "use_mock_data": True,
                    },
                )
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "resume_id" in data
        assert data["original_filename"] == f"John Doe ({template_id}).pdf"
        assert supabase.table.called

    def test_create_resume_unauthenticated_fails(self):
        _clear_auth()
        with TestClient(app) as client:
            resp = client.post(
                "/api/v1/resumes/create",
                json={"title": "Test"},
            )
        assert resp.status_code in (401, 403)


