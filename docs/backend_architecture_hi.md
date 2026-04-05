# Detailed Backend Architecture Guide (Hinglish)

Kareerist Studio Backend mein aapka swagat hai! Yeh guide sikhayegi ki FastAPI backend ka structure kaisa hai, request aane ke baad kahan takrau khaati hai, aur main features ki coding kahan by default hoti hai.

## Technology Stack
- **Framework:** FastAPI (Python)
- **Validation Engine:** Pydantic
- **Primary AI/Logic:** `services` folder ke andar.

---

## Request ka Flow
Jab Frontend se koi data ya click backend par aata hai, toh woh is raste se guzarta hai:
**1. Route (`endpoints/`)** -> **2. Validation (`schemas/`)** -> **3. Logic/AI (`services/`)** -> **4. Response Wapas Frontend Ko**

---

## Complete Directory Breakdown

Aapka saara backend code `backend/app/` folder mein hoga. Chaliye dekhte hain kaunsi file kya karti hai:

### 1. `api/v1/endpoints/` (Web URLs / Routers)
Yahan par saare API URLs (routes) likhe hote hain. In files mein zyada lamba code ya logic nahi hona chahiye. Ye bas request lete hain, services se kaam karwate hain, aur data wapas bhejte hain.
*   **`auth.py`**: Login, signup, password aur JWT tokens ka saara hisab-kitab yahan hota hai.
*   **`dashboard.py`**: Frontend dashboard ko charts ya metrics ke liye jo data chahiye, wo yahan se jata hai.
*   **`resumes.py`**: Database mein resume files ya data save karne, update karne ya delete karne ke endpoints.
*   **`ai_analysis.py`**: Jab user 'Analyze' button dabata hai, toh process yaheen se shuru hota hai.
*   **`cover_letter.py`**: AI cover letter generate karwane ke APIs.
*   **`interview.py`**: AI mock interview system ke APIs.

### 2. `services/` (Asli Dimaag & AI Core)
Yahan pe asal coding hoti hai. Agar kisi feature ka logic badalna hai, toh aap is folder mein aayenge.
*   **`resume_analyzer.py`**: Yeh system ki backbone hai. Resume read karna, apna prompt lagana, AI (jaise OpenAI) ko request bhejna, aur ATS score ko set karna — sab isi file mein hota hai.
*   **`cover_letter_gen.py`**: Job description match karke cover letter likhne ki AI instructions yahan milti hain.
*   **`ai_interview.py`**: Interview bot ke sawal-jawab handle karne ki logic yahan rakhi gayi hai.

### 3. `schemas/` (Data Validation Models)
*   **`models.py`**: In Pydantic classes ka kaam security guard wala hai. Agar API kehti hai ki use sirf 'number' chahiye, aur frontend string bhej de, toh code aage badhne se pehle hi `models.py` error de dega.

### 4. `core/` & `db/` (Settings aur Database)
*   **`core/config.py`**: `.env` file se saare secret keys aur password read karke program ko dene ka kaam iska hai.
*   **`db/`**: SQL/NoSQL Database connectivity aur uske related models yahan hote hain.

---

## Naye Developers ke liye Step-by-Step Scenarios

**Scenario A: "Mujhe lagta hai AI Resume par kaafi strict grading kar raha hai, mujhe ATS score thoda badhana hai."**
1. Yeh logic ka issue hai. Seedhe `backend/app/services/resume_analyzer.py` mein chalein.
2. Woh function dhoondein jo prompt generate karta hai ya score calculate karta hai.
3. Wahan AI ka pehamla/prompt thoda naram kardein ya apne math calculations ko adjust kardein.

**Scenario B: "Mujhe website par ek naya feature dena hai: 'Trending Skills dikhao', main API kahan banau?"**
1. Ek naya endpoint banayein. Go to `backend/app/api/v1/endpoints/` (Aap chaho toh nayi file `skills.py` bana do).
2. FastAPI decorator use karein: `@router.get("/skills/trending")`.
3. Agar data lana mushkil hai, toh alag se uski calculation `services/` mein ek function mein likhein.
4. Response shape ko define karne ke liye `backend/app/schemas/models.py` mein Pydantic model banayein aur route ke `response_model` mein attach kardein.

**Scenario C: "Frontend developers ek naya 'City' field bhej rahe hain user profiles update mein, par backend fail ho raha hai."**
1. Backend ko pata hi nahi hai ki 'City' field aane wala hai!
2. `backend/app/schemas/models.py` mein jaein.
3. User update wali Pydantic class ko dhundhe aur wahan check karein: `city: Optional[str] = None` add karke file save kardein.
