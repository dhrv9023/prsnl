# Detailed Frontend Architecture Guide

Welcome to the Kareerist Studio Frontend! This guide provides an in-depth look at where everything lives, how the app is structured, and how a new developer can navigate the codebase.

## Technology Stack
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui

---

## Complete Directory Breakdown

Everything you need to touch is inside the `FRONTEND/src/` directory.

### 1. `pages/` (The Main Views)
These are the top-level components connected directly to routes. If you need to change how an entire page works or looks, start here.
*   **`Index.tsx`**: The landing page shown to logged-out users. Contains the marketing copy and call-to-actions.
*   **`DashboardPage.tsx`**: The primary authenticated view. This page orchestrates the user's dashboard, showing recent activity, statistics, and quick links.
*   **`ResumeAnalysis.tsx`**: The core workspace for the AI Resume Analyzer tool. If you need to change the layout where users view their parsed resume and ATS scores, this is the file.
*   **`Pricing.tsx`**: The subscriptions/plans page.
*   **`NotFound.tsx`**: The 404 error page.

### 2. `components/` (Building Blocks)
Reusable UI elements are organized by their scope.
*   **`layout/`**: Structural components used across multiple pages.
    *   *Example:* `Navbar.tsx` (The top navigation bar containing links and the user profile dropdown).
*   **`sections/`**: Larger composite components that make up parts of a page (e.g., a "Testimonials" section on the landing page).
*   **`ui/`**: Base-level, atomic components. These are mostly provided by shadcn/ui (e.g., `button.tsx`, `input.tsx`, `dialog.tsx`). **Rule:** Use these instead of standard HTML elements whenever possible to maintain design consistency.

### 3. `lib/` (Utilities & API Wrapper)
*   **`api.ts`**: **Important!** This file handles all communication with the backend. It defines functions like `uploadResume()`, `getDashboardStats()`, etc. If the backend URL changes or a new endpoint is added, you must update this file.
*   **`utils.ts`**: Commonly contains small helper functions (like `cn()` for merging Tailwind classes).

### 4. `hooks/` & `contexts/` (State and Logic)
*   **`hooks/`**: Custom React hooks (`use...`). Use this for logic that is shared between different components but doesn't need global state management.
*   **`contexts/`**: React Context providers. If data needs to be accessed by deeply nested components (like the current Theme, or Authentication state), it is managed here.

### 5. Routing & Entry Point
*   **`main.tsx`**: The root of the application where React mounts to the HTML.
*   **`App.tsx`**: Defines the React Router. This maps URLs to specific components in the `pages/` folder. (e.g., `<Route path="/dashboard" element={<DashboardPage />} />`).

---

## Step-by-Step Scenarios for New Developers

**Scenario A: "I need to add a new link to the top navigation."**
1. Go to `FRONTEND/src/components/layout/Navbar.tsx`.
2. Locate the navigation links section.
3. Add a new standard link or button using the router's `<Link>` component.

**Scenario B: "I want to change the color of the 'Analyze Resume' button on the analyzer page."**
1. Since the button is on the analyzer page, go to `FRONTEND/src/pages/ResumeAnalysis.tsx`.
2. Find the specific `<Button>` component.
3. Apply standard Tailwind classes like `className="bg-blue-600 hover:bg-blue-700"` to modify it.

**Scenario C: "The backend created a new endpoint to download resumes, how do I connect it?"**
1. Go to `FRONTEND/src/lib/api.ts`.
2. Export a new async function (e.g., `export const downloadResume = async (id: string) => {...}`).
3. Import that function into whichever page needs it (like `ResumeAnalysis.tsx`) and call it when a user clicks a "Download" button.
