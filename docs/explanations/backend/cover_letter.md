# cover_letter.md

**Location:** `prsnl/backend/app/api/v1/endpoints/cover_letter.py`  
**Type:** API Endpoint

## What This File Does

Manages cover letter generation, storage, and retrieval. Offers two generation styles: a professional cover letter and a savage/funny "roast" cover letter. Includes a humanization endpoint that rewrites AI-generated text to sound more natural. Also handles PDF conversion (text → formatted A4 PDF via ReportLab) and upload to storage, plus CRUD operations for saved cover letters.

## How It Fits Into The System

- **Triggers:** Called by the frontend Cover Letter page for generation, the download button for PDF creation, and the history view for listing past letters.
- **Dependencies:** LLM service (Groq/OpenAI for text generation), credit service (deduction per feature), ReportLab library (PDF generation), Supabase Storage (PDF file hosting), `job_applications` table (stores cover letter records), `resumes` table (resume text for context), authentication middleware.
- **Dependents:** The dashboard may show recent cover letters. The resume delete cascade removes associated job_applications (which include cover letters).

## Code Breakdown

### Generate Professional (`POST /generate`)

**Cost: 10 credits**

Generates a polished, professional cover letter tailored to the user's resume and a target job description. The LLM receives the resume text and JD, then produces a formal cover letter following standard business letter conventions.

Flow:
1. Validate inputs (resume_id, job_description, optional company name).
2. Deduct 10 credits.
3. Fetch resume text.
4. Call LLM with professional cover letter prompt.
5. Return generated text.

### Generate Roast (`POST /generate-roast`)

**Cost: 10 credits**

Generates a savage, humorous cover letter that roasts the applicant, the company, or both. Same inputs as the professional version but uses a completely different prompt that encourages wit, sarcasm, and brutal honesty. This is a novelty/entertainment feature.

### Save PDF (`POST /save_pdf`)

Takes generated cover letter text and converts it to a downloadable PDF:
1. Receives the text content and metadata (job title, company).
2. Calls the `create_pdf` helper to generate a formatted PDF.
3. Uploads the PDF to Supabase Storage.
4. Saves a record in `job_applications` with the storage URL.
5. Returns the download URL.

### Humanize (`POST /humanize`)

**Cost: 15 credits**

Takes AI-generated cover letter text and rewrites it to sound more human and natural. Removes telltale AI patterns (overly formal language, generic phrases, perfect structure) while preserving the content and intent. Useful for users who want AI assistance but don't want their letter to read as obviously AI-generated.

### List Applications (`GET /`)

Returns all saved cover letters/job applications for the authenticated user, ordered by creation date. Returns metadata and storage URLs, not full text content.

### Get Single Application (`GET /{application_id}`)

Returns full details for a specific saved cover letter including the text content and PDF URL.

### `create_pdf` Helper Function

Converts plain text to a formatted A4 PDF using ReportLab:
- Sets up an A4-sized canvas.
- Applies consistent margins and font styling.
- Handles text wrapping and pagination for long letters.
- Adds basic formatting (paragraph spacing, proper line breaks).
- Returns the PDF as bytes for upload to storage.

This is a pure utility function with no database or auth dependencies.

## Things To Know Before Editing

- **ReportLab is the PDF engine.** It's a heavyweight dependency. If you need to change PDF formatting (fonts, margins, headers), you're working with ReportLab's canvas/platypus API which has a learning curve.
- **The roast endpoint uses the same credit cost as professional.** If you want to differentiate pricing, update both the deduction logic and the frontend `/costs` display.
- **Humanize is a separate credit charge on top of generation.** Users pay 10 credits to generate + 15 credits to humanize = 25 total for a humanized letter. The frontend should make this clear.
- **PDF storage paths should include user_id.** Similar to resumes, cover letter PDFs are namespaced by user in Supabase Storage. Don't break this convention.
- **The `create_pdf` helper doesn't handle rich text or HTML.** It expects plain text input. If you want to support formatting (bold, italic, bullet points), you'll need to significantly rework this function.
- **Cover letters are stored in `job_applications`, not a dedicated table.** This is a design choice — each cover letter is tied to a specific job application context. Don't create a separate `cover_letters` table without migrating existing data.
- **Credit refund on AI failure applies here too.** Both generate endpoints and humanize should refund credits if the LLM call fails.
