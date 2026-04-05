from groq import AsyncGroq
from app.core.config import settings
import json
import re

client = AsyncGroq(api_key=settings.GROQ_API_KEY)


def clean_llm_answer(text: str) -> str:
    """Removes markdown formatting (```json ... ```) from LLM output."""
    text = text.strip()
    # Remove opening/closing code blocks
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text)  # Remove start
        text = re.sub(r"```$", "", text)        # Remove end
    return text.strip()


async def generate_resume_roast(resume_text: str, job_description: str, calculated_ats_score: int) -> dict:
    """
    Performs a Deep-Dive Analysis (Roast + Section Breakdown).
    Returns a complex JSON structure.
    """

    prompt = f"""You are a senior career coach about different fields and industries and an expert on reviewing resumes 
    of what recruiters look for in resumes in different domains. Your task is to provide a brutal critique of the following resume
    so that the candidate can know exactly what they need to fix.

    You MUST anchor your `overall_feedback` rating to this {calculated_ats_score} using the following baseline rubric:
    - 0 to 45: Poor
    - 46 to 59: Fair
    - 60 to 74: Good
    - 75 to 89: Very Good
    - 90 to 100: Excellent

    You must follow the following principles while generating the resume analysis:
    1. Be formally brutally honest but constructive.
        - Your Feedback should reflect how a real hiring panel, senior recruiter would judge the resume.
        - Always provide feedback with proper justification and call out weaknesses directly.
    2. Use only qualitative metrics to judge the resume.
        - Avoid using quantitative metrics like "X/10" or percentages.
        - Use qualitative metrics like 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent' etc.
        - Justify the qualitative metrics with proper reasoning.
    3. Do not invent or add skills, tools, technologies, experiences not present in the resume.
        - Do not add buzzwords or trending skills for the sake of it.
        - Do not assume experience unless explicitly stated in the resume.
        - Highlight gaps or weaknesses but do not fabricate content.
    4. Contextualize Evaluation.
        - Evaluate the resume against the JD if provided, else use general industry standards.
        - Do not optimize the resume for a specific company unless stated in the JD.
    5. Ownership and impact.
        - Penalize vague and repetitive language or phrases.
        - Stronly value ownership, impact, contributions.
    6. Interview Realism Check.
        - Assume every statement in the resume will be probed properly in interviews.
        - Flag statements that seem exaggerated or unverifiable.
    7. ATS and Human friendliness.
        - Properly evaluate the ATS friendliness and human readability.
        - Critique poor structure, formatting etc.
    8. Role Aware skill expectation analysis.
        - First infer the most likely target role(s) and seniority based on resume content.
        - Use the job description if provided; otherwise infer from resume signals.
        - Market or web-based research may be used ONLY to identify common expectations for that role.
        - These expectations must be used strictly for gap analysis.
        - NEVER imply the candidate has these skills.
        - NEVER suggest blindly adding them to the resume.
        - Phrase all findings as absence of demonstrated evidence, not missing buzzwords.

    You must output a JSON object with this EXACT structure:
    {{
    "overall_feedback": "One of: Poor | Fair | Good | Very Good | Excellent",
    "summary": "2–4 sentence formal, blunt, and professional summary assessing overall readiness, credibility, and alignment with real hiring expectations.",
    "sections": {{
        "experience": {{
            "score": "One of: Poor | Fair | Good | Very Good | Excellent",
            "feedback": "Detailed critique of work experience focusing on clarity of role, ownership, impact, metrics, tech stack usage, scale, and decision-making. Be explicit about what is weak or missing.",
            "issues": "List concrete issues such as vague bullets, lack of metrics, unclear ownership, shallow impact, or poor framing."
        }},
        "projects": {{
            "score": "One of: Poor | Fair | Good | Very Good | Excellent",
            "feedback": "Critique project selection, depth, technical clarity, real-world relevance, and demonstrated problem-solving. Evaluate whether projects strengthen or weaken the resume.",
            "issues": "List specific problems such as toy projects, lack of outcomes, unclear scope, repetition, or overclaiming."
        }},
        "skills": {{
            "score": "One of: Poor | Fair | Good | Very Good | Excellent",
            "feedback": "Evaluate organization, credibility, relevance, and depth of the skills section. Flag shallow listing, poor grouping, or mismatch with experience.",
            "missing_keywords": "Only list skills or technologies expected by the JD provided, clearly framed as gaps—not assumed experience."
        }},
        "education": {{
            "score": "One of: Poor | Fair | Good | Very Good | Excellent",
            "feedback": "Give feedback on the basis of score i.e that is on the basis of 5 categories."
        }},
        "formatting": {{
            "score": "One of: Poor | Fair | Good | Very Good | Excellent",
            "feedback": "Critique structure, conciseness, consistency, punctuation, readability, visual hierarchy, repetition, and ATS compatibility."
        }}
    }},
    "action_items": [
        "List the most critical fixes the candidate should address immediately, prioritized by hiring impact."
    ]
    }}
    """

    try:
        completion = await client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Resume: {resume_text}\n\nJob Description: {job_description}"}
            ],
            temperature=0.3,
            reasoning_effort="low",
            response_format={"type": "json_object"},
            stream=False
        )
        raw_content = completion.choices[0].message.content
        cleaned_content = clean_llm_answer(raw_content)

        if not cleaned_content or not cleaned_content.strip():
            raise RuntimeError("AI returned empty response")
        return json.loads(cleaned_content)

    except json.JSONDecodeError as e:
        print("Invalid JSON from AI:", cleaned_content[:300])
        return None
    except RuntimeError as e:
        print("AI logic error:", e)
        return None
    except Exception as e:
        print(f"Error generating analysis: {e}")
        return None
