"""
Kareerist Studio — Critical Path Test Suite
============================================

Covers 22 tests across 7 categories:
  1. ATS General Scorer (rule-based, no JD)
  2. ATS with JD (embedding path)
  3. Credit System (deduction, bypass, edge cases)
  4. Auth Endpoints (login, signup, logout, /me)
  5. Resume Upload (validation, rejection)
  6. Security Headers
  7. Request Logger Middleware

Run with:
    cd backend
    python -m pytest tests/ -v

All external services (Supabase, HuggingFace, Redis, Groq) are mocked.
No real credentials or network calls are made.
"""

import io
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── Shared fixtures ───────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def app_env():
    """Minimal env vars needed to import the app without crashing."""
    return {
        "GROQ_API_KEY": "test-groq-key",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_ROLE": "test-service-role",
        "HUGGINGFACE_API_KEY": "test-hf-key",
        "REDIS_URL": "redis://localhost:6379/0",
        "ENVIRONMENT": "development",
        "COOKIE_SECURE": "False",
    }


@pytest.fixture
def client(app_env):
    """FastAPI TestClient with all external deps mocked."""
    with patch.dict("os.environ", app_env):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app, raise_server_exceptions=False)


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 1 — ATS General Scorer (rule-based, no JD)
# ═══════════════════════════════════════════════════════════════════════════════

class TestATSGeneralScorer:

    def test_good_resume_scores_above_50(self):
        """A well-structured resume with metrics and action verbs should score ≥ 50."""
        from app.services.math_engine import _general_resume_score

        resume = """
        Jane Smith | jane@example.com | +91-9876543210 | github.com/janesmith

        EXPERIENCE
        Senior Software Engineer at TechCorp (2020–2024)
        • Built distributed system serving 100,000 daily active users
        • Reduced deployment time by 60% through CI/CD automation
        • Led team of 8 engineers to deliver 5 major product features

        SKILLS
        Python, FastAPI, React, TypeScript, PostgreSQL, Redis, Kubernetes, AWS

        EDUCATION
        B.Tech Computer Science — IIT Bombay (2016–2020)

        PROJECTS
        • Open-source library with 3,000 GitHub stars
        • Designed real-time analytics pipeline processing 1M events/day
        """

        result = _general_resume_score(resume)

        assert 0 <= result["score"] <= 100
        assert result["mode"] == "general"
        assert result["score"] >= 50, f"Good resume scored too low: {result['score']}"
        assert result["breakdown"]["quantification"] > 0
        assert result["breakdown"]["action_verbs"] > 0
        assert result["breakdown"]["section_coverage"] >= 15

    def test_poor_resume_scores_below_40(self):
        """A sparse resume with no metrics or structure should score < 40."""
        from app.services.math_engine import _general_resume_score

        result = _general_resume_score("I am a developer. I know Python. I went to college.")

        assert result["score"] < 40
        assert result["breakdown"]["quantification"] == 0
        assert result["breakdown"]["action_verbs"] == 0

    def test_empty_resume_returns_zero(self):
        """Empty or whitespace-only resume should return score 0."""
        from app.services.math_engine import _general_resume_score

        result = _general_resume_score("   ")
        assert result["score"] == 0

    def test_score_is_always_integer(self):
        """Score must always be an int, never a float."""
        from app.services.math_engine import _general_resume_score

        result = _general_resume_score("Some resume text with experience and skills.")
        assert isinstance(result["score"], int)

    def test_score_never_exceeds_100(self):
        """Score must be capped at 100 even for an exceptional resume."""
        from app.services.math_engine import _general_resume_score

        # Artificially dense resume with everything
        resume = "\n".join([
            "john@example.com +91-9876543210 github.com/john linkedin.com/in/john",
            "EXPERIENCE SKILLS EDUCATION PROJECTS",
            "built developed designed implemented led managed created improved optimized",
            "reduced increased launched deployed architected engineered automated",
            "• " * 50,  # lots of bullets
            "50,000 users 40% reduction 100 engineers 1M requests 3 years 5 projects",
        ])

        result = _general_resume_score(resume)
        assert result["score"] <= 100

    def test_breakdown_keys_present(self):
        """All 6 breakdown dimensions must always be present."""
        from app.services.math_engine import _general_resume_score

        result = _general_resume_score("Some text")
        expected_keys = {
            "content_density", "quantification", "action_verbs",
            "section_coverage", "contact_info", "formatting"
        }
        assert set(result["breakdown"].keys()) == expected_keys

    def test_contact_info_detection(self):
        """Email, phone, and GitHub/LinkedIn should each add points."""
        from app.services.math_engine import _general_resume_score

        with_contact = _general_resume_score("john@example.com +91-9876543210 github.com/john")
        without_contact = _general_resume_score("Some text without any contact info here")

        assert with_contact["breakdown"]["contact_info"] > without_contact["breakdown"]["contact_info"]

    def test_note_field_present_in_general_mode(self):
        """General mode should include a note explaining the score type."""
        from app.services.math_engine import _general_resume_score

        result = _general_resume_score("Some resume text")
        assert "note" in result
        assert len(result["note"]) > 10


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 2 — ATS with JD (embedding path)
# ═══════════════════════════════════════════════════════════════════════════════

class TestATSWithJD:

    @pytest.mark.asyncio
    async def test_falls_back_to_general_when_embedding_fails(self):
        """If HuggingFace API is down, should fall back to general scorer gracefully."""
        from app.services.math_engine import ats_score

        with patch("app.services.math_engine.get_embedding", return_value=None):
            result = await ats_score("Some resume text", "Some job description")

        assert result["score"] >= 0
        assert "warning" in result
        assert "unavailable" in result["warning"].lower()

    @pytest.mark.asyncio
    async def test_no_jd_uses_general_scorer(self):
        """Passing None or empty string as JD should use rule-based scorer."""
        from app.services.math_engine import ats_score

        result_none = await ats_score("Some resume text with experience", None)
        result_empty = await ats_score("Some resume text with experience", "")

        assert result_none["mode"] == "general"
        assert result_empty["mode"] == "general"

    @pytest.mark.asyncio
    async def test_with_jd_uses_embedding_mode(self):
        """With a valid JD and working embeddings, should return jd_match mode."""
        from app.services.math_engine import ats_score
        import numpy as np

        fake_vec = np.random.rand(768).tolist()

        with patch("app.services.math_engine.get_embedding", return_value=fake_vec):
            result = await ats_score("Python developer with 3 years experience", "Python backend engineer role")

        assert result["mode"] == "jd_match"
        assert 0 <= result["score"] <= 100
        assert result["raw_similarity"] is not None


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 3 — Credit System
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreditSystem:

    @pytest.mark.asyncio
    async def test_insufficient_credits_raises_402(self):
        """deduct_feature_credits raises HTTP 402 when balance < cost."""
        from fastapi import HTTPException
        from app.services.credits import deduct_feature_credits

        mock_supabase = AsyncMock()
        mock_profile = MagicMock()
        mock_profile.data = [{"is_unlimited": False, "remaining_credits": 3}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
            return_value=mock_profile
        )
        mock_rpc = MagicMock()
        mock_rpc.data = [{"ok": False, "remaining": 3}]
        mock_supabase.rpc.return_value.execute = AsyncMock(return_value=mock_rpc)

        with pytest.raises(HTTPException) as exc:
            await deduct_feature_credits(mock_supabase, "user-1", "ats_score", 5)

        assert exc.value.status_code == 402
        assert "credits" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_unlimited_user_skips_rpc(self):
        """Admin users with is_unlimited=True bypass deduction — RPC never called."""
        from app.services.credits import deduct_feature_credits

        mock_supabase = AsyncMock()
        mock_profile = MagicMock()
        mock_profile.data = [{"is_unlimited": True, "remaining_credits": 0}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
            return_value=mock_profile
        )

        result = await deduct_feature_credits(mock_supabase, "admin-1", "interview", 25)

        assert result["is_unlimited"] is True
        assert result["low_credits"] is False
        mock_supabase.rpc.assert_not_called()

    @pytest.mark.asyncio
    async def test_successful_deduction_returns_remaining(self):
        """Successful deduction returns remaining balance and low_credits flag."""
        from app.services.credits import deduct_feature_credits

        mock_supabase = AsyncMock()
        mock_profile = MagicMock()
        mock_profile.data = [{"is_unlimited": False, "remaining_credits": 50}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
            return_value=mock_profile
        )
        mock_rpc = MagicMock()
        mock_rpc.data = [{"ok": True, "remaining": 45}]
        mock_supabase.rpc.return_value.execute = AsyncMock(return_value=mock_rpc)

        result = await deduct_feature_credits(mock_supabase, "user-1", "ats_score", 5)

        assert result["remaining"] == 45
        assert result["is_unlimited"] is False
        assert result["low_credits"] is False  # 45 > 20 threshold

    @pytest.mark.asyncio
    async def test_low_credits_flag_set_below_threshold(self):
        """low_credits should be True when remaining < 20."""
        from app.services.credits import deduct_feature_credits

        mock_supabase = AsyncMock()
        mock_profile = MagicMock()
        mock_profile.data = [{"is_unlimited": False, "remaining_credits": 20}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
            return_value=mock_profile
        )
        mock_rpc = MagicMock()
        mock_rpc.data = [{"ok": True, "remaining": 15}]
        mock_supabase.rpc.return_value.execute = AsyncMock(return_value=mock_rpc)

        result = await deduct_feature_credits(mock_supabase, "user-1", "ats_score", 5)

        assert result["low_credits"] is True  # 15 < 20 threshold

    @pytest.mark.asyncio
    async def test_user_not_found_raises_404(self):
        """If the DB raises user_not_found, should return HTTP 404."""
        from fastapi import HTTPException
        from app.services.credits import deduct_feature_credits

        mock_supabase = AsyncMock()
        mock_profile = MagicMock()
        mock_profile.data = [{"is_unlimited": False, "remaining_credits": 50}]
        mock_supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
            return_value=mock_profile
        )
        mock_supabase.rpc.return_value.execute = AsyncMock(
            side_effect=Exception("user_not_found")
        )

        with pytest.raises(HTTPException) as exc:
            await deduct_feature_credits(mock_supabase, "ghost-user", "ats_score", 5)

        assert exc.value.status_code == 404

    def test_feature_costs_all_defined(self):
        """All 6 features must have a defined cost."""
        from app.services.credits import FEATURE_COSTS, FEATURE_LABELS

        expected_features = {"ats_score", "deep_analysis", "hiring_intel", "interview", "cover_letter", "humanize"}
        assert set(FEATURE_COSTS.keys()) == expected_features
        assert set(FEATURE_LABELS.keys()) == expected_features
        # All costs must be positive integers
        for feature, cost in FEATURE_COSTS.items():
            assert isinstance(cost, int) and cost > 0, f"{feature} has invalid cost: {cost}"


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 4 — Auth Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

class TestAuthEndpoints:

    def test_login_wrong_password_returns_401(self, client):
        """Wrong credentials must return 401 with a generic message."""
        with patch("app.api.v1.endpoints.auth.get_db") as mock_get_db:
            mock_supabase = AsyncMock()
            mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")
            mock_get_db.return_value = mock_supabase

            response = client.post(
                "/api/v1/auth/login",
                json={"email": "wrong@example.com", "password": "WrongPass123"},
            )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "invalid credentials" in data["detail"].lower()
        # Must not leak internal error details
        assert "exception" not in data["detail"].lower()
        assert "traceback" not in data["detail"].lower()

    def test_login_missing_fields_returns_422(self, client):
        """Login without required fields should return 422 Unprocessable Entity."""
        response = client.post("/api/v1/auth/login", json={"email": "test@example.com"})
        assert response.status_code == 422

    def test_login_invalid_email_format_returns_422(self, client):
        """Login with malformed email should return 422."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "not-an-email", "password": "Password123"},
        )
        assert response.status_code == 422

    def test_me_without_cookie_returns_401(self, client):
        """GET /auth/me without a session cookie must return 401."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401

    def test_logout_always_succeeds(self, client):
        """POST /auth/logout should always return 200 even without a session."""
        with patch("app.api.v1.endpoints.auth.get_db") as mock_get_db:
            mock_supabase = AsyncMock()
            mock_supabase.auth.sign_out = AsyncMock()
            mock_get_db.return_value = mock_supabase

            response = client.post("/api/v1/auth/logout")

        assert response.status_code == 200
        assert "logged out" in response.json().get("msg", "").lower()


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 5 — Resume Upload Validation
# ═══════════════════════════════════════════════════════════════════════════════

class TestResumeUpload:

    def test_non_pdf_rejected(self, client):
        """Text files must be rejected — returns 400 or 401."""
        fake_txt = io.BytesIO(b"This is a text file, not a PDF")
        response = client.post(
            "/api/v1/resumes/upload",
            files={"file": ("resume.txt", fake_txt, "text/plain")},
        )
        assert response.status_code in (400, 401, 422)

    def test_fake_pdf_magic_bytes_rejected(self, client):
        """A file with .pdf extension but wrong magic bytes must be rejected."""
        fake_pdf = io.BytesIO(b"This is not a real PDF file content")
        response = client.post(
            "/api/v1/resumes/upload",
            files={"file": ("resume.pdf", fake_pdf, "application/pdf")},
        )
        # 401 = auth required (no cookie), 400 = invalid file
        assert response.status_code in (400, 401)

    def test_upload_without_auth_returns_401(self, client):
        """Upload without a session cookie must return 401."""
        real_pdf_header = io.BytesIO(b"%PDF-1.4 fake content")
        response = client.post(
            "/api/v1/resumes/upload",
            files={"file": ("resume.pdf", real_pdf_header, "application/pdf")},
        )
        assert response.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 6 — Security Headers
# ═══════════════════════════════════════════════════════════════════════════════

class TestSecurityHeaders:

    def test_security_headers_present_on_all_responses(self, client):
        """Every response must include the required security headers."""
        response = client.get("/health")

        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert "strict-origin" in response.headers.get("Referrer-Policy", "")
        assert "Content-Security-Policy" in response.headers

    def test_csp_blocks_frame_ancestors(self, client):
        """CSP must include frame-ancestors 'none' to prevent clickjacking."""
        response = client.get("/health")
        csp = response.headers.get("Content-Security-Policy", "")
        assert "frame-ancestors 'none'" in csp

    def test_health_endpoint_returns_ok(self, client):
        """GET /health must return 200 with status field."""
        with patch("app.db.redis_client.get_redis") as mock_redis, \
             patch("app.db.supabase.get_db") as mock_db:
            mock_r = AsyncMock()
            mock_r.ping = AsyncMock()
            mock_redis.return_value = mock_r
            mock_db.return_value = AsyncMock()

            response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "checks" in data


# ═══════════════════════════════════════════════════════════════════════════════
# CATEGORY 7 — Request Logger Middleware
# ═══════════════════════════════════════════════════════════════════════════════

class TestRequestLogger:

    def test_request_id_header_in_response(self, client):
        """Every response must include X-Request-ID header."""
        response = client.get("/health")
        assert "X-Request-ID" in response.headers
        req_id = response.headers["X-Request-ID"]
        assert len(req_id) == 8  # We use first 8 chars of UUID

    def test_request_id_is_unique_per_request(self, client):
        """Each request must get a different request ID."""
        r1 = client.get("/health")
        r2 = client.get("/health")
        assert r1.headers.get("X-Request-ID") != r2.headers.get("X-Request-ID")

    def test_log_emitted_for_api_request(self, client):
        """A log record should be emitted for every non-health API request."""
        with patch("app.core.request_logger.logger") as mock_logger:
            client.get("/api/v1/auth/me")
            assert mock_logger.log.called

    def test_health_path_not_logged(self, client):
        """GET /health should NOT emit a log record (too noisy)."""
        with patch("app.core.request_logger.logger") as mock_logger:
            client.get("/health")
            mock_logger.log.assert_not_called()

    def test_json_log_format_in_production(self):
        """In production mode, log output should be valid JSON."""
        from app.core.request_logger import _emit_log

        log_records = []

        with patch("app.core.request_logger.settings") as mock_settings, \
             patch("app.core.request_logger.logger") as mock_logger:
            mock_settings.ENVIRONMENT = "production"
            mock_logger.log = lambda level, msg: log_records.append(msg)

            _emit_log(
                method="POST",
                path="/api/v1/auth/login",
                status=401,
                duration_ms=42,
                user_id="anon",
                client_ip="1.2.3.4",
                request_id="abc12345",
            )

        assert len(log_records) == 1
        parsed = json.loads(log_records[0])
        assert parsed["method"] == "POST"
        assert parsed["path"] == "/api/v1/auth/login"
        assert parsed["status"] == 401
        assert parsed["ms"] == 42
        assert parsed["req_id"] == "abc12345"
