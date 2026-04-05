# Detailed Backend Architecture Guide

Welcome to the Kareerist Studio Backend! This guide provides a comprehensive overview of how the backend is structured, where specific features are processed, and the exact flow of data.

## Technology Stack
- **Framework:** FastAPI (Python)
- **Validation Engine:** Pydantic
- **Primary AI/Logic:** Stored in custom service modules.

---

## Request Flow
When the Frontend sends a request to the Backend, it follows this path:
**1. Route (`endpoints/`)** -> **2. Validation (`schemas/`)** -> **3. Logic (`services/`)** -> **4. Response**

---

## Complete Directory Breakdown

All business logic and endpoints live within `backend/app/`.

### 1. `api/v1/endpoints/` (The API Routers)
This directory defines every single web URL the frontend can hit. Endpoints should **not** contain heavy business logic; they should receive the request, authenticate it, pass it to a `service`, and return the response.
*   **`auth.py`**: Everything related to user identity. Endpoints for Login, Signup, and verifying JWT tokens.
*   **`dashboard.py`**: Aggregates data for the frontend user dashboard.
*   **`resumes.py`**: CRUD (Create, Read, Update, Delete) operations specifically for managing user resume files and stored metadata.
*   **`ai_analysis.py`**: The entry point for triggering AI evaluations on resumes.
*   **`cover_letter.py`**: Endpoints for the AI cover letter generation feature.
*   **`interview.py`**: Endpoints that manage mock interviews and AI feedback sessions.

### 2. `services/` (The Heavy Lifting & AI Core)
This is where the actual features work. If an algorithm is wrong, or the AI's prompt needs tweaking, look here.
*   **`resume_analyzer.py`**: The "brain" of the resume processing. It parses the document text, constructs the prompt, communicates with the OpenAI/Language Model, and formats the ATS score and feedback list.
*   **`cover_letter_gen.py`**: Contains the logic to read a job description and a user's resume to draft a matching cover letter.
*   **`ai_interview.py`**: Logic for managing contextual conversational states for mock interviews.
*   **`math_engine.py`**: Contains any custom calculation logic needed across the application backend.

### 3. `schemas/` (Pydantic Models)
*   **`models.py`**: Contains Python classes that dictate the shape of data entering and leaving the backend.
    *   *Why we need it:* If the frontend tries to send `{ "user_age": "five" }` instead of an integer, FastAPI will look at `models.py` and automatically reject it before it ever hits our logic.

### 4. `core/` & `db/` (Infrastructure)
*   **`core/config.py`**: Handles loading standard `.env` variables safely into Python objects. If you add a new API key (like for a payment gateway), you must declare it here.
*   **`db/`**: Handles database connections, ORM models (like SQLAlchemy), and migrations.

---

## Step-by-Step Scenarios for New Developers

**Scenario A: "I need to change how harsh the Resume Analyzer grades the ATS Score."**
1. This is a logic issue. Skip the endpoints and go straight to `backend/app/services/resume_analyzer.py`.
2. Look for the function generating the prompt or calculating the final score (e.g., `calculate_ats_score()`).
3. Tweak the logic or the AI prompt text, and save.

**Scenario B: "I need to add a brand new API that returns a list of popular tech skills."**
1. Create the endpoint URL. Go to `backend/app/api/v1/endpoints/` (maybe create `skills.py` or add to a relevant existing route).
2. Write a FastAPI decorator: `@router.get("/skills/popular")`.
3. If this requires complex logic or external APIs, write that logic in a new file inside `services/`.
4. Define the return format by creating a new Pydantic schema class in `backend/app/schemas/models.py`. Ensure the router utilizes `response_model=YourNewSchema`.

**Scenario C: "The frontend is trying to send a profile picture URL, but the backend is dropping it."**
1. This means the backend wasn't told to expect this data.
2. Go to `backend/app/schemas/models.py`.
3. Find the profile update schema (e.g., `UserUpdate`) and add a field: `profile_pic_url: Optional[str] = None`.
