# resumes.md

**Location:** `prsnl/backend/app/api/v1/endpoints/resumes.py`  
**Type:** API Endpoint

## What This File Does

Handles the full lifecycle of resume management: uploading PDF files, listing a user's resumes, fetching individual resume details, and deleting resumes. Upload performs extensive validation (file type, size, page count, text content), stores the physical file in Supabase Storage, extracts text content using a PDF parser, and saves the extracted text to the database for use by AI analysis features.

## How It Fits Into The System

- **Triggers:** Called by the frontend resume upload component, resume list page, and delete actions.
- **Dependencies:** Supabase Storage (file hosting), Supabase database (`resumes` table), PDF text extraction library (PyPDF2 or similar), authentication middleware (all endpoints require auth).
- **Dependents:** The `ai_analysis` endpoints read resume text from the database. The `ats_score` endpoint uses stored resume text. The `cover_letter` endpoints reference resume data. The `interview` endpoint uses resume content for question generation. Deleting a resume cascades to all dependent records.

## Code Breakdown

### Upload Endpoint (`POST /upload`)

The most complex endpoint in this file. Performs validation in this order:

1. **MIME type check** — Only `application/pdf` is accepted.
2. **File size check** — Maximum 5MB. Rejects before fully reading the file if Content-Length exceeds limit.
3. **Page count check** — Maximum 20 pages. Prevents abuse with massive documents.
4. **Text extraction** — Parses the PDF and extracts all text content.
5. **Minimum content check** — Extracted text must be at least 50 characters. Catches scanned-image PDFs or empty documents that would be useless for AI analysis.
6. **Per-user limit check** — Maximum 20 resumes per user. Prevents storage abuse.

On passing all checks, the file is uploaded to Supabase Storage with a unique path (typically `{user_id}/{uuid}.pdf`), and a database record is created containing the storage URL, original filename, extracted text, page count, and metadata.

### List Endpoint (`GET /`)

Returns all resumes for the authenticated user, ordered by upload date (newest first). Returns metadata only — not the full extracted text (that would be too large for a list response).

### Get Single Resume (`GET /{resume_id}`)

Returns full details for a specific resume including the extracted text content. Validates that the resume belongs to the authenticated user (ownership check).

### Delete Endpoint (`DELETE /{resume_id}`)

Performs a cascading delete:
1. Deletes all `job_applications` referencing this resume.
2. Deletes all `ai_analyses` records for this resume.
3. Deletes the physical file from Supabase Storage.
4. Deletes the database record from the `resumes` table.

The order matters — foreign key constraints require dependent records to be removed first.

### Ownership Validation

A shared helper that verifies the requested resume belongs to the current user. Used by get and delete endpoints to prevent unauthorized access to other users' resumes.

## Things To Know Before Editing

- **The 50-character minimum catches image-only PDFs.** If you lower this threshold, AI analysis endpoints will receive garbage input and waste credits on useless results.
- **Delete order is critical.** The cascade must delete dependents before the resume record itself. If you reorder or skip steps, you'll hit foreign key constraint errors or orphan storage files.
- **Storage paths include user_id.** This provides namespace isolation in Supabase Storage. Don't change the path structure without migrating existing files.
- **Extracted text is stored in the database, not re-parsed on demand.** This means if you change the extraction logic, existing resumes won't be affected. Consider a migration strategy if extraction quality improves.
- **The 20-resume limit is a soft business rule.** It's enforced at the application layer, not the database layer. If you need to change it, it's just a constant — but consider the storage cost implications.
- **File size is checked before full upload processing.** This is intentional for performance — don't move the size check after text extraction or you'll waste CPU on oversized files.
