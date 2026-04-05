# Detailed Frontend Architecture Guide (Hinglish)

Kareerist Studio Frontend mein aapka swagat hai! Yeh guide ek naye developer ko samjhayegi ki project ka structure kaisa hai, kaunsi file kya karti hai, aur code changes kahan karne hain.

## Technology Stack
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui

---

## Complete Directory Breakdown

Aapka saara kaam `FRONTEND/src/` folder ke andar hoga. Yahan details di gayi hain:

### 1. `pages/` (Main Panno ke liye)
Yeh files directly app ke URLs se judi hoti hain (Routes). Agar koi poora page badalna hai, toh yahan shuruwat karein.
*   **`Index.tsx`**: Landing page, jo bina login kiye users ko dikhta hai. Isme marketing content aur hero section hota hai.
*   **`DashboardPage.tsx`**: Login ke baad ka main view. User ke stats, recent activity aur main app navigation yahi se hota hai.
*   **`ResumeAnalysis.tsx`**: AI Resume Analyzer tool ka page. Agar aapko resume evaluation UI ya score meter vagerah change karna hai, toh yehi file open karni hai.
*   **`Pricing.tsx`**: Subscription plans dikhane wala page.
*   **`NotFound.tsx`**: 404 Error page jab koi galat link open kare.

### 2. `components/` (Reusable UI Elements)
Jo cheezein website pe baar-baar use hoti hain, wo in folders mein milti hain.
*   **`layout/`**: Woh components jo pages ko frame karte hain.
    *   *Example:* `Navbar.tsx` (Upar ka top bar jisme links aur user profile hota hai).
*   **`sections/`**: Bade UI blocks, jaise landing page ka 'Reviews' ya 'Features' section.
*   **`ui/`**: Basic UI elements jo shadcn/ui se generate hote hain (jaise Buttons, Inputs, Cards). **Rule:** Normal HTML `<button>` ki jagah humesha yahan ke `ui/button.tsx` ko use karna hai taki design consistent rahe.

### 3. `lib/` (Utilities & Backend Calls)
*   **`api.ts`**: **Sabse Zaroori!** Frontend se backend ko jitni bhi API requests (GET, POST) jati hain, uska code yahan likha hai. Agar backend ka URL change ho, ya nayi API call karni ho, toh isi file mein function banayein.
*   **`utils.ts`**: Chhote-mote helper functions, jaise Tailwind classes ko merge karne ka `cn()` function.

### 4. `hooks/` & `contexts/` (State Management)
*   **`hooks/`**: Custom React hooks (jaise `useXYZ`). Agar koi logic multiple components mein use karna ho par global state na ho, toh hook banate hain.
*   **`contexts/`**: Poore app mein data share karne ke liye (jaise Dark Theme mode ya User Login status).

### 5. Routing & App Start point
*   **`main.tsx`**: Application ka root, jahan React shuru hota hai.
*   **`App.tsx`**: React Router ki settings. Kaunse URL par kaunsa page khulega, yahan define hota hai. (Jaise: `<Route path="/dashboard" element={<DashboardPage />} />`).

---

## Naye Developers ke liye Step-by-Step Scenarios

**Scenario A: "Mujhe top navigation bar mein ek naya link add karna hai."**
1. `FRONTEND/src/components/layout/Navbar.tsx` open karein.
2. Jahan baaki links hain wahan jaayein.
3. React Router ka naya `<Link>` ya navigation item add karein.

**Scenario B: "Resume Analyzer page par ek peele (yellow) button ko hara (green) karna hai."**
1. Page specific file mein jaayein: `FRONTEND/src/pages/ResumeAnalysis.tsx`.
2. Zaroorat wala `<Button>` dhoondein.
3. Uski Tailwind properties update karein: `className="bg-green-600 hover:bg-green-700"`.

**Scenario C: "Backend team ne ek nayi API banayi hai user profile update karne ki, main usko kaise connect karu?"**
1. `FRONTEND/src/lib/api.ts` open karein.
2. Ek function likhein pehle wale code ke jaisa naya (Jaise: `export const updateUser = async (data: any) => {...}`).
3. Jis page par update hona hai (e.g., Settings page), wahan is function ko import karke button click hone par call karwa dein.
