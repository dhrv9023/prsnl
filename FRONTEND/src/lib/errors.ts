/**
 * Centralized error message translator.
 *
 * The backend returns technical `detail` strings from FastAPI/Supabase.
 * This module maps them to friendly, user-facing messages.
 *
 * Usage:
 *   import { friendlyError } from "@/lib/errors";
 *   setError(friendlyError(e));
 */

// ── Known backend error patterns → friendly messages ─────────────────────────

const ERROR_MAP: Array<[RegExp | string, string]> = [
    // Auth
    ["Invalid credentials",                     "Wrong email or password. Please try again."],
    ["invalid credentials",                     "Wrong email or password. Please try again."],
    ["Invalid login credentials",               "Wrong email or password. Please try again."],
    ["Session expired or invalid",              "Your session has expired. Please sign in again."],
    ["Not authenticated",                       "You need to sign in to do that."],
    ["Invalid session",                         "Your session is invalid. Please sign in again."],
    ["Email not confirmed",                     "Please verify your email address before signing in."],
    ["User already registered",                 "An account with this email already exists. Try signing in instead."],
    ["Registration failed",                     "Couldn't create your account. The email may already be in use."],
    ["is invalid",                              "Please use a real email address (e.g. yourname@gmail.com)."],
    ["email rate limit exceeded",               "Too many attempts. Please wait a minute and try again."],
    ["OAuth verifier missing",                  "Google sign-in failed. Please try again."],
    ["Invalid or expired OAuth code",           "Google sign-in link has expired. Please try again."],
    ["No refresh token",                        "Your session has expired. Please sign in again."],
    ["Refresh token invalid or expired",        "Your session has expired. Please sign in again."],

    // Credits
    [/Insufficient credits.*costs (\d+) credits/i,  (m: RegExpMatchArray) =>
        `You don't have enough credits. This feature costs ${m[1]} credits. Top up on the Credits page.`
    ],
    ["Insufficient credits",                    "You don't have enough credits for this. Top up on the Credits page."],
    ["Credit system error",                     "Something went wrong with the credit system. Please try again."],
    ["User profile not found",                  "Your profile wasn't found. Please contact support."],

    // Resume
    ["Resume not found",                        "Resume not found. It may have been deleted."],
    ["Only PDF files are allowed",              "Only PDF files are supported. Please upload a PDF."],
    ["PDF must be 5MB or smaller",              "Your PDF is too large. Please upload a file under 5MB."],
    ["PDF must not exceed",                     "Your PDF has too many pages. Please upload a resume under 20 pages."],
    ["PDF is empty or unreadable",              "We couldn't read your PDF. Make sure it contains selectable text (not a scanned image)."],
    ["Uploaded file is not a valid PDF",        "That file doesn't look like a valid PDF. Please try a different file."],
    ["Resume has no parsed text",               "We couldn't extract text from your resume. Try re-saving it as a PDF."],
    ["Extracted resume text is too short",      "Your resume seems too short or empty. Please upload a complete resume."],

    // AI features
    ["AI failed to generate",                   "The AI couldn't generate a response. Please try again."],
    ["AI failed to humanize",                   "The AI couldn't humanize the text. Please try again."],
    ["Deep analysis failed",                    "The analysis couldn't be completed. Please try again in a moment."],
    ["Hiring intelligence analysis failed",     "The hiring analysis couldn't be completed. Please try again."],
    ["Error calculating ATS score",             "Couldn't calculate the ATS score. Please try again."],
    ["AI Service Unavailable",                  "The AI service is temporarily unavailable. Please try again in a moment."],
    ["AI embedding service unavailable",        "The scoring service is temporarily unavailable. Showing a general score instead."],

    // Interview
    ["No active interview session found",       "No active interview session found. Please start a new interview."],
    ["Session service is temporarily unavailable", "The interview service is temporarily unavailable. Please try again."],
    ["Question not found",                      "That question wasn't found. Please refresh and try again."],
    ["Failed to load interview history",        "Couldn't load your interview history. Please refresh the page."],

    // Cover letter
    ["You don't have permission to update",     "You don't have permission to update this cover letter."],
    ["Cover letter text is too short",          "The cover letter is too short to humanize. Please generate one first."],
    ["Cover letter text exceeds maximum",       "The cover letter is too long. Please shorten it before humanizing."],

    // File / storage
    ["An internal error occurred while storing", "Couldn't save the file. Please try again."],
    ["An internal error occurred while saving",  "Couldn't save the record. Please try again."],
    ["An internal error occurred during PDF",    "Couldn't generate the PDF. Please try again."],

    // Rate limiting
    ["Too Many Requests",                       "You've made too many requests. Please wait a moment and try again."],
    [/rate limit/i,                             "You've hit the rate limit. Please wait a moment and try again."],

    // Network / server
    ["HTTP 401",                                "You need to sign in to do that."],
    ["HTTP 402",                                "You don't have enough credits for this."],
    ["HTTP 403",                                "You don't have permission to do that."],
    ["HTTP 404",                                "The requested resource wasn't found."],
    ["HTTP 413",                                "The file is too large. Please try a smaller file."],
    ["HTTP 429",                                "Too many requests. Please wait a moment and try again."],
    ["HTTP 500",                                "Something went wrong on our end. Please try again."],
    ["HTTP 502",                                "The AI service is temporarily unavailable. Please try again."],
    ["HTTP 503",                                "The service is temporarily unavailable. Please try again."],
    [/HTTP \d+/,                                "Something went wrong. Please try again."],

    // Generic network
    ["Failed to fetch",                         "Couldn't connect to the server. Check your internet connection."],
    ["NetworkError",                            "Network error. Check your internet connection and try again."],
    ["Load failed",                             "Couldn't connect to the server. Check your internet connection."],
];

/**
 * Converts a raw error (from a caught exception or API response) into
 * a friendly, user-facing message.
 *
 * @param e - The caught error (Error object, string, or unknown)
 * @param fallback - Message to show if no pattern matches (default: generic)
 */
export function friendlyError(
    e: unknown,
    fallback = "Something went wrong. Please try again."
): string {
    const raw = e instanceof Error
        ? e.message
        : typeof e === "string"
            ? e
            : fallback;

    for (const [pattern, message] of ERROR_MAP) {
        if (typeof pattern === "string") {
            if (raw.toLowerCase().includes(pattern.toLowerCase())) {
                return typeof message === "function" ? message([raw]) : message;
            }
        } else {
            // RegExp
            const match = raw.match(pattern);
            if (match) {
                return typeof message === "function" ? message(match) : message;
            }
        }
    }

    // If no pattern matched, return the raw message if it looks user-safe
    // (short, no stack traces, no "Error:" prefix), otherwise use fallback
    if (raw.length < 200 && !raw.includes("at ") && !raw.startsWith("Error:")) {
        return raw;
    }

    return fallback;
}
