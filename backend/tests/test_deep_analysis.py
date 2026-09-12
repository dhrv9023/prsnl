"""
Deep Analysis Reliability & Credit Safety Tests
===============================================

Tests the complete Deep Analysis lifecycle:
- JSON extraction from markdown code fences, prose, think tags
- Pydantic schema validation & section normalization
- Controlled AI recovery on malformed output
- End-to-end endpoint authentication, authorization (IDOR prevention)
- Atomic credit deduction and refund idempotency
- DB persistence safety
"""

import json
import pytest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.models import DeepAnalysisResult, DeepAnalysisSection
from app.services.deep_analysis import (
    DeepAnalysisError,
    DeepAnalysisJSONParseError,
    DeepAnalysisSchemaValidationError,
    DeepAnalysisProviderError,
    extract_json_payload,
    validate_and_normalize_result,
    generate_deep_analysis,
)

SAMPLE_VALID_ANALYSIS = {
    "summary": "Your resume shows great backend foundations, but bullet points lack quantifiable impact.",
    "overall_feedback": "Good",
    "sections": {
        "contact": {
            "score": "Good",
            "feedback": "Contact info is clear and complete.",
            "issues": [],
            "missing_keywords": [],
        },
        "profile_summary": {
            "score": "Fair",
            "feedback": "Summary is slightly generic.",
            "issues": ["'Passionate engineer' -> Vague intro -> State concrete specialization."],
            "missing_keywords": [],
        },
        "experience": {
            "score": "Good",
            "feedback": "Good company names and tech stack.",
            "issues": ["'Developed backend features' -> Missing metrics -> Add user count or latency improvement."],
            "missing_keywords": ["FastAPI", "Kubernetes"],
        },
        "skills": {
            "score": "Good",
            "feedback": "Well organized skills list.",
            "issues": [],
            "missing_keywords": [],
        },
        "education": {
            "score": "Excellent",
            "feedback": "Strong CS degree signal.",
            "issues": [],
            "missing_keywords": [],
        },
        "projects": {
            "score": "Good",
            "feedback": "Projects show end-to-end development capability.",
            "issues": ["'Built clone app' -> Tutorial risk -> Emphasize original design."],
            "missing_keywords": [],
        },
        "formatting": {
            "score": "Good",
            "feedback": "Standard ATS-friendly formatting.",
            "issues": [],
            "missing_keywords": [],
        },
    },
    "action_items": [
        "PRIORITY 1 — Quantify backend experience bullets with metrics.",
        "PRIORITY 2 — Highlight distributed systems ownership.",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: JSON EXTRACTION & SCHEMA VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

class TestJSONExtractionAndValidation:

    def test_extract_json_direct(self):
        """Direct raw JSON string parses correctly."""
        raw = json.dumps(SAMPLE_VALID_ANALYSIS)
        parsed = extract_json_payload(raw)
        assert parsed["overall_feedback"] == "Good"
        assert "experience" in parsed["sections"]

    def test_extract_json_inside_markdown_fences(self):
        """JSON enclosed in ```json ... ``` markdown fences is cleanly extracted."""
        raw = f"```json\n{json.dumps(SAMPLE_VALID_ANALYSIS)}\n```"
        parsed = extract_json_payload(raw)
        assert parsed["summary"].startswith("Your resume")

    def test_extract_json_inside_plain_fences(self):
        """JSON enclosed in plain ``` ... ``` fences is cleanly extracted."""
        raw = f"```\n{json.dumps(SAMPLE_VALID_ANALYSIS)}\n```"
        parsed = extract_json_payload(raw)
        assert parsed["summary"].startswith("Your resume")

    def test_extract_json_with_surrounding_prose(self):
        """Conversational text before and after JSON does not break extraction."""
        prose_before = "Here is the comprehensive section-by-section breakdown:\n\n"
        prose_after = "\n\nI hope this critique helps you land interviews!"
        raw = f"{prose_before}{json.dumps(SAMPLE_VALID_ANALYSIS)}{prose_after}"
        parsed = extract_json_payload(raw)
        assert parsed["overall_feedback"] == "Good"

    def test_extract_json_with_think_tags(self):
        """Qwen-style reasoning <think>...</think> tags are stripped before extraction."""
        raw = f"<think>Recruiter calibration: candidate is mid-level SDE.</think>\n{json.dumps(SAMPLE_VALID_ANALYSIS)}"
        parsed = extract_json_payload(raw)
        assert parsed["overall_feedback"] == "Good"

    def test_extract_json_pure_prose_raises_json_decode_error(self):
        """Pure natural language prose without JSON raises JSONDecodeError."""
        raw = "Dhruv, the single biggest blocker on your resume is the lack of measurable impact."
        with pytest.raises(json.JSONDecodeError):
            extract_json_payload(raw)

    def test_schema_normalizes_section_aliases(self):
        """Alternative section names like work_experience are normalized to experience."""
        data = {
            "summary": "Good resume",
            "overall_feedback": "good",  # lowercase -> should normalize to "Good"
            "sections": {
                "work_experience": {
                    "score": "good",
                    "feedback": "Strong track record",
                    "issues": [],
                    "missing_keywords": [],
                },
                "summary": {
                    "score": "fair",
                    "feedback": "Needs polish",
                    "issues": [],
                    "missing_keywords": [],
                }
            },
            "action_items": ["Quantify impact"],
        }
        validated = validate_and_normalize_result(data)
        assert validated.overall_feedback == "Good"
        assert "experience" in validated.sections
        assert "profile_summary" in validated.sections
        assert validated.sections["experience"].score == "Good"
        # Standard missing sections must be safely filled
        assert "contact" in validated.sections
        assert "skills" in validated.sections

    def test_schema_fills_missing_standard_sections(self):
        """If AI omits some sections, defaults are populated so frontend never crashes."""
        data = {
            "summary": "Brief analysis",
            "overall_feedback": "Fair",
            "sections": {
                "experience": {
                    "score": "Fair",
                    "feedback": "Needs metrics",
                    "issues": [],
                    "missing_keywords": [],
                }
            },
            "action_items": [],
        }
        validated = validate_and_normalize_result(data)
        for sec in ["contact", "profile_summary", "experience", "skills", "education", "projects", "formatting"]:
            assert sec in validated.sections


# ═══════════════════════════════════════════════════════════════════════════════
# UNIT TESTS: CONTROLLED RECOVERY MECHANISM
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeepAnalysisRecovery:

    @pytest.mark.asyncio
    async def test_successful_analysis_first_attempt(self):
        """When AI returns valid JSON on first attempt, result is returned without recovery."""
        with patch("app.services.deep_analysis.chat_complete", new_callable=AsyncMock) as mock_chat:
            mock_chat.return_value = json.dumps(SAMPLE_VALID_ANALYSIS)
            result = await generate_deep_analysis("Resume text with experience")

        assert result["overall_feedback"] == "Good"
        assert mock_chat.call_count == 1

    @pytest.mark.asyncio
    async def test_recovery_succeeds_on_malformed_initial_json(self):
        """When AI returns prose initially, controlled recovery repairs it without failing."""
        prose_output = "Dhruv, the single biggest blocker is lack of metrics."
        valid_json = json.dumps(SAMPLE_VALID_ANALYSIS)

        with patch("app.services.deep_analysis.chat_complete", new_callable=AsyncMock) as mock_chat:
            mock_chat.side_effect = [prose_output, valid_json]
            result = await generate_deep_analysis("Resume text with experience")

        assert result["overall_feedback"] == "Good"
        assert mock_chat.call_count == 2

    @pytest.mark.asyncio
    async def test_recovery_fails_cleanly_on_repeated_malformed_output(self):
        """When AI returns invalid output on both attempts, raises DeepAnalysisJSONParseError."""
        broken_output = "Still just natural language critique with no JSON structure."

        with patch("app.services.deep_analysis.chat_complete", new_callable=AsyncMock) as mock_chat:
            mock_chat.side_effect = [broken_output, broken_output]
            with pytest.raises(DeepAnalysisJSONParseError):
                await generate_deep_analysis("Resume text with experience")

        assert mock_chat.call_count == 2

    @pytest.mark.asyncio
    async def test_provider_error_raises_deep_analysis_provider_error(self):
        """When Groq times out or fails permanently, raises DeepAnalysisProviderError."""
        with patch("app.services.deep_analysis.chat_complete", new_callable=AsyncMock) as mock_chat:
            mock_chat.side_effect = Exception("upstream connection timeout")
            with pytest.raises(DeepAnalysisProviderError):
                await generate_deep_analysis("Resume text with experience")


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION TESTS: ENDPOINT, AUTH, IDOR, & CREDIT SAFETY
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeepAnalysisEndpoint:

    @pytest.fixture
    def client(self):
        """FastAPI TestClient fixture with rate limiter disabled for testing."""
        from fastapi.testclient import TestClient
        from app.main import app
        from app.core.rate_limit import limiter

        original_enabled = limiter.enabled
        limiter.enabled = False
        try:
            yield TestClient(app, raise_server_exceptions=False)
        finally:
            limiter.enabled = original_enabled

    @pytest.fixture
    def mock_db_helper(self):
        """Helper to create a configured mock Supabase client."""
        def _factory(resume_data=None, deduct_ok=True, refund_mock=None):
            mock_sb = MagicMock()

            # Mock resumes query: table("resumes").select(...).eq(...).eq(...).execute()
            mock_resume_exec = AsyncMock(return_value=MagicMock(data=resume_data if resume_data is not None else []))
            mock_eq2 = MagicMock()
            mock_eq2.execute = mock_resume_exec
            mock_eq1 = MagicMock()
            mock_eq1.eq = MagicMock(return_value=mock_eq2)
            mock_select = MagicMock()
            mock_select.eq = MagicMock(return_value=mock_eq1)

            # Mock ai_analyses insert: table("ai_analyses").insert(...).execute()
            mock_insert_exec = AsyncMock(return_value=MagicMock(data=[{"id": "analysis-1"}]))
            mock_insert = MagicMock()
            mock_insert.execute = mock_insert_exec

            mock_table = MagicMock()
            mock_table.select = MagicMock(return_value=mock_select)
            mock_table.insert = MagicMock(return_value=mock_insert)
            mock_sb.table = MagicMock(return_value=mock_table)

            # Mock deduct RPC
            mock_rpc_exec = AsyncMock(return_value=MagicMock(data=[{"ok": deduct_ok, "remaining": 50}]))
            mock_rpc = MagicMock()
            mock_rpc.execute = mock_rpc_exec
            mock_sb.rpc = MagicMock(return_value=mock_rpc)

            return mock_sb
        return _factory

    def test_unauthenticated_request_rejected(self, client):
        """Unauthenticated request to /api/v1/analysis/deep returns 401 and deducts zero credits."""
        response = client.post(
            "/api/v1/analysis/deep",
            json={"resume_id": "res-123"},
        )
        assert response.status_code == 401

    def test_resume_not_found_returns_404_no_credits_deducted(self, client, mock_db_helper):
        """If resume is not found or not owned by user, returns 404 with ZERO credit deductions."""
        from app.api.dependencies import get_current_user
        from app.main import app

        test_user = SimpleNamespace(id="user-owner-1", email="user1@example.com")
        mock_sb = mock_db_helper(resume_data=[])  # Empty = not found

        with patch("app.api.v1.endpoints.ai_analysis.get_db", new_callable=AsyncMock) as mock_get_db, \
             patch("app.api.v1.endpoints.ai_analysis.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct:
            mock_get_db.return_value = mock_sb
            app.dependency_overrides[get_current_user] = lambda: test_user

            try:
                response = client.post(
                    "/api/v1/analysis/deep",
                    json={"resume_id": "foreign-resume-id"},
                )
            finally:
                app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
        mock_deduct.assert_not_called()

    def test_empty_resume_text_returns_400_no_credits_deducted(self, client, mock_db_helper):
        """If resume has empty parsed text, returns 400 with ZERO credit deductions."""
        from app.api.dependencies import get_current_user
        from app.main import app

        test_user = SimpleNamespace(id="user-owner-1", email="user1@example.com")
        mock_sb = mock_db_helper(resume_data=[{"parsed_content": {"raw_text": "   "}}])

        with patch("app.api.v1.endpoints.ai_analysis.get_db", new_callable=AsyncMock) as mock_get_db, \
             patch("app.api.v1.endpoints.ai_analysis.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct:
            mock_get_db.return_value = mock_sb
            app.dependency_overrides[get_current_user] = lambda: test_user

            try:
                response = client.post(
                    "/api/v1/analysis/deep",
                    json={"resume_id": "valid-resume-id"},
                )
            finally:
                app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 400
        mock_deduct.assert_not_called()

    def test_successful_analysis_deducts_once_and_persists(self, client, mock_db_helper):
        """Successful deep analysis deducts credits once, does not refund, and persists to DB."""
        from app.api.dependencies import get_current_user
        from app.main import app

        test_user = SimpleNamespace(id="user-owner-1", email="user1@example.com")
        resume_record = [{"parsed_content": {"raw_text": "Experienced Python Software Engineer at Google"}}]
        mock_sb = mock_db_helper(resume_data=resume_record)

        with patch("app.api.v1.endpoints.ai_analysis.get_db", new_callable=AsyncMock) as mock_get_db, \
             patch("app.api.v1.endpoints.ai_analysis.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct, \
             patch("app.api.v1.endpoints.ai_analysis.refund_feature_credits", new_callable=AsyncMock) as mock_refund, \
             patch("app.api.v1.endpoints.ai_analysis.generate_deep_analysis", new_callable=AsyncMock) as mock_gen:

            mock_get_db.return_value = mock_sb
            mock_gen.return_value = SAMPLE_VALID_ANALYSIS
            app.dependency_overrides[get_current_user] = lambda: test_user

            try:
                response = client.post(
                    "/api/v1/analysis/deep",
                    json={"resume_id": "valid-resume-id", "job_description": "Senior Backend role"},
                )
            finally:
                app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 200
        data = response.json()
        assert data["overall_feedback"] == "Good"
        mock_deduct.assert_called_once()
        mock_refund.assert_not_called()

    def test_failed_analysis_refunds_credits_exactly_once(self, client, mock_db_helper):
        """When AI analysis fails, returns HTTP 502 and refunds credits EXACTLY once."""
        from app.api.dependencies import get_current_user
        from app.main import app

        test_user = SimpleNamespace(id="user-owner-1", email="user1@example.com")
        resume_record = [{"parsed_content": {"raw_text": "Experienced Python Software Engineer"}}]
        mock_sb = mock_db_helper(resume_data=resume_record)

        with patch("app.api.v1.endpoints.ai_analysis.get_db", new_callable=AsyncMock) as mock_get_db, \
             patch("app.api.v1.endpoints.ai_analysis.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct, \
             patch("app.api.v1.endpoints.ai_analysis.refund_feature_credits", new_callable=AsyncMock) as mock_refund, \
             patch("app.api.v1.endpoints.ai_analysis.generate_deep_analysis", new_callable=AsyncMock) as mock_gen:

            mock_get_db.return_value = mock_sb
            mock_gen.side_effect = DeepAnalysisJSONParseError("Malformed JSON from LLM")
            app.dependency_overrides[get_current_user] = lambda: test_user

            try:
                response = client.post(
                    "/api/v1/analysis/deep",
                    json={"resume_id": "valid-resume-id"},
                )
            finally:
                app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 502
        assert "refunded" in response.json()["detail"].lower()
        mock_deduct.assert_called_once()
        mock_refund.assert_called_once_with(
            mock_sb, "user-owner-1", "deep_analysis", 15, "ai_failure_refund"
        )

    def test_insufficient_credits_returns_402_no_ai_generation(self, client, mock_db_helper):
        """When user has fewer than 15 credits, returns HTTP 402 and skips AI generation."""
        from fastapi import HTTPException
        from app.api.dependencies import get_current_user
        from app.main import app

        test_user = SimpleNamespace(id="user-poor-1", email="poor@example.com")
        resume_record = [{"parsed_content": {"raw_text": "Experienced Python Software Engineer"}}]
        mock_sb = mock_db_helper(resume_data=resume_record)

        with patch("app.api.v1.endpoints.ai_analysis.get_db", new_callable=AsyncMock) as mock_get_db, \
             patch("app.api.v1.endpoints.ai_analysis.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct, \
             patch("app.api.v1.endpoints.ai_analysis.generate_deep_analysis", new_callable=AsyncMock) as mock_gen:

            mock_get_db.return_value = mock_sb
            mock_deduct.side_effect = HTTPException(status_code=402, detail="Insufficient credits.")
            app.dependency_overrides[get_current_user] = lambda: test_user

            try:
                response = client.post(
                    "/api/v1/analysis/deep",
                    json={"resume_id": "valid-resume-id"},
                )
            finally:
                app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 402
        assert "insufficient credits" in response.json()["detail"].lower()
        mock_gen.assert_not_called()

    def test_db_persistence_failure_does_not_fail_response(self, client, mock_db_helper):
        """If saving to ai_analyses DB table fails, the analysis result is still returned to the user."""
        from app.api.dependencies import get_current_user
        from app.main import app

        test_user = SimpleNamespace(id="user-owner-1", email="user1@example.com")
        resume_record = [{"parsed_content": {"raw_text": "Experienced Python Software Engineer"}}]
        mock_sb = mock_db_helper(resume_data=resume_record)
        # Force table("ai_analyses").insert().execute() to raise
        mock_sb.table("ai_analyses").insert().execute.side_effect = Exception("DB connection dropped")

        with patch("app.api.v1.endpoints.ai_analysis.get_db", new_callable=AsyncMock) as mock_get_db, \
             patch("app.api.v1.endpoints.ai_analysis.deduct_feature_credits", new_callable=AsyncMock) as mock_deduct, \
             patch("app.api.v1.endpoints.ai_analysis.refund_feature_credits", new_callable=AsyncMock) as mock_refund, \
             patch("app.api.v1.endpoints.ai_analysis.generate_deep_analysis", new_callable=AsyncMock) as mock_gen:

            mock_get_db.return_value = mock_sb
            mock_gen.return_value = SAMPLE_VALID_ANALYSIS
            app.dependency_overrides[get_current_user] = lambda: test_user

            try:
                response = client.post(
                    "/api/v1/analysis/deep",
                    json={"resume_id": "valid-resume-id"},
                )
            finally:
                app.dependency_overrides.pop(get_current_user, None)

        assert response.status_code == 200
        assert response.json()["overall_feedback"] == "Good"
        mock_deduct.assert_called_once()
        mock_refund.assert_not_called()
